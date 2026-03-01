"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { api, Specialist } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { UserCog, Plus, Save } from "lucide-react";
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

const emptyForm = { first_name: "", last_name: "", specialty: "", license_number: "", phone: "" };

const reqLabel = (label: string) => (
  <p className="text-white/50 text-xs mb-1">{label} <span className="text-red-400">*</span></p>
);

export default function EspecialistasPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  useEffect(() => {
    api.getSpecialists().catch(() => []).then(setSpecialists).finally(() => setLoading(false));
  }, []);

  const filtered = specialists.filter((s) => {
    const q = search.toLowerCase();
    return !q || fullName(s).toLowerCase().includes(q) ||
      s.specialty?.toLowerCase().includes(q) ||
      s.license_number?.toLowerCase().includes(q);
  });

  // ── Inactivar ──
  const handleInactivate = async (s: Specialist) => {
    setActionLoading(s.id);
    try {
      const res = await authFetch(`${BASE}/specialists/${s.id}/inactivate`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setSpecialists((prev) => prev.map((sp) => sp.id === s.id ? { ...sp, is_active: false } : sp));
      showToast(`${fullName(s)} fue inactivado`, "success");
    } catch {
      showToast("Error al inactivar el especialista", "error");
    } finally { setActionLoading(null); }
  };

  // ── Activar ──
  const handleActivate = async (s: Specialist) => {
    setActionLoading(s.id);
   try {
    const res = await authFetch(`${BASE}/specialists/${s.id}/activate`, { method: "PATCH" });  // ← PATCH /specialists/9/activate
    if (!res.ok) throw new Error();
      setSpecialists((prev) => prev.map((sp) => sp.id === s.id ? { ...sp, is_active: true } : sp));
      showToast(`${fullName(s)} fue activado`, "success");
    } catch {
      showToast("Error al activar el especialista", "error");
    } finally { setActionLoading(null); }
  };

  // ── Crear especialista ──
  const handleCreate = async () => {
    const { first_name, last_name, specialty, license_number } = form;
    if (!first_name || !last_name || !specialty || !license_number) {
      showToast("Completa todos los campos obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/specialists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_active: true }),
      });

      if (res.status === 400) { showToast("El número de licencia es requerido", "error"); return; }
      if (res.status === 409) { showToast("Ya existe un especialista con ese número de licencia", "error"); return; }
      if (res.status === 500) { showToast("Error interno del servidor", "error"); return; }
      if (!res.ok) throw new Error();

      const created: Specialist = await res.json();
      setSpecialists((prev) => [created, ...prev]);
      setShowModal(false);
      setForm(emptyForm);
      showToast("Especialista creado correctamente", "success");
    } catch {
      showToast("Error al crear el especialista", "error");
    } finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Especialistas"
        subtitle="Gestión de personal médico"
        action={
          <Btn variant="primary" onClick={() => { setShowModal(true); setForm(emptyForm); }}>
            <Plus size={15} /> Nuevo Especialista
          </Btn>
        }
      />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, especialidad o licencia..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table
          headers={["Nombre", "Especialidad", "Licencia", "Teléfono", "Estado", "Acciones"]}
          empty={filtered.length === 0}
        >
          {filtered.map((s) => (
            <TR key={s.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${s.is_active
                      ? "bg-gradient-to-br from-purple-500/30 to-pink-600/30 text-purple-400"
                      : "bg-white/5 text-white/30"
                    }`}>
                    {s.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span className={`font-medium ${s.is_active ? "text-white" : "text-white/40"}`}>
                    {fullName(s)}
                  </span>
                </div>
              </TD>
              <TD className={s.is_active ? "text-white/60" : "text-white/30"}>{s.specialty}</TD>
              <TD className={`font-mono text-xs ${s.is_active ? "text-white/60" : "text-white/30"}`}>{s.license_number}</TD>
              <TD className={s.is_active ? "text-white/60" : "text-white/30"}>{s.phone || "—"}</TD>
              <TD>
                <span className={`badge ${s.is_active ? "badge-completed" : "badge-cancelled"}`}>
                  {s.is_active ? "Activo" : "Inactivo"}
                </span>
              </TD>
              <TD>
                {s.is_active ? (
                  <Btn
                    variant="danger"
                    size="sm"
                    disabled={actionLoading === s.id}
                    onClick={() => handleInactivate(s)}
                  >
                    {actionLoading === s.id ? "..." : "Inactivar"}
                  </Btn>
                ) : (
                  <Btn
                    variant="secondary"
                    size="sm"
                    disabled={actionLoading === s.id}
                    onClick={() => handleActivate(s)}
                  >
                    {actionLoading === s.id ? "..." : "Activar"}
                  </Btn>
                )}
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<UserCog size={40} />} message="No se encontraron especialistas" />
      )}

      {/* ── MODAL NUEVO ESPECIALISTA ── */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Plus size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Nuevo Especialista</h2>
                    <p className="text-white/40 text-xs">Completa los datos del especialista</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {reqLabel("Nombre")}
                    <input type="text" value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Carolina" className="form-input text-sm" />
                  </div>
                  <div>
                    {reqLabel("Apellido")}
                    <input type="text" value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="López" className="form-input text-sm" />
                  </div>
                </div>

                <div>
                  {reqLabel("Especialidad")}
                  <input type="text" value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    placeholder="Ej: Ortodoncia, Endodoncia..." className="form-input text-sm" />
                </div>

                <div>
                  {reqLabel("Número de Licencia")}
                  <input type="text" value={form.license_number}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                    placeholder="Ej: COL-12345" className="form-input text-sm font-mono" />
                </div>

                <div>
                  <p className="text-white/50 text-xs mb-1">Teléfono <span className="text-white/30">(opcional)</span></p>
                  <input type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="3001234567" className="form-input text-sm" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/8">
                <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleCreate} disabled={saving}>
                  <Save size={14} />
                  {saving ? "Creando..." : "Crear Especialista"}
                </Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AdminLayout>
  );
}