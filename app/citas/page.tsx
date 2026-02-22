"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, StatCard, SearchBar, Table, TR, TD, FilterTabs, Modal, Btn, Skeleton, EmptyState } from "@/components/ui";
import { Appointment, Service, Specialist } from "@/lib/api";
import { formatDate, formatCOP, fullName, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Calendar, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

const STATUS_FILTERS = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "scheduled" },
  { label: "Completadas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
];
const STATUS_OPTIONS = ["pending", "scheduled", "completed", "cancelled"];

interface PaginatedResponse {
  data: Appointment[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Summary {
  total: number;
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

interface Toast { msg: string; type: "success" | "error"; }

// ── TOAST ──────────────────────────────────────────────
function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium transition-all
      ${toast.type === "success"
        ? "bg-green-500/20 border border-green-500/30 text-green-300"
        : "bg-red-500/20 border border-red-500/30 text-red-300"
      }`}>
      <span>{toast.type === "success" ? "✅" : "❌"}</span>
      {toast.msg}
    </div>
  );
}

export default function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Catalog data
  const [services, setServices] = useState<Service[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, scheduled: 0, completed: 0, cancelled: 0 });

  // Edit state inside modal
  const [editForm, setEditForm] = useState({
    specialist_id: "",
    service_id: "",
    start_time: "",
    end_time: "",
    status: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  // ── Fetch summary ──
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/appointments/summary`);
      if (res.ok) setSummary(await res.json());
    } catch { }
  }, []);

  // ── Fetch page ──
  const fetchPage = useCallback(async (p: number, l: number, f: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l), ...(f !== "all" && { status: f }) });
      const res = await fetch(`${BASE}/appointments/paginated?${params}`);
      if (res.ok) {
        const json: PaginatedResponse = await res.json();
        setAppointments(json.data || []);
        setTotal(json.total);
        setTotalPages(json.total_pages);
        setPage(json.page);
      } else {
        // Fallback
        const r2 = await fetch(`${BASE}/appointments`);
        const data = r2.ok ? await r2.json() : [];
        setAppointments(data);
        setTotal(data.length);
        setTotalPages(1);
      }
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    fetchSummary();
    fetchPage(1, 10, "all");
    // Load catalogs
    fetch(`${BASE}/services`).then((r) => r.json()).then((d) => setServices(d.filter((s: Service) => s.is_active))).catch(() => { });
    fetch(`${BASE}/specialists`).then((r) => r.json()).then((d) => setSpecialists(d.filter((s: Specialist) => s.is_active))).catch(() => { });
  }, []);

  useEffect(() => {
    fetchPage(1, limit, filter);
  }, [filter, limit]);

  // ── Open modal ──
  const openModal = (a: Appointment) => {
    setSelected(a);
    const toLocal = (iso: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    setEditForm({
      specialist_id: String(a.specialist_id || ""),
      service_id: String(a.service_id || ""),
      start_time: toLocal(a.start_time),
      end_time: toLocal(a.end_time),
      status: a.status,
    });
  };

  // ── Change status ──
  const handleStatusChange = async (id: number, status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/admin/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setAppointments((prev) => {
        const updated = prev.map((a) => a.id === id ? { ...a, status: status as Appointment["status"] } : a);
        // Si hay filtro activo, saca la cita que ya no coincide
        if (filter !== "all") {
          return updated.filter((a) => a.status === filter);
        }
        return updated;
      });
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: status as Appointment["status"] } : prev);
        setEditForm((prev) => ({ ...prev, status }));
      }
      await fetchSummary();
      showToast("Estado actualizado correctamente", "success");
    } catch {
      showToast("Error al actualizar el estado", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save changes ──
 const handleSave = async () => {
  if (!selected) return;
  setSaving(true);
  try {
    const body: Record<string, unknown> = { status: editForm.status };
    if (editForm.specialist_id) body.specialist_id = Number(editForm.specialist_id);
    if (editForm.service_id) body.service_id = Number(editForm.service_id);
    if (editForm.start_time) body.start_time = new Date(editForm.start_time).toISOString();
    if (editForm.end_time) body.end_time = new Date(editForm.end_time).toISOString();

    const res = await fetch(`${BASE}/admin/appointments/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();

    // Busca los objetos completos desde los catálogos locales
    const newSpecialist = specialists.find((s) => s.id === Number(editForm.specialist_id));
    const newService = services.find((s) => s.id === Number(editForm.service_id));

    // Construye la cita actualizada con todos los datos
    const updatedAppointment: Appointment = {
      ...selected,
      status: editForm.status as Appointment["status"],
      specialist_id: Number(editForm.specialist_id) || selected.specialist_id,
      service_id: Number(editForm.service_id) || selected.service_id,
      start_time: editForm.start_time ? new Date(editForm.start_time).toISOString() : selected.start_time,
      end_time: editForm.end_time ? new Date(editForm.end_time).toISOString() : selected.end_time,
      ...(newSpecialist && { specialist: newSpecialist }),
      ...(newService && { service: newService }),
    };

    // Actualiza la tabla
    setAppointments((prev) => {
      const updated = prev.map((a) => a.id === selected.id ? updatedAppointment : a);
      // Si hay filtro activo y el nuevo estado no coincide, saca la cita
      if (filter !== "all" && updatedAppointment.status !== filter) {
        return updated.filter((a) => a.id !== selected.id);
      }
      return updated;
    });

    // Actualiza el modal
    setSelected(updatedAppointment);

    await fetchSummary();
    showToast("Cambios guardados correctamente", "success");
    setSelected(null);
  } catch {
    showToast("Error al guardar los cambios", "error");
  } finally {
    setSaving(false);
  }
};

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return fullName(a.patient).toLowerCase().includes(q) ||
      a.patient?.document_number?.includes(q) ||
      a.patient?.email?.toLowerCase().includes(q);
  });

  const getServiceName = (a: Appointment) => {
    if (a.service?.name) return a.service.name;
    const s = services.find((sv) => sv.id === a.service_id);
    return s ? s.name : `Servicio #${a.service_id}`;
  };

  const getSpecialistName = (a: Appointment) => {
    if (a.specialist && (a.specialist.first_name || a.specialist.last_name)) return fullName(a.specialist);
    const s = specialists.find((sp) => sp.id === a.specialist_id);
    return s ? fullName(s) : "—";
  };

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader title="Citas" subtitle="Gestión de citas y agendamientos" />

      {/* Stats from summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={summary.total} icon={<Calendar size={18} className="text-white" />} color="bg-gradient-to-br from-cyan-500 to-blue-600" />
        <StatCard label="Pendientes" value={summary.pending} icon={<Clock size={18} className="text-white" />} color="bg-gradient-to-br from-amber-500 to-orange-500" />
        <StatCard label="Aprobadas" value={summary.scheduled} icon={<CheckCircle size={18} className="text-white" />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
        <StatCard label="Completadas" value={summary.completed} icon={<CheckCircle size={18} className="text-white" />} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard label="Canceladas" value={summary.cancelled} icon={<XCircle size={18} className="text-white" />} color="bg-gradient-to-br from-slate-500 to-slate-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, email o documento..." />
        <FilterTabs options={STATUS_FILTERS} value={filter} onChange={(v) => { setFilter(v); setPage(1); }} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: limit }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Paciente", "Servicio", "Especialista", "Fecha", "Estado", "Acciones"]} empty={filtered.length === 0}>
          {filtered.map((a) => (
            <TR key={a.id} onClick={() => openModal(a)}>
              <TD>
                <p className="font-medium text-white">{fullName(a.patient)}</p>
                <p className="text-white/40 text-xs">{a.patient?.document_number}</p>
              </TD>
              <TD>{getServiceName(a)}</TD>
              <TD>{getSpecialistName(a)}</TD>
              <TD className="text-white/60 text-xs">{formatDate(a.start_time)}</TD>
              <TD><span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span></TD>
              <TD>
                <select
                  value={a.status}
                  onChange={(e) => { e.stopPropagation(); handleStatusChange(a.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/5 border border-white/10 text-white/70 text-xs rounded-lg px-2 py-1 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">{statusLabel(s)}</option>
                  ))}
                </select>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<Calendar size={40} />} message="No se encontraron citas" />
      )}

      {/* Paginador */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-5 glass-card rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span>Mostrar</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-1 cursor-pointer"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n} className="bg-slate-900">{n}</option>
              ))}
            </select>
            <span>por página — <span className="text-white">{total}</span> total</span>
          </div>

          <div className="flex items-center gap-3">
            <Btn size="sm" variant="secondary" disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); fetchPage(p, limit, filter); }}>
              <ChevronLeft size={14} /> Anterior
            </Btn>
            <span className="text-white/60 text-sm">
              Página <span className="text-white font-semibold">{page}</span> de <span className="text-white font-semibold">{totalPages}</span>
            </span>
            <Btn size="sm" variant="secondary" disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); fetchPage(p, limit, filter); }}>
              Siguiente <ChevronRight size={14} />
            </Btn>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalle de Cita" wide>
        {selected && (
          <div className="space-y-5">
            {/* Paciente (solo lectura) */}
            <div className="glass-card rounded-xl p-4">
              <p className="text-white/40 text-xs mb-1">Paciente</p>
              <p className="text-white font-semibold">{fullName(selected.patient)}</p>
              <p className="text-white/50 text-xs">{selected.patient?.document_number} · {selected.patient?.phone}</p>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-2 gap-4">
              {/* Especialista */}
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Especialista</label>
                <select
                  value={editForm.specialist_id}
                  onChange={(e) => setEditForm({ ...editForm, specialist_id: e.target.value })}
                  className="form-input text-sm"
                >
                  <option value="" className="bg-slate-900">Seleccionar...</option>
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">{fullName(s)} — {s.specialty}</option>
                  ))}
                </select>
              </div>

              {/* Servicio */}
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Servicio</label>
                <select
                  value={editForm.service_id}
                  onChange={(e) => setEditForm({ ...editForm, service_id: e.target.value })}
                  className="form-input text-sm"
                >
                  <option value="" className="bg-slate-900">Seleccionar...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">{s.name} — {formatCOP(s.price)}</option>
                  ))}
                </select>
              </div>

              {/* Fecha inicio */}
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Fecha y hora inicio</label>
                <input
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  className="form-input text-sm"
                />
              </div>

              {/* Fecha fin */}
              <div>
                <label className="text-white/40 text-xs mb-1.5 block">Fecha y hora fin</label>
                <input
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                  className="form-input text-sm"
                />
              </div>
            </div>

            {/* Notas */}
            {selected.notes && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1">Notas del paciente</p>
                <p className="text-white/80 text-sm">{selected.notes}</p>
              </div>
            )}

            {/* Cambiar estado */}
            <div>
              <p className="text-white/40 text-xs mb-2">Cambiar estado</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <Btn
                    key={s}
                    size="sm"
                    variant={editForm.status === s ? "primary" : "secondary"}
                    onClick={() => {
                      setEditForm((prev) => ({ ...prev, status: s }));
                      handleStatusChange(selected.id, s);
                    }}
                    disabled={saving}
                  >
                    {statusLabel(s)}
                  </Btn>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-white/8">
              <Btn variant="secondary" onClick={() => setSelected(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>
                <Save size={14} />
                {saving ? "Guardando..." : "Guardar cambios"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}