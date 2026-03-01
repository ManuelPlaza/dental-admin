"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, StatCard, SearchBar, Table, TR, TD, FilterTabs, Modal, Btn, Skeleton, EmptyState } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { Appointment, Service, Specialist } from "@/lib/api";
import { formatDate, formatCOP, fullName, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Calendar, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save, Plus, Loader2, FileText, AlertTriangle } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

// ── Máquina de estados ──
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ["scheduled", "cancelled"],
  scheduled: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const isFrozen      = (s: string) => s === "completed" || s === "cancelled";
const canTransition = (from: string, to: string) => ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;

// ── Mapa de codes → labels ──
const CANCELLATION_LABELS: Record<string, string> = {
  no_show:                "No se presentó",
  patient_request:        "Solicitud del paciente",
  auto_expired:           "Expiró sin confirmar",
  emergency:              "Emergencia del paciente",
  scheduling_conflict:    "Conflicto de horario",
  specialist_unavailable: "Especialista no disponible",
  clinic_decision:        "Decisión administrativa",
  other:                  "Otro motivo",
};

const STATUS_FILTERS = [
  { label: "Todas",       value: "all" },
  { label: "Pendientes",  value: "pending" },
  { label: "Aprobadas",   value: "scheduled" },
  { label: "Completadas", value: "completed" },
  { label: "Canceladas",  value: "cancelled" },
];
const STATUS_OPTIONS = ["pending", "scheduled", "completed", "cancelled"];

interface PaginatedResponse { data: Appointment[]; total: number; page: number; limit: number; total_pages: number; }
interface Summary { total: number; pending: number; scheduled: number; completed: number; cancelled: number; }
interface Toast { msg: string; type: "success" | "error" | "info"; }
interface CancellationReason { code: string; label: string; description: string; }

const emptyNewForm = {
  document_number: "", first_name: "", last_name: "", phone: "", email: "",
  specialist_id: "", service_id: "", start_time: "", end_time: "", notes: "",
};
const emptyHistoriaForm = {
  diagnosis: "", treatment: "", doctor_notes: "", attachments: "", next_appointment_date: "",
};

