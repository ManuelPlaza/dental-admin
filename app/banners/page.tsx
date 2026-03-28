"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { Banner } from "@/lib/api";
import { authFetch } from "@/lib/auth";
import { ImagePlay, Plus, Edit2, Trash2, Save, AlertTriangle, ExternalLink } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE    = `${API_URL}/api/v1`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Toast { msg: string; type: "success" | "error" | "info"; }

type BannerStatus = "vigente" | "programado" | "expirado" | "inactivo";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getBannerStatus(b: Banner): BannerStatus {
  if (!b.is_active) return "inactivo";
  const now   = Date.now();
  const start = new Date(b.start_time).getTime();
  const end   = new Date(b.end_time).getTime();
  if (now < start) return "programado";
  if (now > end)   return "expirado";
  return "vigente";
}

const STATUS_CONFIG: Record<BannerStatus, { label: string; cls: string }> = {
  vigente:    { label: "Vigente",    cls: "bg-green-500/15 border border-green-500/25 text-green-400" },
  programado: { label: "Programado", cls: "bg-blue-500/15 border border-blue-500/25 text-blue-400" },
  expirado:   { label: "Expirado",   cls: "bg-white/5 border border-white/10 text-white/35" },
  inactivo:   { label: "Inactivo",   cls: "bg-red-500/15 border border-red-500/25 text-red-400" },
};

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleString("es-CO", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function isValidUrl(url: string): boolean {
  try { return Boolean(new URL(url)); } catch { return false; }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cls =
    toast.type === "success" ? "bg-green-500/20 border-green-500/30 text-green-300" :
    toast.type === "error"   ? "bg-red-500/20 border-red-500/30 text-red-300" :
                               "bg-blue-500/20 border-blue-500/30 text-blue-300";
  const icon = toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️";
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border ${cls}`}>
        {icon} {toast.msg}
      </div>
    </Portal>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  banner, onConfirm, onCancel, deleting,
}: {
  banner: Banner; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Eliminar banner</h3>
              <p className="text-white/40 text-xs mt-0.5">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <p className="text-white/65 text-sm leading-relaxed">
            ¿Estás seguro de que deseas eliminar el banner{" "}
            <span className="text-white font-semibold">"{banner.title}"</span>?
          </p>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={onCancel} disabled={deleting}>Cancelar</Btn>
            <Btn variant="danger" onClick={onConfirm} disabled={deleting}>
              <Trash2 size={13} />
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </Btn>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Banner Modal (Create / Edit) ───────────────────────────────────────────────
const emptyForm = {
  title: "",
  description: "",
  image_url_desktop: "",
  image_url_mobile: "",
  redirect_url: "",
  start_time: "",
  end_time: "",
  priority: "0",
  is_active: true,
};

interface BannerModalProps {
  mode: "create" | "edit";
  initial?: Banner;
  onClose: () => void;
  onSaved: (saved: Banner, mode: "create" | "edit") => void;
  showToast: (msg: string, type: Toast["type"]) => void;
}

function BannerModal({ mode, initial, onClose, onSaved, showToast }: BannerModalProps) {
  const toLocalDatetime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState(
    initial
      ? {
          title:              initial.title,
          description:        initial.description || "",
          image_url_desktop:  initial.image_url_desktop,
          image_url_mobile:   initial.image_url_mobile || "",
          redirect_url:       initial.redirect_url || "",
          start_time:         toLocalDatetime(initial.start_time),
          end_time:           toLocalDatetime(initial.end_time),
          priority:           String(initial.priority),
          is_active:          initial.is_active,
        }
      : emptyForm
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim())               e.title = "El título es obligatorio";
    if (!form.image_url_desktop.trim())   e.image_url_desktop = "La URL de imagen desktop es obligatoria";
    else if (!isValidUrl(form.image_url_desktop)) e.image_url_desktop = "URL no válida";
    if (form.image_url_mobile && !isValidUrl(form.image_url_mobile)) e.image_url_mobile = "URL no válida";
    if (form.redirect_url && !isValidUrl(form.redirect_url)) e.redirect_url = "URL no válida";
    if (!form.start_time) e.start_time = "La fecha de inicio es obligatoria";
    if (!form.end_time)   e.end_time   = "La fecha de fin es obligatoria";
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time))
      e.end_time = "La fecha de fin debe ser posterior al inicio";
    if (form.priority !== "" && (isNaN(Number(form.priority)) || Number(form.priority) < 0 || Number(form.priority) > 100))
      e.priority = "La prioridad debe estar entre 0 y 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title:             form.title.trim(),
        image_url_desktop: form.image_url_desktop.trim(),
        start_time:        new Date(form.start_time).toISOString(),
        end_time:          new Date(form.end_time).toISOString(),
        is_active:         form.is_active,
        priority:          Number(form.priority) || 0,
        ...(form.description.trim()   && { description:       form.description.trim() }),
        ...(form.image_url_mobile.trim() && { image_url_mobile: form.image_url_mobile.trim() }),
        ...(form.redirect_url.trim()  && { redirect_url:      form.redirect_url.trim() }),
      };

      const url    = mode === "create" ? `${BASE}/banners` : `${BASE}/banners/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.message || "Error al guardar el banner", "error");
        return;
      }

      const raw: Banner = await res.json();
      const saved: Banner = { ...(mode === "edit" ? initial! : {}), ...raw } as Banner;

      showToast(mode === "create" ? "Banner creado correctamente" : "Banner actualizado correctamente", "success");
      onSaved(saved, mode);
      onClose();
    } catch {
      showToast("Error de conexión. Intenta nuevamente.", "error");
    } finally { setSaving(false); }
  };

  const Label = ({ text, required, tooltip }: { text: string; required?: boolean; tooltip?: string }) => (
    <p className="text-white/50 text-xs mb-1 flex items-center gap-1.5">
      {text}
      {required && <span className="text-red-400">*</span>}
      {tooltip && (
        <span className="text-white/25 cursor-help" title={tooltip}>(?)</span>
      )}
    </p>
  );

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "92vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === "create" ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-gradient-to-br from-violet-500 to-purple-600"}`}>
                {mode === "create" ? <Plus size={16} className="text-white" /> : <Edit2 size={15} className="text-white" />}
              </div>
              <div>
                <h2 className="text-white font-bold">{mode === "create" ? "Nuevo Banner" : "Editar Banner"}</h2>
                <p className="text-white/40 text-xs">{mode === "create" ? "Completa los datos del banner" : initial?.title}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">
              ×
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

            {/* Título */}
            <div>
              <Label text="Título" required />
              <input
                type="text" placeholder="Ej: Promoción de Abril"
                value={form.title} onChange={(e) => set("title", e.target.value)}
                className={`form-input text-sm ${errors.title ? "border-red-500/50" : ""}`}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Descripción */}
            <div>
              <Label text="Descripción" />
              <textarea
                rows={2} placeholder="Texto secundario del banner (opcional)"
                value={form.description} onChange={(e) => set("description", e.target.value)}
                className="form-input text-sm resize-none"
              />
            </div>

            {/* Imagen Desktop */}
            <div>
              <Label text="URL Imagen Desktop" required />
              <input
                type="text" autoComplete="off"
                placeholder="https://ejemplo.com/banner-1920x600.jpg"
                value={form.image_url_desktop} onChange={(e) => set("image_url_desktop", e.target.value)}
                className={`form-input text-sm ${errors.image_url_desktop ? "border-red-500/50" : ""}`}
              />
              {errors.image_url_desktop && <p className="text-red-400 text-xs mt-1">{errors.image_url_desktop}</p>}
            </div>

            {/* Imagen Mobile */}
            <div>
              <Label text="URL Imagen Mobile" tooltip="Si no se especifica, se usará la imagen desktop" />
              <input
                type="text" autoComplete="off"
                placeholder="https://ejemplo.com/banner-600x400.jpg (opcional)"
                value={form.image_url_mobile} onChange={(e) => set("image_url_mobile", e.target.value)}
                className={`form-input text-sm ${errors.image_url_mobile ? "border-red-500/50" : ""}`}
              />
              {errors.image_url_mobile && <p className="text-red-400 text-xs mt-1">{errors.image_url_mobile}</p>}
            </div>

            {/* URL Redirección */}
            <div>
              <Label text="URL de Redirección" />
              <input
                type="text" autoComplete="off"
                placeholder="https://ejemplo.com/promo (opcional)"
                value={form.redirect_url} onChange={(e) => set("redirect_url", e.target.value)}
                className={`form-input text-sm ${errors.redirect_url ? "border-red-500/50" : ""}`}
              />
              {errors.redirect_url && <p className="text-red-400 text-xs mt-1">{errors.redirect_url}</p>}
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label text="Fecha y hora de inicio" required />
                <input
                  type="datetime-local"
                  value={form.start_time} onChange={(e) => set("start_time", e.target.value)}
                  className={`form-input text-sm ${errors.start_time ? "border-red-500/50" : ""}`}
                />
                {errors.start_time && <p className="text-red-400 text-xs mt-1">{errors.start_time}</p>}
              </div>
              <div>
                <Label text="Fecha y hora de fin" required />
                <input
                  type="datetime-local"
                  value={form.end_time} onChange={(e) => set("end_time", e.target.value)}
                  className={`form-input text-sm ${errors.end_time ? "border-red-500/50" : ""}`}
                />
                {errors.end_time && <p className="text-red-400 text-xs mt-1">{errors.end_time}</p>}
              </div>
            </div>

            {/* Prioridad + Activo */}
            <div className="grid grid-cols-2 gap-3 items-start">
              <div>
                <Label text="Prioridad" tooltip="Mayor número = aparece primero (0–100)" />
                <input
                  type="number" min="0" max="100" placeholder="0"
                  value={form.priority} onChange={(e) => set("priority", e.target.value)}
                  className={`form-input text-sm ${errors.priority ? "border-red-500/50" : ""}`}
                />
                {errors.priority && <p className="text-red-400 text-xs mt-1">{errors.priority}</p>}
              </div>

              {/* Toggle Activo */}
              <div>
                <p className="text-white/50 text-xs mb-1">Estado</p>
                <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/8 h-[38px]">
                  <span className={`text-sm font-medium ${form.is_active ? "text-white/80" : "text-white/35"}`}>
                    {form.is_active ? "Activo" : "Inactivo"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox" checked={form.is_active}
                      onChange={(e) => set("is_active", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className={`w-9 h-5 rounded-full transition-all relative
                      ${form.is_active ? "bg-cyan-500" : "bg-white/10"}
                      peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all`}
                    />
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
            <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={14} />
              {saving ? "Guardando..." : mode === "create" ? "Crear Banner" : "Guardar cambios"}
            </Btn>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BannersPage() {
  const [banners, setBanners]           = useState<Banner[]>([]);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState<Toast | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const showToast = useCallback((msg: string, type: Toast["type"]) => setToast({ msg, type }), []);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/banners`);
      setBanners(res.ok ? await res.json() : []);
    } catch { setBanners([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const handleSaved = useCallback(async (saved: Banner, mode: "create" | "edit") => {
    // Optimistic update inmediato para que la UI responda sin esperar el refetch
    setBanners((prev) =>
      mode === "create"
        ? [saved, ...prev]
        : [saved, ...prev.filter((b) => b.id !== saved.id)]
    );
    // Refetch para garantizar que los datos reflejen exactamente lo que persiste el backend
    try {
      const res = await authFetch(`${BASE}/banners`);
      if (res.ok) setBanners(await res.json());
    } catch { /* mantener optimistic update si falla el refetch */ }
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await authFetch(`${BASE}/banners/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.message || "Error al eliminar el banner", "error");
        return;
      }
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      showToast("Banner eliminado correctamente", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Error de conexión. Intenta nuevamente.", "error");
    } finally { setDeleting(false); }
  };

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Banners Promocionales"
        subtitle="Gestión de banners para el landing público"
        action={
          <Btn variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Nuevo Banner
          </Btn>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Título</th>
                  <th className="hidden md:table-cell text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Vigencia</th>
                  <th className="hidden lg:table-cell text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Prioridad</th>
                  <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Estado</th>
                  <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? null : banners.map((b) => {
                  const status = getBannerStatus(b);
                  const { label, cls } = STATUS_CONFIG[status];
                  return (
                    <tr key={b.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      {/* Título */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm truncate">{b.title}</span>
                            {b.redirect_url && (
                              <a href={b.redirect_url} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-white/25 hover:text-white/60 transition-colors shrink-0" title="Abrir URL">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {b.description && (
                            <span className="text-white/35 text-xs truncate max-w-xs">{b.description}</span>
                          )}
                          {/* Vigencia visible solo en móvil bajo el título */}
                          <span className="md:hidden text-white/40 text-xs mt-0.5">
                            {formatDateRange(b.start_time, b.end_time)}
                          </span>
                        </div>
                      </td>

                      {/* Vigencia — oculta en móvil */}
                      <td className="hidden md:table-cell p-4 text-white/60 text-sm">
                        {formatDateRange(b.start_time, b.end_time)}
                      </td>

                      {/* Prioridad — oculta en tablet */}
                      <td className="hidden lg:table-cell p-4 text-white/60 text-sm">{b.priority}</td>

                      {/* Estado */}
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                          {label}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Btn variant="secondary" size="sm" onClick={() => setEditTarget(b)}>
                            <Edit2 size={12} /> Editar
                          </Btn>
                          <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(b)}>
                            <Trash2 size={12} />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && banners.length === 0 && (
        <EmptyState icon={<ImagePlay size={40} />} message="No hay banners registrados" />
      )}

      {/* Modal crear */}
      {showCreate && (
        <BannerModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* Modal editar */}
      {editTarget && (
        <BannerModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <DeleteConfirmModal
          banner={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </AdminLayout>
  );
}
