"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { formatCOP } from "@/lib/utils";
import { authFetch } from "@/lib/auth";
import { Briefcase, Plus, Save, X, Edit2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE    = `${API_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Service {
  id: number;
  category_id?: number;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

interface Toast { msg: string; type: "success" | "error"; }

const emptyForm = { name: "", description: "", price: "", duration_minutes: "60", category_id: "" };

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border
        ${toast.type === "success" ? "bg-green-500/20 border-green-500/30 text-green-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
        {toast.type === "success" ? "✅" : "❌"} {toast.msg}
      </div>
    </Portal>
  );
}

// ── Modal Crear / Editar ──────────────────────────────────────────────────────

interface ServiceModalProps {
  mode: "create" | "edit";
  initial?: Service;
  onClose: () => void;
  onSaved: (s: Service, mode: "create" | "edit") => void;
  showToast: (msg: string, type: Toast["type"]) => void;
}

function ServiceModal({ mode, initial, onClose, onSaved, showToast }: ServiceModalProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    fetch(`${BASE}/service-categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          description: initial.description || "",
          price: String(initial.price),
          duration_minutes: String(initial.duration_minutes),
          category_id: initial.category_id ? String(initial.category_id) : "",
        }
      : emptyForm
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())                      e.name = "El nombre del servicio es obligatorio";
    if (!form.price || Number(form.price) <= 0) e.price = "El precio debe ser mayor a cero";
    if (!form.duration_minutes || Number(form.duration_minutes) <= 0) e.duration_minutes = "La duración debe ser mayor a cero";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.category_id && { category_id: Number(form.category_id) }),
      };

      const url = mode === "create" ? `${BASE}/services` : `${BASE}/services/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || "Error al guardar";
        // Map backend error to specific field
        if (msg.includes("nombre")) setErrors({ name: msg });
        else if (msg.includes("precio")) setErrors({ price: msg });
        else showToast(msg, "error");
        return;
      }

      const saved: Service = await res.json();
      showToast(mode === "create" ? "Servicio creado correctamente" : "Servicio actualizado correctamente", "success");
      onSaved(saved, mode);
      onClose();
    } catch {
      showToast("Error de conexión. Intenta nuevamente.", "error");
    } finally { setSaving(false); }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    },
  });

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === "create" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-gradient-to-br from-violet-500 to-purple-600"}`}>
                {mode === "create" ? <Plus size={16} className="text-white" /> : <Edit2 size={15} className="text-white" />}
              </div>
              <div>
                <h2 className="text-white font-bold">{mode === "create" ? "Nuevo Servicio" : "Editar Servicio"}</h2>
                <p className="text-white/40 text-xs">{mode === "create" ? "Completa los datos del servicio" : initial?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">×</button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

            {/* Nombre */}
            <div>
              <p className="text-white/50 text-xs mb-1">Nombre <span className="text-red-400">*</span></p>
              <input type="text" placeholder="Ej: Limpieza dental" className={`form-input text-sm ${errors.name ? "border-red-500/50" : ""}`} {...field("name")} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Descripción */}
            <div>
              <p className="text-white/50 text-xs mb-1">Descripción <span className="text-white/25">(opcional)</span></p>
              <textarea rows={3} placeholder="Describe el servicio..." className="form-input text-sm resize-none" {...field("description")} />
            </div>

            {/* Precio + Duración */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/50 text-xs mb-1">Precio COP <span className="text-red-400">*</span></p>
                <input type="number" min="0" placeholder="Ej: 120000" className={`form-input text-sm font-mono ${errors.price ? "border-red-500/50" : ""}`} {...field("price")} />
                {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
                {form.price && Number(form.price) > 0 && (
                  <p className="text-white/25 text-xs mt-1">{formatCOP(Number(form.price))}</p>
                )}
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">Duración (min) <span className="text-red-400">*</span></p>
                <input type="number" min="1" placeholder="60" className={`form-input text-sm ${errors.duration_minutes ? "border-red-500/50" : ""}`} {...field("duration_minutes")} />
                {errors.duration_minutes && <p className="text-red-400 text-xs mt-1">{errors.duration_minutes}</p>}
              </div>
            </div>

            {/* Categoría */}
            <div>
              <p className="text-white/50 text-xs mb-1">Categoría <span className="text-white/25">(opcional)</span></p>
              <select
                value={form.category_id}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, category_id: e.target.value }));
                  setErrors((prev) => { const n = { ...prev }; delete n.category_id; return n; });
                }}
                className="form-input text-sm w-full"
              >
                <option value="" className="bg-slate-900">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)} className="bg-slate-900">{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
            <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={14} />{saving ? "Guardando..." : mode === "create" ? "Crear Servicio" : "Guardar cambios"}
            </Btn>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ServiciosPage() {
  const [services, setServices]     = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [toast, setToast]           = useState<Toast | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage]  = useState(10);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  const showToast = (msg: string, type: Toast["type"]) => setToast({ msg, type });

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/admin/services`);
      setServices(res.ok ? await res.json() : []);
    } catch { setServices([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadServices();
    fetch(`${BASE}/service-categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => { setCurrentPage(1); }, [search, rowsPerPage]);

  const toggleActive = async (s: Service) => {
    setTogglingId(s.id);
    try {
      const endpoint = s.is_active
        ? `${BASE}/services/${s.id}/inactivate`
        : `${BASE}/services/${s.id}/activate`;

      const res = await authFetch(endpoint, { method: "PATCH" });
      if (res.ok) {
        setServices((prev) => prev.map((sv) => sv.id === s.id ? { ...sv, is_active: !sv.is_active } : sv));
        showToast(s.is_active ? "Servicio inactivado" : "Servicio activado", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Error al actualizar servicio", "error");
      }
    } catch { showToast("Error de conexión", "error"); }
    finally { setTogglingId(null); }
  };

  const handleSaved = (saved: Service, mode: "create" | "edit") => {
    if (mode === "create") {
      setServices((prev) => [saved, ...prev]);
    } else {
      setServices((prev) => prev.map((s) => s.id === saved.id ? saved : s));
    }
  };

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated  = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const getCategoryName = (categoryId?: number) =>
    categoryId ? (categories.find((c) => c.id === categoryId)?.name ?? "—") : "—";

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Servicios"
        subtitle="Gestión de servicios dentales"
        action={
          <Btn variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Nuevo Servicio
          </Btn>
        }
      />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o descripción..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Nombre", "Categoría", "Descripción", "Precio", "Duración", "Estado", "Acción"]} empty={filtered.length === 0}>
          {paginated.map((s) => (
            <TR key={s.id} onClick={() => setEditTarget(s)}>
              <TD>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${s.is_active ? "bg-green-400" : "bg-white/20"}`} />
                  <span className="font-medium text-white">{s.name}</span>
                </div>
              </TD>
              <TD className="text-white/60 text-sm">{getCategoryName(s.category_id)}</TD>
              <TD className="text-white/50 text-xs max-w-[220px] truncate">{s.description || "—"}</TD>
              <TD className="text-cyan-400 font-semibold font-mono text-sm">{formatCOP(s.price)}</TD>
              <TD className="text-white/60 text-sm">{s.duration_minutes} min</TD>
              <TD>
                <span className={`badge ${s.is_active ? "badge-completed" : "badge-cancelled"}`}>
                  {s.is_active ? "Activo" : "Inactivo"}
                </span>
              </TD>
              <TD>
                <div onClick={(e) => e.stopPropagation()}><label className="relative inline-flex items-center cursor-pointer" title={s.is_active ? "Inactivar" : "Activar"}>
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    disabled={togglingId === s.id}
                    onChange={() => toggleActive(s)}
                    className="sr-only peer"
                  />
                  <div className={`w-9 h-5 rounded-full transition-all relative
                    ${togglingId === s.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    ${s.is_active ? "bg-cyan-500" : "bg-white/10"}
                    peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all`}
                  />
                </label></div>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<Briefcase size={40} />} message="No se encontraron servicios" />
      )}

      {/* Paginador */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span>Mostrar</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="bg-[#1a2235] border border-white/10 rounded-lg px-2 py-1 text-white text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>por página — <span className="text-white/70">{filtered.length}</span> total</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ← Anterior
            </button>
            <span className="text-white/70">Página {currentPage} de {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal crear */}
      {showCreate && (
        <ServiceModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* Modal editar */}
      {editTarget && (
        <ServiceModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}
    </AdminLayout>
  );
}