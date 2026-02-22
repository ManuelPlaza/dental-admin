"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, Modal, EmptyState, Skeleton, Btn } from "@/components/ui";
import { api, Patient, Appointment } from "@/lib/api";
import { fullName, formatDateShort, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Users, Edit2, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

interface Toast { msg: string; type: "success" | "error"; }

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium
      ${toast.type === "success"
        ? "bg-green-500/20 border border-green-500/30 text-green-300"
        : "bg-red-500/20 border border-red-500/30 text-red-300"
      }`}>
      <span>{toast.type === "success" ? "✅" : "❌"}</span>
      {toast.msg}
    </div>
  );
}

const initialEdit = {
  phone: "",
  email: "",
  emergency_contact_name: "",
  emergency_contact_relationship: "",
  emergency_contact_phone: "",
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(initialEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  useEffect(() => {
    Promise.all([
      api.getPatients().catch(() => []),
      api.getAppointments().catch(() => []),
    ]).then(([p, a]) => {
      setPatients(p);
      setAppointments(a);
      setLoading(false);
    });
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return !q ||
      fullName(p).toLowerCase().includes(q) ||
      p.document_number?.includes(q) ||
      p.email?.toLowerCase().includes(q);
  });

  const patientAppointments = (id: number) => appointments.filter((a) => a.patient_id === id);

  const openModal = (p: Patient) => {
    setSelected(p);
    setEditMode(false);
    setEditForm({
      phone: p.phone || "",
      email: p.email || "",
      emergency_contact_name: p.emergency_contact_name || "",
      emergency_contact_relationship: (p as any).emergency_contact_relationship || "",
      emergency_contact_phone: (p as any).emergency_contact_phone || "",
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    if (selected) {
      setEditForm({
        phone: selected.phone || "",
        email: selected.email || "",
        emergency_contact_name: selected.emergency_contact_name || "",
        emergency_contact_relationship: (selected as any).emergency_contact_relationship || "",
        emergency_contact_phone: (selected as any).emergency_contact_phone || "",
      });
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/patients/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();

      // Update local state
      const updatedPatient = { ...selected, ...editForm };
      setPatients((prev) => prev.map((p) => p.id === selected.id ? updatedPatient : p));
      setSelected(updatedPatient);
      setEditMode(false);
      showToast("Paciente actualizado correctamente", "success");
    } catch {
      showToast("Error al actualizar el paciente", "error");
    } finally {
      setSaving(false);
    }
  };

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
          {filtered.map((p) => {
            const citasCount = patientAppointments(p.id).length;
            return (
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
                <TD><span className="badge badge-scheduled">{citasCount} citas</span></TD>
                <TD>
                  <button onClick={(e) => { e.stopPropagation(); openModal(p); }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">
                    Ver detalle
                  </button>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<Users size={40} />} message="No se encontraron pacientes" />
      )}

      {/* ── DETAIL / EDIT MODAL ── */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setEditMode(false); }}
        title="Detalle del Paciente"
        wide
      >
        {selected && (
          <div className="space-y-5">

            {/* Header paciente */}
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center text-cyan-400 text-xl font-bold">
                  {selected.first_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{fullName(selected)}</h3>
                  <p className="text-white/50 text-sm">CC: {selected.document_number}</p>
                  <p className="text-white/40 text-xs">Registrado: {formatDateShort(selected.created_at)}</p>
                </div>
              </div>

              {/* Botón editar / cancelar */}
              {!editMode ? (
                <Btn variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                  <Edit2 size={13} /> Editar
                </Btn>
              ) : (
                <Btn variant="ghost" size="sm" onClick={handleCancel}>
                  <X size={13} /> Cancelar edición
                </Btn>
              )}
            </div>

            {/* Campos solo lectura */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Nombre completo", fullName(selected)],
                ["Cédula (CC)", selected.document_number],
              ].map(([label, value]) => (
                <div key={label} className="glass-card rounded-xl p-3 opacity-60">
                  <p className="text-white/40 text-xs mb-0.5">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            {/* Campos editables */}
            <div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Información de contacto</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Teléfono</label>
                  {editMode ? (
                    <input type="tel" value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="form-input text-sm" placeholder="3001234567" />
                  ) : (
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-white text-sm">{selected.phone || "—"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Email</label>
                  {editMode ? (
                    <input type="email" value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="form-input text-sm" placeholder="correo@ejemplo.com" />
                  ) : (
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-white text-sm">{selected.email || "—"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contacto de emergencia */}
            <div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Contacto de emergencia</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Nombre</label>
                  {editMode ? (
                    <input type="text" value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      className="form-input text-sm" placeholder="Nombre completo" />
                  ) : (
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-white text-sm">{selected.emergency_contact_name || "—"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Relación</label>
                  {editMode ? (
                    <input type="text" value={editForm.emergency_contact_relationship}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_relationship: e.target.value })}
                      className="form-input text-sm" placeholder="Ej: Pareja, Hijo..." />
                  ) : (
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-white text-sm">{(selected as any).emergency_contact_relationship || "—"}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">Teléfono</label>
                  {editMode ? (
                    <input type="tel" value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      className="form-input text-sm" placeholder="3009876543" />
                  ) : (
                    <div className="glass-card rounded-xl p-3">
                      <p className="text-white text-sm">{(selected as any).emergency_contact_phone || "—"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Guardar */}
            {editMode && (
              <div className="flex gap-3 pt-2 border-t border-white/8">
                <Btn variant="secondary" onClick={handleCancel}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Btn>
              </div>
            )}

            {/* Historial de citas */}
            {!editMode && (
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  Historial de citas ({patientAppointments(selected.id).length})
                </h4>
                {patientAppointments(selected.id).length === 0 ? (
                  <p className="text-white/30 text-sm">Sin citas registradas</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientAppointments(selected.id).map((a) => (
                      <div key={a.id} className="flex items-center justify-between glass-card rounded-xl p-3">
                        <div>
                          <p className="text-white text-sm">{a.service?.name || `Servicio #${a.service_id}`}</p>
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
        )}
      </Modal>
    </AdminLayout>
  );
}