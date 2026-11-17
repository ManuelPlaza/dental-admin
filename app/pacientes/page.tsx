"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn, FilterTabs } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { api, Patient, Appointment, Service, ConsentStatus } from "@/lib/api";
import { fullName, formatDateShort, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Users, Edit2, X, Save, ShieldCheck, ShieldOff, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

interface Toast { msg: string; type: "success" | "error"; }

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border
        ${toast.type === "success" ? "bg-green-500/20 border-green-500/30 text-green-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
        {toast.type === "success" ? "✅" : "❌"} {toast.msg}
      </div>
    </Portal>
  );
}

const ROField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-ink/60 text-xs mb-1">{label}</p>
    <div className="bg-white/[0.03] border border-ink/[0.08] rounded-xl px-3 py-2.5 opacity-60">
      <p className="text-ink/75 text-sm">{value || "—"}</p>
    </div>
  </div>
);

// Campos ausentes/undefined se tratan como "no fallecido"
const isDeceased = (p: Patient) => p.is_deceased === true;

const DeceasedBadge = () => (
  <span className="badge badge-cancelled gap-1 shrink-0" title="Marcado como fallecido por verificación de identidad"
    aria-label="Paciente marcado como fallecido por verificación de identidad">
    <AlertTriangle size={11} aria-hidden="true" /> Fallecido
  </span>
);

