"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn, StatCard } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { inventoryApi, Supply, CreateSupplyDto } from "@/lib/inventory";
import { useRefreshOnFocus } from "@/lib/useRefreshOnFocus";
import {
  Package, Plus, Save, Edit2, Trash2, AlertTriangle, X,
  ShieldAlert, CheckCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Toast { msg: string; type: "success" | "error"; }

type FilterMode = "all" | "critical" | "low";

const emptyForm: CreateSupplyDto = { name: "", category: "", stock: 0, minimumStock: 0 };

// ── Toast ─────────────────────────────────────────────────────────────────────

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

// ── Badge de estado ───────────────────────────────────────────────────────────

function StatusBadge({ critical }: { critical: boolean }) {
  return critical
    ? <span className="badge bg-red-500/15 text-red-400 border border-red-500/25">Crítico</span>
    : <span className="badge bg-green-500/15 text-green-400 border border-green-500/25">Normal</span>;
}

// ── Campo de formulario ───────────────────────────────────────────────────────

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/50 text-xs mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  );
}

// ── Modal crear / editar ──────────────────────────────────────────────────────

function SupplyFormModal({
  mode, initial, onClose, onSaved, showToast,
}: {
  mode: "create" | "edit";
  initial?: Supply;
  onClose: () => void;
  onSaved: (s: Supply, mode: "create" | "edit") => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [form, setForm] = useState<CreateSupplyDto>(
    initial
      ? { name: initial.name, category: initial.category, stock: initial.stock, minimumStock: initial.minimumStock }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateSupplyDto, string>>>({});

  const set = (key: keyof CreateSupplyDto) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = key === "stock" || key === "minimumStock" ? Number(e.target.value) : e.target.value;
      setForm((prev) => ({ ...prev, [key]: val }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const errs: Partial<Record<keyof CreateSupplyDto, string>> = {};
    if (!form.name.trim()) errs.name = "El nombre es obligatorio";
    if (form.stock < 0)        errs.stock = "No puede ser negativo";
    if (form.minimumStock < 0) errs.minimumStock = "No puede ser negativo";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreateSupplyDto = { ...form, name: form.name.trim(), category: form.category.trim() };
      const result = mode === "create"
        ? await inventoryApi.createSupply(payload)
        : await inventoryApi.updateSupply(initial!.id, payload);
      onSaved(result, mode);
      showToast(mode === "create" ? "Insumo creado correctamente" : "Insumo actualizado correctamente", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("[inventario] error:", msg, err);
      showToast(`${mode === "create" ? "Error al crear" : "Error al actualizar"}: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Package size={16} className="text-white" />
              </div>
              <h2 className="text-white font-bold">{mode === "create" ? "Nuevo insumo" : "Editar insumo"}</h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <FormField label="Nombre" required>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Ej: Guantes de látex talla M"
                className={`form-input text-sm ${errors.name ? "border-red-500/50" : ""}`}
                autoFocus
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </FormField>

            <FormField label="Categoría">
              <input
                type="text"
                value={form.category}
                onChange={set("category")}
                placeholder="Ej: Protección, Materiales, Instrumental..."
                className="form-input text-sm"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Stock actual" required>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={set("stock")}
                  className={`form-input text-sm ${errors.stock ? "border-red-500/50" : ""}`}
                />
                {errors.stock && <p className="text-red-400 text-xs mt-1">{errors.stock}</p>}
              </FormField>
              <FormField label="Stock mínimo" required>
                <input
                  type="number"
                  min={0}
                  value={form.minimumStock}
                  onChange={set("minimumStock")}
                  className={`form-input text-sm ${errors.minimumStock ? "border-red-500/50" : ""}`}
                />
                {errors.minimumStock && <p className="text-red-400 text-xs mt-1">{errors.minimumStock}</p>}
              </FormField>
            </div>

            <p className="text-white/25 text-xs">
              Un insumo se marca como <span className="text-red-400">Crítico</span> automáticamente cuando el stock actual es menor o igual al stock mínimo.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-white/8">
            <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleSubmit} disabled={saving} loading={saving}>
              <Save size={14} />
              {saving ? "Guardando..." : mode === "create" ? "Crear insumo" : "Guardar cambios"}
            </Btn>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Modal detalle ─────────────────────────────────────────────────────────────

function SupplyDetailModal({
  supply, onClose, onEdit, onDeleted, showToast,
}: {
  supply: Supply;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: (id: number) => void;
  showToast: (msg: string, type: "success" | "error") => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await inventoryApi.deleteSupply(supply.id);
      onDeleted(supply.id);
      showToast("Insumo eliminado correctamente", "success");
      onClose();
    } catch {
      showToast("Error al eliminar el insumo", "error");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const pct = supply.minimumStock > 0
    ? Math.min(100, Math.round((supply.stock / supply.minimumStock) * 100))
    : 100;

  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className={`h-1.5 w-full rounded-t-2xl ${supply.critical ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-cyan-500 to-blue-600"}`} />
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-bold truncate">{supply.name}</h2>
              <StatusBadge critical={supply.critical} />
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Stock visual */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/40 text-xs">Stock actual</span>
                <span className={`text-lg font-bold ${supply.critical ? "text-red-400" : "text-green-400"}`}>
                  {supply.stock}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${supply.critical ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-white/25 text-xs">0</span>
                <span className="text-white/25 text-xs">Mínimo: {supply.minimumStock}</span>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {[
                { label: "Categoría",     value: supply.category || "—" },
                { label: "Stock mínimo",  value: String(supply.minimumStock) },
                { label: "ID de insumo",  value: `#${supply.id}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/40 text-sm">{label}</span>
                  <span className="text-white/80 text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Confirmación eliminación inline */}
            {confirmDelete && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-300 text-sm font-medium">
                  <AlertTriangle size={15} />
                  ¿Confirmar eliminación?
                </div>
                <p className="text-white/50 text-xs">
                  Se eliminará <strong className="text-white/70">{supply.name}</strong> de forma permanente. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <Btn size="sm" variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    Cancelar
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={handleDelete} disabled={deleting} loading={deleting}>
                    <Trash2 size={12} />
                    {deleting ? "Eliminando..." : "Sí, eliminar"}
                  </Btn>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!confirmDelete && (
            <div className="flex gap-3 px-6 py-4 border-t border-white/8">
              <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Eliminar
              </Btn>
              <div className="flex-1" />
              <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
              <Btn variant="primary" onClick={onEdit}>
                <Edit2 size={13} /> Editar
              </Btn>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [supplies, setSupplies]       = useState<Supply[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<FilterMode>("all");
  const [threshold, setThreshold]     = useState(5);
  const [selected, setSelected]       = useState<Supply | null>(null);
  const [formModal, setFormModal]     = useState<{ mode: "create" | "edit"; initial?: Supply } | null>(null);
  const [toast, setToast]             = useState<Toast | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    try {
      const data = await inventoryApi.getSupplies();
      setSupplies(data);
    } catch {
      showToast("Error al cargar los insumos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefreshOnFocus(load);

  // ── Filtros ──
  const displayed = supplies.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === "critical") return s.critical;
    if (filter === "low")      return s.stock < threshold;
    return true;
  });

  const criticalCount = supplies.filter((s) => s.critical).length;

  // ── Handlers ──
  const handleSaved = (saved: Supply, mode: "create" | "edit") => {
    setSupplies((prev) =>
      mode === "create"
        ? [saved, ...prev]
        : prev.map((s) => s.id === saved.id ? saved : s)
    );
    if (selected?.id === saved.id) setSelected(saved);
  };

  const handleDeleted = (id: number) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const openEdit = () => {
    if (!selected) return;
    setFormModal({ mode: "edit", initial: selected });
    setSelected(null);
  };

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Inventario de Insumos"
        subtitle="Control de stock de materiales e insumos dentales"
        action={
          <Btn variant="primary" onClick={() => setFormModal({ mode: "create" })}>
            <Plus size={15} /> Nuevo insumo
          </Btn>
        }
      />

      {/* ── Panel de alertas ── */}
      {!loading && criticalCount > 0 && (
        <div
          className="flex items-center gap-4 bg-red-500/8 border border-red-500/20 rounded-2xl px-5 py-4 mb-6 cursor-pointer hover:bg-red-500/12 transition-colors"
          onClick={() => setFilter("critical")}
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-300 font-semibold text-sm">
              {criticalCount} insumo{criticalCount !== 1 ? "s" : ""} en estado crítico
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              El stock actual es igual o menor al mínimo establecido. Haz clic para filtrar.
            </p>
          </div>
          <span className="text-red-400/60 text-xs font-medium shrink-0">Ver críticos →</span>
        </div>
      )}

      {/* ── Stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Total insumos"
            value={supplies.length}
            icon={<Package size={18} className="text-white" />}
            color="bg-gradient-to-br from-cyan-500 to-blue-600"
          />
          <StatCard
            label="Estado crítico"
            value={criticalCount}
            icon={<AlertTriangle size={18} className="text-white" />}
            color={criticalCount > 0 ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-slate-500 to-slate-600"}
          />
          <StatCard
            label="Estado normal"
            value={supplies.length - criticalCount}
            icon={<CheckCircle size={18} className="text-white" />}
            color="bg-gradient-to-br from-green-500 to-emerald-600"
          />
        </div>
      )}

      {/* ── Buscador y filtros ── */}
      <div className="flex flex-col gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o categoría..." />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tabs de filtro */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/8 gap-0.5 flex-wrap">
            {([ ["all", "Todos"], ["critical", "Críticos"], ["low", "Stock bajo"] ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === val ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {label}
                {val === "critical" && criticalCount > 0 && (
                  <span className="ml-1.5 bg-red-500/30 text-red-300 text-[10px] px-1.5 py-0.5 rounded-full">
                    {criticalCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Input de threshold para "stock bajo" */}
          {filter === "low" && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs whitespace-nowrap">Umbral:</span>
              <input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
                className="form-input text-sm w-20 py-1.5"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      )}

      {/* ── Mobile: cards ── */}
      {!loading && (
        <div className="sm:hidden space-y-2">
          {displayed.length === 0 && (
            <EmptyState icon={<Package size={40} />} message="No se encontraron insumos" />
          )}
          {displayed.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.05] transition-colors active:scale-[0.99]"
            >
              {/* Icono */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                s.critical ? "bg-red-500/20" : "bg-cyan-500/20"
              }`}>
                <Package size={16} className={s.critical ? "text-red-400" : "text-cyan-400"} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-semibold text-sm truncate">{s.name}</p>
                  <StatusBadge critical={s.critical} />
                </div>
                <p className="text-white/40 text-xs truncate">{s.category || "Sin categoría"}</p>
              </div>

              {/* Stock */}
              <div className="shrink-0 text-right">
                <p className={`text-lg font-bold font-mono leading-tight ${s.critical ? "text-red-400" : "text-green-400"}`}>
                  {s.stock}
                </p>
                <p className="text-white/30 text-[10px]">mín: {s.minimumStock}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop: tabla ── */}
      {!loading && (
        <div className="hidden sm:block">
          <Table
            headers={["Nombre", "Categoría", "Stock", "Stock Mínimo", "Estado", "Acciones"]}
            empty={displayed.length === 0}
          >
            {displayed.map((s) => (
              <TR key={s.id} onClick={() => setSelected(s)}>
                <TD>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      s.critical ? "bg-red-500/20" : "bg-cyan-500/20"
                    }`}>
                      <Package size={14} className={s.critical ? "text-red-400" : "text-cyan-400"} />
                    </div>
                    <span className="font-medium text-white">{s.name}</span>
                  </div>
                </TD>
                <TD className="text-white/60">{s.category || "—"}</TD>
                <TD>
                  <span className={`font-bold font-mono ${s.critical ? "text-red-400" : "text-green-400"}`}>
                    {s.stock}
                  </span>
                </TD>
                <TD className="text-white/60 font-mono">{s.minimumStock}</TD>
                <TD><StatusBadge critical={s.critical} /></TD>
                <TD>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                  >
                    Ver detalle
                  </button>
                </TD>
              </TR>
            ))}
          </Table>
        </div>
      )}

      {/* ── Modal detalle ── */}
      {selected && !formModal && (
        <SupplyDetailModal
          supply={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDeleted={handleDeleted}
          showToast={showToast}
        />
      )}

      {/* ── Modal crear / editar ── */}
      {formModal && (
        <SupplyFormModal
          mode={formModal.mode}
          initial={formModal.initial}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}
    </AdminLayout>
  );
}
