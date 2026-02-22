"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { api, Patient, Appointment, Service } from "@/lib/api";
import { fullName, formatDateShort, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Users, Edit2, X, Save } from "lucide-react";


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
    <p className="text-white/40 text-xs mb-1">{label}</p>
    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 opacity-60">
      <p className="text-white/70 text-sm">{value || "—"}</p>
    </div>
  </div>
);

const EditField = ({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) => (
  <div>
    <p className="text-white/60 text-xs mb-1">{label}</p>
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
  const [selected, setSelected] = useState<Patient | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editForm, setEditForm] = useState({
    phone: "", email: "",
    emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  });
  const [originalForm, setOriginalForm] = useState({ ...editForm });

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  useEffect(() => {
    Promise.all([
      api.getPatients().catch(() => []),
      api.getAppointments().catch(() => []),
      api.getServices().catch(() => []),   // ← Es para visualizar el nombre del servicio en el historial del paciente, no eliminar aunque no se use directamente aquí
    ]).then(([p, a, s]) => { setPatients(p); setAppointments(a); setServices(s); setLoading(false); });
  }, []);

  const filtered = patients.filter((p) => {
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
    const form = {
      phone: p.phone || "",
      email: p.email || "",
      emergency_contact_name: (p as any).emergency_contact_name || "",
      emergency_contact_relationship: (p as any).emergency_contact_relationship || "",
      emergency_contact_phone: (p as any).emergency_contact_phone || "",
    };
    setEditForm(form);
    setOriginalForm(form); // ← agrega esta línea
  };

  const handleCancel = () => {
    setEditMode(false);
    if (selected) setEditForm({
      phone: selected.phone || "",
      email: selected.email || "",
      emergency_contact_name: (selected as any).emergency_contact_name || "",
      emergency_contact_relationship: (selected as any).emergency_contact_relationship || "",
      emergency_contact_phone: (selected as any).emergency_contact_phone || "",
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/patients/${selected.id}`, {
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

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, documento o email..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Nombre", "Documento", "Teléfono", "Email", "Registro", "Citas", "Acciones"]} empty={filtered.length === 0}>
          {filtered.map((p) => (
            <TR key={p.id} onClick={() => openModal(p)}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center text-cyan-400 text-xs font-bold shrink-0">
                    {p.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-white">{fullName(p)}</span>
                </div>
              </TD>
              <TD className="text-white/60">{p.document_number}</TD>
              <TD className="text-white/60">{p.phone}</TD>
              <TD className="text-white/60">{p.email || "—"}</TD>
              <TD className="text-white/60">{formatDateShort(p.created_at)}</TD>
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
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => { if (!editMode) { setSelected(null); } }}
            />

            {/* Panel */}
            <div
              className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
              style={{ maxHeight: "88vh" }}
            >
              {/* Header fijo */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-cyan-400 font-bold text-lg shrink-0">
                    {selected.first_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-white font-bold">{fullName(selected)}</h2>
                    <p className="text-white/40 text-xs">CC: {selected.document_number} · Reg: {formatDateShort(selected.created_at)}</p>
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
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Cuerpo scrolleable */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                {/* Datos personales — siempre solo lectura */}
                <div>
                  <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">Datos personales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ROField label="Nombre completo" value={fullName(selected)} />
                    <ROField label="Cédula (CC)" value={selected.document_number} />
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">Información de contacto</p>
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
                  <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">Contacto de emergencia</p>
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
                        <ROField label="Nombre" value={(selected as any).emergency_contact_name || ""} />
                        <ROField label="Relación" value={(selected as any).emergency_contact_relationship || ""} />
                        <ROField label="Teléfono" value={(selected as any).emergency_contact_phone || ""} />
                      </>
                    )}
                  </div>
                </div>

                {/* Guardar — solo en modo edición */}
                {editMode && (
                  <div className="flex gap-3 pt-1 border-t border-white/8">
                    <Btn variant="secondary" onClick={handleCancel}>Cancelar</Btn>
                    <Btn variant="primary" onClick={handleSave} disabled={saving || !hasChanges}>  {/* ← cambia esta línea */}
                      <Save size={13} />
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </Btn>
                  </div>
                )}

                {/* Historial — solo en modo lectura */}
                {!editMode && (
                  <div>
                    <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">
                      Historial de citas ({patientAppts(selected.id).length})
                    </p>
                    {patientAppts(selected.id).length === 0 ? (
                      <p className="text-white/30 text-sm py-4 text-center">Sin citas registradas</p>
                    ) : (
                      <div className="space-y-2">
                        {patientAppts(selected.id).map((a) => (
                          <div key={a.id} className="flex items-center justify-between glass-card rounded-xl px-4 py-3">
                            <div>
                              <p className="text-white text-sm">{getServiceName(a)}</p>
                              <p className="text-white/40 text-xs">{formatDateShort(a.start_time)}</p>
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