const EditField = ({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <div>
    <p className="text-ink/70 text-xs mb-1">{label}</p>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} className="form-input text-sm" />
  </div>
);

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [identityFilter, setIdentityFilter] = useState<"all" | "deceased">("all");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editForm, setEditForm] = useState({
    phone: "", email: "",
    emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  });
  const [originalForm, setOriginalForm] = useState({ ...editForm });
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  useEffect(() => {
    Promise.all([
      api.getPatients().catch(() => []),
      api.getAppointments().catch(() => []),
      api.getServices().catch(() => []),   // ← Es para visualizar el nombre del servicio en el historial del paciente, no eliminar aunque no se use directamente aquí
    ]).then(([p, a, s]) => { setPatients(p); setAppointments(a); setServices(s); setLoading(false); });
  }, []);

  const deceasedCount = patients.filter(isDeceased).length;
  const filtered = patients.filter((p) => {
    if (identityFilter === "deceased" && !isDeceased(p)) return false;
    const q = search.toLowerCase();
    return !q || fullName(p).toLowerCase().includes(q) ||
      p.document_number?.includes(q) || p.email?.toLowerCase().includes(q);
  });

  const patientAppts = (id: number) => appointments.filter((a) => a.patient_id === id);
  const getServiceName = (a: Appointment) => {
    if (a.service?.name) return a.service.name;
    const s = services.find((sv) => sv.id === a.service_id);
    return s ? s.name : `Servicio #${a.service_id}`;
  };
  const openModal = (p: Patient) => {
    setSelected(p);
    setEditMode(false);
    setConsentStatus(null);
    setConfirmRevoke(false);
    const form = {
      phone: p.phone || "",
      email: p.email || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_relationship: p.emergency_contact_relationship || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
    };
    setEditForm(form);
    setOriginalForm(form);
    // Cargar estado de consentimiento al abrir
    setConsentLoading(true);
    api.getConsentStatus(p.id)
      .then(setConsentStatus)
      .catch(() => setConsentStatus(null))
      .finally(() => setConsentLoading(false));
  };

  const handleRevokeConsent = async () => {
    if (!selected) return;
    setRevoking(true);
    try {
      await api.revokeConsent(selected.id);
      setConsentStatus((prev) => prev ? { ...prev, has_consent: false, consent_date: undefined } : null);
      setConfirmRevoke(false);
      showToast("Consentimiento revocado correctamente", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al revocar el consentimiento";
      showToast(msg, "error");
      setConfirmRevoke(false);
    } finally {
      setRevoking(false);
    }
  };

  const consentBadge = (cs: ConsentStatus) => {
    if (cs.is_anonymized) return { icon: <ShieldOff size={13} />, label: "Datos anonimizados", cls: "bg-ink/[0.06] text-ink/60 border-ink/[0.12]" };
    if (!cs.has_consent)  return { icon: <ShieldAlert size={13} />, label: "Sin consentimiento", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" };
    const days = cs.days_until_expiry ?? 999;
    if (days < 0)   return { icon: <ShieldOff size={13} />, label: "Período vencido", cls: "bg-red-500/15 text-red-400 border-red-500/20" };
    if (days < 90)  return { icon: <Clock size={13} />, label: `Vence en ${days}d`, cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" };
    return { icon: <ShieldCheck size={13} />, label: "Consentimiento activo", cls: "bg-green-500/15 text-green-400 border-green-500/20" };
  };

  const handleCancel = () => {
    setEditMode(false);
    if (selected) setEditForm({
      phone: selected.phone || "",
      email: selected.email || "",
      emergency_contact_name: selected.emergency_contact_name || "",
      emergency_contact_relationship: selected.emergency_contact_relationship || "",
      emergency_contact_phone: selected.emergency_contact_phone || "",
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/patients/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: editForm.phone,
          email: editForm.email,
          emergency_contact_name: editForm.emergency_contact_name,
          emergency_contact_relationship: editForm.emergency_contact_relationship,
          emergency_contact_phone: editForm.emergency_contact_phone,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = { ...selected, ...editForm };
      setPatients((prev) => prev.map((p) => p.id === selected.id ? updated : p));
      setSelected(updated);
      setEditMode(false);
      showToast("Paciente actualizado correctamente", "success");
    } catch {
      showToast("Error al actualizar el paciente", "error");
    } finally {
      setSaving(false);
    }
  };
  const hasChanges = JSON.stringify(editForm) !== JSON.stringify(originalForm);
  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader title="Pacientes" subtitle="Gestión de pacientes registrados" />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, documento o email..." />
        {deceasedCount > 0 && (
          <FilterTabs
            options={[
              { label: "Todos", value: "all" },
              { label: `Fallecidos (${deceasedCount})`, value: "deceased" },
            ]}
            value={identityFilter}
            onChange={(v) => setIdentityFilter(v === "deceased" ? "deceased" : "all")}
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Nombre", "Documento", "Teléfono", "Email", "Registro", "Citas", "Acciones"]} empty={filtered.length === 0}>
          {filtered.map((p) => (
            <TR key={p.id} onClick={() => openModal(p)}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
                    {p.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-ink">{fullName(p)}</span>
                  {isDeceased(p) && <DeceasedBadge />}
                </div>
              </TD>
              <TD className="text-ink/70">{p.document_number}</TD>
              <TD className="text-ink/70">{p.phone}</TD>
              <TD className="text-ink/70">{p.email || "—"}</TD>
              <TD className="text-ink/70">{formatDateShort(p.created_at)}</TD>
              <TD><span className="badge badge-scheduled">{patientAppts(p.id).length} citas</span></TD>
              <TD>
                <button onClick={(e) => { e.stopPropagation(); openModal(p); }}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">
                  Ver detalle
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<Users size={40} />} message="No se encontraron pacientes" />
      )}

      {/* ── MODAL via Portal ── */}
      {selected && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-ink/50"
              onClick={() => { if (!editMode) { setSelected(null); } }}
            />

            {/* Panel */}
            <div
              className="relative z-10 bg-surface border border-ink/[0.12] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              {/* Header fijo */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center text-cyan-400 font-bold text-lg shrink-0">
                    {selected.first_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-ink font-bold">{fullName(selected)}</h2>
                      {isDeceased(selected) && <DeceasedBadge />}
                    </div>
                    <p className="text-ink/60 text-xs">CC: {selected.document_number} · Reg: {formatDateShort(selected.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!editMode ? (
                    <Btn variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                      <Edit2 size={13} /> Editar
                    </Btn>
                  ) : (
                    <Btn variant="ghost" size="sm" onClick={handleCancel}>
                      <X size={13} /> Cancelar
                    </Btn>
                  )}
                  <button
                    onClick={() => { setSelected(null); setEditMode(false); }}
                    className="w-7 h-7 rounded-lg bg-ink/[0.04] hover:bg-ink/[0.06] text-ink/60 hover:text-ink flex items-center justify-center text-xl leading-none transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Cuerpo scrolleable */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* Datos personales — siempre solo lectura */}
                <div>
                  <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">Datos personales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ROField label="Nombre completo" value={fullName(selected)} />
                    <ROField label="Cédula (CC)" value={selected.document_number} />
                  </div>
                </div>

                {/* Estado de identidad — solo si la verificación marcó fallecido */}
                {isDeceased(selected) && (
                  <div>
                    <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">Estado de identidad</p>
                    <div className="glass-card rounded-xl p-4 space-y-1">
                      <p className="text-ink/75 text-sm">
                        {selected.identity_note || "Marcado como fallecido por la verificación automática de identidad"}
                      </p>
                      {selected.identity_checked_at && (
                        <p className="text-ink/60 text-xs">Verificado el {formatDateShort(selected.identity_checked_at)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Contacto */}
                <div>
                  <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">Información de contacto</p>
                  <div className="grid grid-cols-2 gap-3">
                    {editMode ? (
                      <>
                        <EditField label="Teléfono" value={editForm.phone}
                          onChange={(v) => setEditForm({ ...editForm, phone: v })}
                          type="tel" placeholder="3001234567" />
                        <EditField label="Email" value={editForm.email}
                          onChange={(v) => setEditForm({ ...editForm, email: v })}
                          type="email" placeholder="correo@ejemplo.com" />
                      </>
                    ) : (
                      <>
                        <ROField label="Teléfono" value={selected.phone} />
                        <ROField label="Email" value={selected.email || ""} />
                      </>
                    )}
                  </div>
                </div>

                {/* Contacto de emergencia */}
                <div>
                  <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">Contacto de emergencia</p>
                  <div className="grid grid-cols-3 gap-3">
                    {editMode ? (
                      <>
                        <EditField label="Nombre" value={editForm.emergency_contact_name}
                          onChange={(v) => setEditForm({ ...editForm, emergency_contact_name: v })}
                          placeholder="Nombre completo" />
                        <EditField label="Relación" value={editForm.emergency_contact_relationship}
                          onChange={(v) => setEditForm({ ...editForm, emergency_contact_relationship: v })}
                          placeholder="Pareja, Hijo..." />
                        <EditField label="Teléfono" value={editForm.emergency_contact_phone}
                          onChange={(v) => setEditForm({ ...editForm, emergency_contact_phone: v })}
                          type="tel" placeholder="3009876543" />
                      </>
                    ) : (
                      <>
                        <ROField label="Nombre" value={selected.emergency_contact_name || ""} />
                        <ROField label="Relación" value={selected.emergency_contact_relationship || ""} />
                        <ROField label="Teléfono" value={selected.emergency_contact_phone || ""} />
                      </>
                    )}
                  </div>
                </div>

                {/* Guardar — solo en modo edición */}
                {editMode && (
                  <div className="flex gap-3 pt-1 border-t border-ink/10">
                    <Btn variant="secondary" onClick={handleCancel}>Cancelar</Btn>
                    <Btn variant="primary" onClick={handleSave} disabled={saving || !hasChanges}>  {/* ← cambia esta línea */}
                      <Save size={13} />
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </Btn>
                  </div>
                )}

                {/* Consentimiento Ley 1581 — solo en modo lectura */}
                {!editMode && (
                  <div>
                    <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">Tratamiento de datos · Ley 1581</p>
                    {consentLoading ? (
                      <div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
                    ) : consentStatus ? (
                      <div className="glass-card rounded-xl p-4 space-y-3">
                        {/* Badge de estado */}
                        {(() => { const b = consentBadge(consentStatus); return (
                          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${b.cls}`}>
                            {b.icon} {b.label}
                          </div>
                        ); })()}

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {consentStatus.consent_date && (
                            <div>
                              <p className="text-ink/60 mb-0.5">Fecha aceptación</p>
                              <p className="text-ink/75">{new Date(consentStatus.consent_date).toLocaleDateString("es-CO")}</p>
                            </div>
                          )}
                          {consentStatus.last_contact_date && (
                            <div>
                              <p className="text-ink/60 mb-0.5">Último contacto</p>
                              <p className="text-ink/75">{new Date(consentStatus.last_contact_date).toLocaleDateString("es-CO")}</p>
                            </div>
                          )}
                          {consentStatus.expires_at && (
                            <div>
                              <p className="text-ink/60 mb-0.5">Datos se eliminan el</p>
                              <p className={`font-medium ${(consentStatus.days_until_expiry ?? 999) < 90 ? "text-orange-400" : "text-ink/75"}`}>
                                {new Date(consentStatus.expires_at).toLocaleDateString("es-CO")}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Botón revocar — solo si tiene consentimiento activo y no está anonimizado */}
                        {consentStatus.has_consent && !consentStatus.is_anonymized && (
                          !confirmRevoke ? (
                            <button onClick={() => setConfirmRevoke(true)}
                              className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors">
                              Revocar consentimiento
                            </button>
                          ) : (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-2">
                              <p className="text-red-300 text-xs font-medium">¿Confirmar revocación?</p>
                              <p className="text-ink/60 text-xs">El paciente deberá aceptar nuevamente al próxima vez que agende una cita.</p>
                              <div className="flex gap-2">
                                <button onClick={() => setConfirmRevoke(false)}
                                  className="text-xs text-ink/60 hover:text-ink/75 px-3 py-1.5 rounded-lg bg-ink/[0.04] transition-colors">
                                  Cancelar
                                </button>
                                <button onClick={handleRevokeConsent} disabled={revoking}
                                  className="text-xs text-red-300 hover:text-red-200 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50">
                                  {revoking ? "Revocando..." : "Sí, revocar"}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-ink/60 text-sm py-3 text-center">No se pudo cargar el estado de consentimiento</p>
                    )}
                  </div>
                )}

                {/* Historial — solo en modo lectura */}
                {!editMode && (
                  <div>
                    <p className="text-ink/60 text-[11px] font-semibold uppercase tracking-widest mb-3">
                      Historial de citas ({patientAppts(selected.id).length})
                    </p>
                    {patientAppts(selected.id).length === 0 ? (
                      <p className="text-ink/60 text-sm py-4 text-center">Sin citas registradas</p>
                    ) : (
                      <div className="space-y-2">
                        {patientAppts(selected.id).map((a) => (
                          <div key={a.id} className="flex items-center justify-between glass-card rounded-xl px-4 py-3">
                            <div>
                              <p className="text-ink text-sm">{getServiceName(a)}</p>
                              <p className="text-ink/60 text-xs">{formatDateShort(a.start_time)}</p>
                            </div>
                            <span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AdminLayout>
  );
}