// ── Toast ──
function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const styles = {
    success: "bg-green-500/20 border-green-500/30 text-green-300",
    error:   "bg-red-500/20 border-red-500/30 text-red-300",
    info:    "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
  };
  const icons = { success: "✅", error: "❌", info: "💳" };
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium border ${styles[toast.type]}`}>
        {icons[toast.type]} {toast.msg}
      </div>
    </Portal>
  );
}

const reqLabel = (label: string) => (
  <p className="text-white/50 text-xs mb-1">{label} <span className="text-red-400">*</span></p>
);

export default function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState("all");
  const [selected, setSelected]         = useState<Appointment | null>(null);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState<Toast | null>(null);
  const [services, setServices]         = useState<Service[]>([]);
  const [specialists, setSpecialists]   = useState<Specialist[]>([]);
  const [summary, setSummary]           = useState<Summary>({ total: 0, pending: 0, scheduled: 0, completed: 0, cancelled: 0 });
  const [editForm, setEditForm]         = useState({ specialist_id: "", service_id: "", start_time: "", end_time: "", status: "" });
  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(10);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);

  // Nueva Cita
  const [showNewModal, setShowNewModal]     = useState(false);
  const [newForm, setNewForm]               = useState(emptyNewForm);
  const [lookingUp, setLookingUp]           = useState(false);
  const [patientStatus, setPatientStatus]   = useState<"idle"|"found"|"new">("idle");
  const [patientLocked, setPatientLocked]   = useState(false);
  const [creatingAppt, setCreatingAppt]     = useState(false);

  // Historia Clínica
  const [historiaAppt, setHistoriaAppt]     = useState<Appointment | null>(null);
  const [historiaForm, setHistoriaForm]     = useState(emptyHistoriaForm);
  const [savingHistoria, setSavingHistoria] = useState(false);
  const [historiasDone, setHistoriasDone]   = useState<Set<number>>(new Set());

  // Modal cancelación
  const [cancelTarget, setCancelTarget]     = useState<{ id: number; currentStatus: string } | null>(null);
  const [cancelReasons, setCancelReasons]   = useState<CancellationReason[]>([]);
  const [cancelForm, setCancelForm]         = useState({ reason: "", notes: "" });
  const [cancelError, setCancelError]       = useState("");
  const [savingCancel, setSavingCancel]     = useState(false);

  const showToast = (msg: string, type: Toast["type"] = "success") => setToast({ msg, type });

  const fetchSummary = useCallback(async () => {
    try { const r = await authFetch(`${BASE}/appointments/summary`); if (r.ok) setSummary(await r.json()); } catch {}
  }, []);

  const fetchPage = useCallback(async (p: number, l: number, f: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l), ...(f !== "all" && { status: f }) });
      const res = await authFetch(`${BASE}/appointments/paginated?${params}`);
      if (res.ok) {
        const json: PaginatedResponse = await res.json();
        setAppointments(json.data || []); setTotal(json.total); setTotalPages(json.total_pages); setPage(json.page);
      } else {
        const r2 = await authFetch(`${BASE}/appointments`);
        const data = r2.ok ? await r2.json() : [];
        setAppointments(data); setTotal(data.length); setTotalPages(1);
      }
    } catch { setAppointments([]); } finally { setLoading(false); }
  }, []);

  const loadCatalogs = () => {
    authFetch(`${BASE}/services`).then((r) => r.json()).then((d) => setServices(d.filter((s: Service) => s.is_active))).catch(() => {});
    authFetch(`${BASE}/specialists`).then((r) => r.json()).then((d) => setSpecialists(d.filter((s: Specialist) => s.is_active))).catch(() => {});
  };

  useEffect(() => {
    fetchSummary(); fetchPage(1, 10, "all"); loadCatalogs();
    authFetch(`${BASE}/medical-history`)
      .then((r) => r.json())
      .then((d) => setHistoriasDone(new Set<number>(d.map((h: any) => h.appointment_id))))
      .catch(() => {});
    // Pre-cargar motivos de cancelación
    authFetch(`${BASE}/appointments/cancellation-reasons`)
      .then((r) => r.json())
      .then(setCancelReasons)
      .catch(() => {
        // Fallback con los motivos hardcodeados si el endpoint falla
        setCancelReasons(Object.entries(CANCELLATION_LABELS).map(([code, label]) => ({ code, label, description: "" })));
      });
  }, []);

  useEffect(() => { fetchPage(1, limit, filter); }, [filter, limit]);

  // ── Abrir modal de cancelación ──
  const openCancelModal = (id: number, currentStatus: string) => {
    setCancelTarget({ id, currentStatus });
    setCancelForm({ reason: "", notes: "" });
    setCancelError("");
  };

  // ── Confirmar cancelación ──
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelForm.reason) { setCancelError("Debes seleccionar un motivo de cancelación"); return; }
    setSavingCancel(true);
    try {
      const res = await authFetch(`${BASE}/admin/appointments/${cancelTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancellation_reason: cancelForm.reason,
          ...(cancelForm.notes.trim() && { cancellation_notes: cancelForm.notes.trim() }),
        }),
      });

      if (res.status === 400) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || err.message || "";
        if (msg.includes("ya está cancelada") || msg.includes("cancelled")) {
          showToast("Esta cita ya se encuentra cancelada", "error");
          setCancelTarget(null);
        } else {
          setCancelError(msg || "Debes seleccionar un motivo de cancelación");
        }
        return;
      }
      if (res.status === 500) { showToast("Error interno del servidor", "error"); return; }
      if (!res.ok) throw new Error();

      // Actualizar UI
      setAppointments((prev) => {
        const updated = prev.map((a) => a.id === cancelTarget.id ? { ...a, status: "cancelled" as Appointment["status"] } : a);
        return filter !== "all" ? updated.filter((a) => a.status === filter) : updated;
      });
      if (selected?.id === cancelTarget.id) {
        setSelected((prev) => prev ? { ...prev, status: "cancelled" as Appointment["status"] } : prev);
      }
      await fetchSummary();
      showToast("Cita cancelada correctamente");
      setCancelTarget(null);
    } catch { showToast("Error al cancelar la cita", "error"); }
    finally { setSavingCancel(false); }
  };

  // ── Cambio de estado (intercepta cancelación) ──
  const handleStatusChange = async (id: number, newStatus: string, currentStatus: string) => {
    if (!canTransition(currentStatus, newStatus)) return;
    // Si va a cancelar → abrir modal de motivo
    if (newStatus === "cancelled") {
      openCancelModal(id, currentStatus);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/admin/appointments/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setAppointments((prev) => {
        const updated = prev.map((a) => a.id === id ? { ...a, status: newStatus as Appointment["status"] } : a);
        return filter !== "all" ? updated.filter((a) => a.status === filter) : updated;
      });
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, status: newStatus as Appointment["status"] } : prev);
        setEditForm((prev) => ({ ...prev, status: newStatus }));
      }
      await fetchSummary();
      showToast("Estado actualizado correctamente");
      if (newStatus === "completed") {
        // Auto-crear pago pendiente
        authFetch(`${BASE}/payments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: id, amount: 0, method: "pending", notes: "Pago pendiente - generado al completar cita" }),
        }).then((r) => { if (r.ok) showToast(`Nuevo registro de pago generado para la cita #${id}`, "info"); }).catch(() => {});
      }
    } catch { showToast("Error al actualizar el estado", "error"); } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status: editForm.status };
      if (editForm.specialist_id) body.specialist_id = Number(editForm.specialist_id);
      if (editForm.service_id)    body.service_id    = Number(editForm.service_id);
      if (editForm.start_time)    body.start_time    = new Date(editForm.start_time).toISOString();
      if (editForm.end_time)      body.end_time      = new Date(editForm.end_time).toISOString();
      const res = await authFetch(`${BASE}/admin/appointments/${selected.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const newSpecialist = specialists.find((s) => s.id === Number(editForm.specialist_id));
      const newService    = services.find((s) => s.id === Number(editForm.service_id));
      const updated: Appointment = {
        ...selected, status: editForm.status as Appointment["status"],
        specialist_id: Number(editForm.specialist_id) || selected.specialist_id,
        service_id:    Number(editForm.service_id)    || selected.service_id,
        start_time: editForm.start_time ? new Date(editForm.start_time).toISOString() : selected.start_time,
        end_time:   editForm.end_time   ? new Date(editForm.end_time).toISOString()   : selected.end_time,
        ...(newSpecialist && { specialist: newSpecialist }),
        ...(newService    && { service: newService }),
      };
      setAppointments((prev) => {
        const list = prev.map((a) => a.id === selected.id ? updated : a);
        return filter !== "all" && updated.status !== filter ? list.filter((a) => a.id !== selected.id) : list;
      });
      await fetchSummary();
      showToast("Cambios guardados correctamente");
      setSelected(null);
    } catch { showToast("Error al guardar los cambios", "error"); } finally { setSaving(false); }
  };

  // Nueva cita handlers
  const handleCedulaBlur = async () => {
    if (!newForm.document_number.trim()) return;
    setLookingUp(true); setPatientStatus("idle");
    try {
      const res = await authFetch(`${BASE}/patients/document/${newForm.document_number.trim()}`);
      if (res.ok) {
        const p = await res.json();
        setNewForm((prev) => ({ ...prev, first_name: p.first_name || "", last_name: p.last_name || "", phone: p.phone || "", email: p.email || "" }));
        setPatientStatus("found"); setPatientLocked(true);
      } else { setPatientStatus("new"); setPatientLocked(false); setNewForm((prev) => ({ ...prev, first_name: "", last_name: "", phone: "", email: "" })); }
    } catch { setPatientStatus("new"); setPatientLocked(false); } finally { setLookingUp(false); }
  };

  const handleServiceChange = (serviceId: string) => {
    setNewForm((prev) => {
      const svc = services.find((s) => s.id === Number(serviceId));
      let end_time = prev.end_time;
      if (svc && prev.start_time) {
        const start = new Date(prev.start_time);
        start.setMinutes(start.getMinutes() + svc.duration_minutes);
        end_time = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}T${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`;
      }
      return { ...prev, service_id: serviceId, end_time };
    });
  };

  const handleStartTimeChange = (val: string) => {
    setNewForm((prev) => {
      const svc = services.find((s) => s.id === Number(prev.service_id));
      let end_time = prev.end_time;
      if (svc && val) {
        const start = new Date(val);
        start.setMinutes(start.getMinutes() + svc.duration_minutes);
        end_time = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,"0")}-${String(start.getDate()).padStart(2,"0")}T${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}`;
      }
      return { ...prev, start_time: val, end_time };
    });
  };

  const handleCreateAppointment = async () => {
    const { document_number, first_name, last_name, phone, specialist_id, service_id, start_time, end_time } = newForm;
    if (!document_number || !first_name || !last_name || !phone || !specialist_id || !service_id || !start_time || !end_time) {
      showToast("Completa todos los campos obligatorios", "error"); return;
    }
    setCreatingAppt(true);
    try {
      const body = {
        patient: { document_number, first_name, last_name, phone, ...(newForm.email && { email: newForm.email }) },
        specialist_id: Number(specialist_id), service_id: Number(service_id),
        start_time: new Date(start_time).toISOString(), end_time: new Date(end_time).toISOString(),
        ...(newForm.notes.trim() && { notes: newForm.notes.trim() }),
      };
      const res = await authFetch(`${BASE}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      showToast("Cita creada correctamente");
      setShowNewModal(false); setNewForm(emptyNewForm); setPatientStatus("idle"); setPatientLocked(false);
      await Promise.all([fetchPage(1, limit, filter), fetchSummary()]);
    } catch { showToast("Error al crear la cita", "error"); } finally { setCreatingAppt(false); }
  };

  const handleCreateHistoria = async () => {
    if (!historiaAppt) return;
    if (!historiaForm.diagnosis || !historiaForm.treatment) { showToast("Diagnóstico y tratamiento son obligatorios", "error"); return; }
    setSavingHistoria(true);
    try {
      const body: Record<string, unknown> = {
        appointment_id: historiaAppt.id, diagnosis: historiaForm.diagnosis, treatment: historiaForm.treatment,
        ...(historiaForm.doctor_notes && { doctor_notes: historiaForm.doctor_notes }),
        ...(historiaForm.attachments && { attachments: historiaForm.attachments }),
        ...(historiaForm.next_appointment_date && { next_appointment_date: new Date(historiaForm.next_appointment_date).toISOString() }),
      };
      const res = await authFetch(`${BASE}/medical-history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 400) { const err = await res.json().catch(() => ({})); showToast(err.error || "Datos inválidos", "error"); return; }
      if (!res.ok) throw new Error();
      setHistoriasDone((prev) => new Set(prev).add(historiaAppt.id));
      showToast("Historia clínica creada correctamente");
      setHistoriaAppt(null); setHistoriaForm(emptyHistoriaForm);
    } catch { showToast("Error al crear la historia clínica", "error"); } finally { setSavingHistoria(false); }
  };

  const openEditModal = (a: Appointment) => {
    setSelected(a);
    const toLocal = (iso: string) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
    setEditForm({ specialist_id: String(a.specialist_id || ""), service_id: String(a.service_id || ""), start_time: toLocal(a.start_time), end_time: toLocal(a.end_time), status: a.status });
  };

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return fullName(a.patient).toLowerCase().includes(q) || a.patient?.document_number?.includes(q) || a.patient?.email?.toLowerCase().includes(q);
  });

  const getServiceName    = (a: Appointment) => { if (a.service?.name) return a.service.name; const s = services.find((sv) => sv.id === a.service_id); return s ? s.name : `#${a.service_id}`; };
  const getSpecialistName = (a: Appointment) => { if (a.specialist && (a.specialist.first_name || a.specialist.last_name)) return fullName(a.specialist); const s = specialists.find((sp) => sp.id === a.specialist_id); return s ? fullName(s) : "—"; };
  const inputClass = (locked?: boolean) => `form-input text-sm ${locked ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader title="Citas" subtitle="Gestión de citas y agendamientos"
        action={<Btn variant="primary" onClick={() => { setShowNewModal(true); setNewForm(emptyNewForm); setPatientStatus("idle"); setPatientLocked(false); loadCatalogs(); }}><Plus size={15} /> Nueva Cita</Btn>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total"       value={summary.total}     icon={<Calendar    size={18} className="text-white" />} color="bg-gradient-to-br from-cyan-500 to-blue-600"    />
        <StatCard label="Pendientes"  value={summary.pending}   icon={<Clock       size={18} className="text-white" />} color="bg-gradient-to-br from-amber-500 to-orange-500"  />
        <StatCard label="Aprobadas"   value={summary.scheduled} icon={<CheckCircle size={18} className="text-white" />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
        <StatCard label="Completadas" value={summary.completed} icon={<CheckCircle size={18} className="text-white" />} color="bg-gradient-to-br from-blue-500 to-indigo-600"   />
        <StatCard label="Canceladas"  value={summary.cancelled} icon={<XCircle     size={18} className="text-white" />} color="bg-gradient-to-br from-slate-500 to-slate-600"   />
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
          {filtered.map((a) => {
            const frozen = isFrozen(a.status);
            return (
              <TR key={a.id} onClick={() => openEditModal(a)}>
                <TD><p className="font-medium text-white">{fullName(a.patient)}</p><p className="text-white/40 text-xs">{a.patient?.document_number}</p></TD>
                <TD>{getServiceName(a)}</TD>
                <TD>{getSpecialistName(a)}</TD>
                <TD className="text-white/60 text-xs">{formatDate(a.start_time)}</TD>
                <TD><span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span></TD>
                <TD>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <select value={a.status} disabled={frozen}
                      onChange={(e) => handleStatusChange(a.id, e.target.value, a.status)}
                      className={`border border-white/10 text-white/70 text-xs rounded-lg px-2 py-1 ${frozen ? "bg-white/5 opacity-40 cursor-not-allowed" : "bg-white/5 cursor-pointer"}`}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} disabled={s !== a.status && !canTransition(a.status, s)} className="bg-slate-900">{statusLabel(s)}</option>
                      ))}
                    </select>
                    {a.status === "completed" && (
                      <button disabled={historiasDone.has(a.id)}
                        onClick={() => { if (!historiasDone.has(a.id)) { setHistoriaAppt(a); setHistoriaForm(emptyHistoriaForm); } }}
                        className={`flex items-center gap-1 text-xs font-medium border rounded-lg px-2 py-1 transition-all whitespace-nowrap
                          ${historiasDone.has(a.id) ? "text-white/20 border-white/5 cursor-not-allowed" : "text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:border-emerald-400/50 cursor-pointer"}`}
                        title={historiasDone.has(a.id) ? "Historia ya registrada" : "Crear Historia Clínica"}>
                        <FileText size={12} />{historiasDone.has(a.id) ? "Registrada" : "Historia"}
                      </button>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {filtered.length === 0 && !loading && <EmptyState icon={<Calendar size={40} />} message="No se encontraron citas" />}

      {/* Paginador */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-5 glass-card rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <span>Mostrar</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-2 py-1 cursor-pointer">
              {[10, 25, 50].map((n) => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
            </select>
            <span>por página — <span className="text-white">{total}</span> total</span>
          </div>
          <div className="flex items-center gap-3">
            <Btn size="sm" variant="secondary" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchPage(p, limit, filter); }}><ChevronLeft size={14} /> Anterior</Btn>
            <span className="text-white/60 text-sm">Página <span className="text-white font-semibold">{page}</span> de <span className="text-white font-semibold">{totalPages}</span></span>
            <Btn size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchPage(p, limit, filter); }}>Siguiente <ChevronRight size={14} /></Btn>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE / EDITAR CITA ── */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalle de Cita" wide>
        {selected && (() => {
          const frozen = isFrozen(selected.status);
          const cancelReason = (selected as any).cancellation_reason;
          const cancelNotes  = (selected as any).cancellation_notes;
          return (
            <div className="space-y-5">
              {/* Banner estado terminal */}
              {frozen && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border
                  ${selected.status === "completed" ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
                  {selected.status === "completed" ? "✅" : "🚫"}
                  Esta cita está <strong className="ml-1">{statusLabel(selected.status).toLowerCase()}</strong> y no puede modificarse.
                </div>
              )}

              {/* Motivo de cancelación */}
              {selected.status === "cancelled" && (cancelReason || cancelNotes) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-1">
                  <p className="text-red-300 text-xs font-semibold uppercase tracking-wider mb-2">Motivo de cancelación</p>
                  {cancelReason && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">Motivo:</span>
                      <span className="text-white/80 text-sm font-medium">{CANCELLATION_LABELS[cancelReason] || cancelReason}</span>
                    </div>
                  )}
                  {cancelNotes && (
                    <div className="flex items-start gap-2">
                      <span className="text-white/40 text-xs mt-0.5">Notas:</span>
                      <span className="text-white/70 text-sm">{cancelNotes}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="glass-card rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1">Paciente</p>
                <p className="text-white font-semibold">{fullName(selected.patient)}</p>
                <p className="text-white/50 text-xs">{selected.patient?.document_number} · {selected.patient?.phone}</p>
              </div>

              <div className={`grid grid-cols-2 gap-4 ${frozen ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <label className="text-white/40 text-xs mb-1.5 block">Especialista</label>
                  <select value={editForm.specialist_id} onChange={(e) => setEditForm({ ...editForm, specialist_id: e.target.value })} className="form-input text-sm" disabled={frozen}>
                    <option value="" className="bg-slate-900">Seleccionar...</option>
                    {specialists.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">{fullName(s)} — {s.specialty}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1.5 block">Servicio</label>
                  <select value={editForm.service_id} onChange={(e) => setEditForm({ ...editForm, service_id: e.target.value })} className="form-input text-sm" disabled={frozen}>
                    <option value="" className="bg-slate-900">Seleccionar...</option>
                    {services.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} — {formatCOP(s.price)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1.5 block">Fecha y hora inicio</label>
                  <input type="datetime-local" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} className="form-input text-sm" disabled={frozen} />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1.5 block">Fecha y hora fin</label>
                  <input type="datetime-local" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} className="form-input text-sm" disabled={frozen} />
                </div>
              </div>

              {selected.notes && <div className="glass-card rounded-xl p-4"><p className="text-white/40 text-xs mb-1">Notas</p><p className="text-white/80 text-sm">{selected.notes}</p></div>}

              {!frozen && (
                <div>
                  <p className="text-white/40 text-xs mb-2">Cambiar estado</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map((s) => {
                      const isCurrent = selected.status === s;
                      const allowed   = canTransition(selected.status, s);
                      return (
                        <Btn key={s} size="sm" variant={editForm.status === s ? "primary" : "secondary"}
                          disabled={saving || (!isCurrent && !allowed)}
                          onClick={() => { if (allowed) handleStatusChange(selected.id, s, selected.status); }}>
                          {statusLabel(s)}
                        </Btn>
                      );
                    })}
                  </div>
                  <p className="text-white/25 text-xs mt-2">
                    {selected.status === "pending"   && "Pendiente → solo puede pasar a Aprobada o Cancelada"}
                    {selected.status === "scheduled" && "Aprobada → solo puede pasar a Completada o Cancelada"}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-white/8">
                <Btn variant="secondary" onClick={() => setSelected(null)}>Cerrar</Btn>
                {!frozen && <Btn variant="primary" onClick={handleSave} disabled={saving}><Save size={14} />{saving ? "Guardando..." : "Guardar cambios"}</Btn>}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── MODAL CANCELACIÓN ── */}
      {cancelTarget && (
        <Portal>
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative z-10 bg-[#0d1526] border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">Cancelar Cita</h2>
                  <p className="text-white/40 text-xs">Esta acción no se puede deshacer</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  {reqLabel("Motivo de cancelación")}
                  <select
                    value={cancelForm.reason}
                    onChange={(e) => { setCancelForm({ ...cancelForm, reason: e.target.value }); setCancelError(""); }}
                    className={`form-input text-sm ${cancelError ? "border-red-500/50" : ""}`}
                  >
                    <option value="" className="bg-slate-900">Seleccionar motivo...</option>
                    {cancelReasons.map((r) => (
                      <option key={r.code} value={r.code} className="bg-slate-900">{r.label}</option>
                    ))}
                  </select>
                  {cancelError && <p className="text-red-400 text-xs mt-1">{cancelError}</p>}
                  {cancelForm.reason && (
                    <p className="text-white/30 text-xs mt-1 italic">
                      {cancelReasons.find((r) => r.code === cancelForm.reason)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-white/50 text-xs mb-1">Notas adicionales <span className="text-white/30">(opcional)</span></p>
                  <textarea rows={3} value={cancelForm.notes}
                    onChange={(e) => setCancelForm({ ...cancelForm, notes: e.target.value })}
                    placeholder="Detalles adicionales sobre la cancelación..."
                    className="form-input text-sm resize-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/8">
                <Btn variant="secondary" onClick={() => setCancelTarget(null)} disabled={savingCancel}>
                  Volver
                </Btn>
                <Btn variant="danger" onClick={handleConfirmCancel} disabled={savingCancel}>
                  <XCircle size={14} />
                  {savingCancel ? "Cancelando..." : "Confirmar cancelación"}
                </Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── MODAL HISTORIA CLÍNICA ── */}
      {historiaAppt && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setHistoriaAppt(null)} />
            <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><FileText size={16} className="text-white" /></div>
                  <div><h2 className="text-white font-bold">Nueva Historia Clínica</h2><p className="text-white/40 text-xs">{fullName(historiaAppt.patient)} · {formatDate(historiaAppt.start_time)}</p></div>
                </div>
                <button onClick={() => setHistoriaAppt(null)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">×</button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                <div>{reqLabel("Diagnóstico")}<textarea rows={3} value={historiaForm.diagnosis} onChange={(e) => setHistoriaForm({ ...historiaForm, diagnosis: e.target.value })} placeholder="Describe el diagnóstico..." className="form-input text-sm resize-none" /></div>
                <div>{reqLabel("Tratamiento realizado")}<textarea rows={3} value={historiaForm.treatment} onChange={(e) => setHistoriaForm({ ...historiaForm, treatment: e.target.value })} placeholder="Describe el tratamiento aplicado..." className="form-input text-sm resize-none" /></div>
                <div><p className="text-white/50 text-xs mb-1">Notas del doctor <span className="text-white/30">(opcional)</span></p><textarea rows={2} value={historiaForm.doctor_notes} onChange={(e) => setHistoriaForm({ ...historiaForm, doctor_notes: e.target.value })} className="form-input text-sm resize-none" /></div>
                <div><p className="text-white/50 text-xs mb-1">Adjuntos <span className="text-white/30">(opcional)</span></p><input type="text" value={historiaForm.attachments} onChange={(e) => setHistoriaForm({ ...historiaForm, attachments: e.target.value })} className="form-input text-sm" /></div>
                <div><p className="text-white/50 text-xs mb-1">Próxima cita <span className="text-white/30">(opcional)</span></p><input type="datetime-local" value={historiaForm.next_appointment_date} onChange={(e) => setHistoriaForm({ ...historiaForm, next_appointment_date: e.target.value })} className="form-input text-sm" /></div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
                <Btn variant="secondary" onClick={() => setHistoriaAppt(null)}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleCreateHistoria} disabled={savingHistoria}><FileText size={14} />{savingHistoria ? "Guardando..." : "Crear Historia Clínica"}</Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── MODAL NUEVA CITA ── */}
      {showNewModal && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
            <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><Plus size={16} className="text-white" /></div>
                  <div><h2 className="text-white font-bold">Nueva Cita</h2><p className="text-white/40 text-xs">Completa los datos para agendar</p></div>
                </div>
                <button onClick={() => setShowNewModal(false)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">×</button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                <div>
                  <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">Datos del paciente</p>
                  <div className="mb-3">
                    {reqLabel("Número de Cédula")}
                    <div className="relative">
                      <input type="text" value={newForm.document_number} onChange={(e) => { setNewForm({ ...newForm, document_number: e.target.value }); setPatientStatus("idle"); setPatientLocked(false); }} onBlur={handleCedulaBlur} placeholder="Ej: 1234567890" className="form-input text-sm pr-32" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {lookingUp && <Loader2 size={14} className="text-white/40 animate-spin" />}
                        {!lookingUp && patientStatus === "found" && <span className="text-green-400 text-xs font-medium">✅ Encontrado</span>}
                        {!lookingUp && patientStatus === "new"   && <span className="text-amber-400 text-xs font-medium">⚠️ Nuevo</span>}
                      </div>
                    </div>
                    {patientStatus === "found" && <p className="text-green-400/70 text-xs mt-1">Paciente existente — datos autocompletos</p>}
                    {patientStatus === "new"   && <p className="text-amber-400/70 text-xs mt-1">Paciente nuevo — completa los datos</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{reqLabel("Nombre")}<input type="text" value={newForm.first_name} onChange={(e) => setNewForm({ ...newForm, first_name: e.target.value })} disabled={patientLocked} placeholder="Juan" className={inputClass(patientLocked)} /></div>
                    <div>{reqLabel("Apellido")}<input type="text" value={newForm.last_name} onChange={(e) => setNewForm({ ...newForm, last_name: e.target.value })} disabled={patientLocked} placeholder="Pérez" className={inputClass(patientLocked)} /></div>
                    <div>{reqLabel("Teléfono")}<input type="tel" value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} disabled={patientLocked} placeholder="3001234567" className={inputClass(patientLocked)} /></div>
                    <div><p className="text-white/50 text-xs mb-1">Email <span className="text-white/30">(opcional)</span></p><input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} disabled={patientLocked} placeholder="correo@ejemplo.com" className={inputClass(patientLocked)} /></div>
                  </div>
                </div>
                <div>
                  <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-3">Detalles de la cita</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>{reqLabel("Especialista")}<select value={newForm.specialist_id} onChange={(e) => setNewForm({ ...newForm, specialist_id: e.target.value })} className="form-input text-sm"><option value="" className="bg-slate-900">Seleccionar...</option>{specialists.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">{fullName(s)} — {s.specialty}</option>)}</select></div>
                    <div>{reqLabel("Servicio")}<select value={newForm.service_id} onChange={(e) => handleServiceChange(e.target.value)} className="form-input text-sm"><option value="" className="bg-slate-900">Seleccionar...</option>{services.map((s) => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} — {formatCOP(s.price)}</option>)}</select></div>
                    <div>{reqLabel("Fecha y hora inicio")}<input type="datetime-local" value={newForm.start_time} onChange={(e) => handleStartTimeChange(e.target.value)} className="form-input text-sm" /></div>
                    <div>
                      {reqLabel("Fecha y hora fin")}
                      <input type="datetime-local" value={newForm.end_time} onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })} className="form-input text-sm" />
                      {newForm.service_id && newForm.start_time && <p className="text-white/30 text-xs mt-1">Auto-calculado según duración del servicio</p>}
                    </div>
                  </div>
                </div>
                <div><p className="text-white/50 text-xs mb-1">Notas <span className="text-white/30">(opcional)</span></p><textarea rows={3} value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Información adicional..." className="form-input text-sm resize-none" /></div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-white/8 shrink-0">
                <Btn variant="secondary" onClick={() => setShowNewModal(false)}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleCreateAppointment} disabled={creatingAppt}><Plus size={14} />{creatingAppt ? "Creando cita..." : "Crear Cita"}</Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AdminLayout>
  );
}