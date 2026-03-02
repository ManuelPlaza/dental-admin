"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { formatCOP, formatDateShort, formatDate, fullName } from "@/lib/utils";
import { CreditCard, DollarSign, Save, Clock, ChevronRight, CheckCircle, Circle } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

// ── Types ────────────────────────────────────────────────────────────────────

interface Toast { msg: string; type: "success" | "error"; }

interface Balance {
  total_cost: number;
  total_paid: number;
  pending_balance: number;
  status: "PAID" | "PARTIAL" | "PENDING";
}

interface PaymentRecord {
  id: number;
  appointment_id: number;
  amount: number;
  method: string;
  reference_code?: string;
  notes?: string;
  payment_date: string;
  appointment?: {
    patient?: { id: number; first_name: string; last_name: string; document_number?: string };
    historical_price?: number;
    service?: { name: string };
    specialist?: { first_name: string; last_name: string };
  };
}

interface HistoryEntry {
  id: number;
  appointment_id: number;
  amount: number;
  method: string;
  reference_code?: string;
  notes?: string;
  payment_date: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  pending: "Pendiente",
  cash: "Efectivo",
  nequi: "Nequi",
  loyalty: "Puntos de fidelidad",
};

const METHOD_ICONS: Record<string, string> = {
  pending: "⏳", cash: "💵", nequi: "📱", loyalty: "⭐",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function paymentStatusInfo(balance?: Balance): { label: string; cls: string } {
  if (!balance) return { label: "Pendiente", cls: "badge-cancelled" };
  if (balance.status === "PAID")    return { label: "Pagado",   cls: "badge-completed" };
  if (balance.status === "PARTIAL") return { label: "Parcial",  cls: "badge-pending" };
  return { label: "Pendiente", cls: "badge-cancelled" };
}

// ── Toast ────────────────────────────────────────────────────────────────────

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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PagosPage() {
  const [payments, setPayments]   = useState<PaymentRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [toast, setToast]         = useState<Toast | null>(null);
  const [balances, setBalances]   = useState<Record<number, Balance>>({});

  // Detail modal state
  const [detailRecord, setDetailRecord] = useState<PaymentRecord | null>(null);
  const [history, setHistory]           = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Register payment form (embedded in detail modal)
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm]         = useState({ amount: "", method: "cash", reference_code: "", notes: "" });
  const [savingPay, setSavingPay]     = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBalance = async (appointmentId: number) => {
    try {
      const r = await authFetch(`${BASE}/appointments/${appointmentId}/balance`);
      if (r.ok) {
        const b: Balance = await r.json();
        setBalances((prev) => ({ ...prev, [appointmentId]: b }));
        return b;
      }
    } catch {}
    return null;
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const r = await authFetch(`${BASE}/payments`);
      const data: PaymentRecord[] = r.ok ? await r.json() : [];
      setPayments(data);
      const ids = [...new Set(data.map((p) => p.appointment_id))];
      await Promise.all(ids.map(loadBalance));
    } catch { setPayments([]); }
    finally { setLoading(false); }
  };

  const loadHistory = async (appointmentId: number) => {
    setHistoryLoading(true);
    try {
      const r = await authFetch(`${BASE}/appointments/${appointmentId}/payments`);
      if (r.ok) setHistory(await r.json());
      else setHistory([]);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => { loadPayments(); }, []);

  // ── Open detail modal ────────────────────────────────────────────────────

  const openDetail = (record: PaymentRecord) => {
    setDetailRecord(record);
    setShowPayForm(false);
    setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
    loadHistory(record.appointment_id);
    // Refresh balance on open
    loadBalance(record.appointment_id);
  };

  const closeDetail = () => {
    setDetailRecord(null);
    setHistory([]);
    setShowPayForm(false);
  };

  // ── Register payment ──────────────────────────────────────────────────────

  const handleRegisterPay = async () => {
    if (!detailRecord) return;
    if (!payForm.amount || Number(payForm.amount) <= 0) { showToast("Ingresa un monto válido", "error"); return; }
    if (payForm.method === "nequi" && !payForm.reference_code.trim()) { showToast("El código de referencia es obligatorio para Nequi", "error"); return; }
    setSavingPay(true);
    try {
      const body: Record<string, unknown> = {
        appointment_id: detailRecord.appointment_id,
        amount: Number(payForm.amount),
        method: payForm.method,
        ...(payForm.reference_code.trim() && { reference_code: payForm.reference_code.trim() }),
        ...(payForm.notes.trim() && { notes: payForm.notes.trim() }),
      };
      const res = await authFetch(`${BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast("Pago registrado correctamente", "success");
      setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
      setShowPayForm(false);
      // Refresh history + balances
      await Promise.all([loadHistory(detailRecord.appointment_id), loadBalance(detailRecord.appointment_id), loadPayments()]);
    } catch { showToast("Error al registrar el pago", "error"); }
    finally { setSavingPay(false); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return !q || fullName(p.appointment?.patient).toLowerCase().includes(q) ||
      p.appointment?.patient?.document_number?.includes(q);
  });

  const byAppointment = filtered.reduce<Record<number, PaymentRecord>>((acc, p) => {
    if (!acc[p.appointment_id] || new Date(p.payment_date) > new Date(acc[p.appointment_id].payment_date)) {
      acc[p.appointment_id] = p;
    }
    return acc;
  }, {});

  const rows = Object.values(byAppointment).sort((a, b) =>
    new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  // Detail modal computed values
  const detailBal     = detailRecord ? balances[detailRecord.appointment_id] : undefined;
  const detailTotal   = detailBal?.total_cost   ?? detailRecord?.appointment?.historical_price ?? 0;
  const detailPaid    = detailBal?.total_paid   ?? 0;
  const detailPending = detailBal?.pending_balance ?? (detailTotal - detailPaid);
  const detailPct     = detailTotal > 0 ? Math.min(100, Math.round((detailPaid / detailTotal) * 100)) : 0;
  const detailSI      = paymentStatusInfo(detailBal);
  const detailIsPaid  = detailBal?.status === "PAID" || detailPending <= 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader title="Pagos" subtitle="Gestión de pagos y cobros" />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por paciente o cédula..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Paciente", "Valor cita", "Pagado", "Saldo", "Método", "Estado", "Fecha", "Acción"]} empty={rows.length === 0}>
          {rows.map((p) => {
            const bal     = balances[p.appointment_id];
            const total   = bal?.total_cost    ?? p.appointment?.historical_price ?? 0;
            const paid    = bal?.total_paid    ?? p.amount ?? 0;
            const pending = bal?.pending_balance ?? (total - paid);
            const si      = paymentStatusInfo(bal);
            const isPaid  = bal?.status === "PAID" || pending <= 0;

            return (
              <TR key={p.id} onClick={() => openDetail(p)} className="cursor-pointer group">
                <TD>
                  <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">{fullName(p.appointment?.patient)}</p>
                  <p className="text-white/40 text-xs">{p.appointment?.patient?.document_number}</p>
                </TD>
                <TD className="text-white/70 font-mono text-sm">{formatCOP(total)}</TD>
                <TD className="text-cyan-400 font-mono text-sm">{formatCOP(paid)}</TD>
                <TD className={`font-mono text-sm font-semibold ${pending > 0 ? "text-amber-400" : "text-green-400"}`}>
                  {pending > 0 ? formatCOP(pending) : "—"}
                </TD>
                <TD className="text-white/50 text-xs">{METHOD_LABELS[p.method] || p.method}</TD>
                <TD><span className={`badge ${si.cls}`}>{si.label}</span></TD>
                <TD className="text-white/40 text-xs">{formatDateShort(p.payment_date)}</TD>
                <TD onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Btn size="sm" variant="ghost" onClick={() => openDetail(p)}>
                      <ChevronRight size={12} /> Ver
                    </Btn>
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {rows.length === 0 && !loading && (
        <EmptyState icon={<CreditCard size={40} />} message="No se encontraron pagos" />
      )}

      {/* ── MODAL DETALLE PAGO ── */}
      {detailRecord && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeDetail} />
            <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "90vh" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Detalle de Pago</h2>
                    <p className="text-white/40 text-xs">{fullName(detailRecord.appointment?.patient)} · Cita #{detailRecord.appointment_id}</p>
                  </div>
                </div>
                <button onClick={closeDetail} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">×</button>
              </div>

              {/* Body — two columns */}
              <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/8">

                  {/* ── LEFT: Detalle del registro ── */}
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest">Información del pago</p>

                    {/* Paciente */}
                    <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                      <p className="text-white/40 text-xs mb-1">Paciente</p>
                      <p className="text-white font-semibold">{fullName(detailRecord.appointment?.patient)}</p>
                      <p className="text-white/40 text-xs mt-0.5">{detailRecord.appointment?.patient?.document_number}</p>
                    </div>

                    {/* Detalles */}
                    <div className="space-y-2.5">
                      {[
                        { label: "Servicio",          val: detailRecord.appointment?.service?.name || "—" },
                        { label: "Especialista",       val: detailRecord.appointment?.specialist ? fullName(detailRecord.appointment.specialist) : "—" },
                        { label: "Método último pago", val: `${METHOD_ICONS[detailRecord.method] || ""} ${METHOD_LABELS[detailRecord.method] || detailRecord.method}` },
                        { label: "Último pago",        val: formatDate(detailRecord.payment_date) },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <span className="text-white/40 text-xs shrink-0">{label}</span>
                          <span className="text-white/80 text-xs text-right">{val}</span>
                        </div>
                      ))}
                      {detailRecord.reference_code && (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-white/40 text-xs shrink-0">Referencia</span>
                          <span className="text-cyan-400 text-xs font-mono">{detailRecord.reference_code}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/40 text-xs">Estado</span>
                        <span className={`badge ${detailSI.cls}`}>{detailSI.label}</span>
                      </div>
                    </div>

                    {detailRecord.notes && (
                      <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                        <p className="text-white/40 text-xs mb-1">Notas</p>
                        <p className="text-white/70 text-xs">{detailRecord.notes}</p>
                      </div>
                    )}

                    {/* Balance visual */}
                    <div className="bg-white/3 rounded-xl p-4 border border-white/5 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-white/40 text-[10px] mb-0.5">Valor total</p>
                          <p className="text-white font-semibold text-sm font-mono">{formatCOP(detailTotal)}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] mb-0.5">Pagado</p>
                          <p className="text-cyan-400 font-semibold text-sm font-mono">{formatCOP(detailPaid)}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px] mb-0.5">Saldo</p>
                          <p className={`font-semibold text-sm font-mono ${detailPending > 0 ? "text-amber-400" : "text-green-400"}`}>
                            {detailPending > 0 ? formatCOP(detailPending) : "—"}
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between text-xs text-white/30 mb-1.5">
                          <span>Progreso de pago</span>
                          <span className={detailPct >= 100 ? "text-green-400" : "text-cyan-400"}>{detailPct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${detailPct >= 100 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                            style={{ width: `${detailPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Register payment button */}
                    {!detailIsPaid && !showPayForm && (
                      <Btn variant="primary" onClick={() => setShowPayForm(true)} className="w-full justify-center">
                        <DollarSign size={14} /> Registrar Pago
                      </Btn>
                    )}

                    {/* Inline pay form */}
                    {showPayForm && !detailIsPaid && (
                      <div className="bg-white/3 rounded-xl p-4 border border-white/8 space-y-3">
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Nuevo pago</p>
                        <div>
                          <p className="text-white/40 text-xs mb-1">Monto <span className="text-red-400">*</span></p>
                          <input type="number" min="0" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="Ej: 60000" className="form-input text-sm font-mono" />
                        </div>
                        <div>
                          <p className="text-white/40 text-xs mb-1">Método <span className="text-red-400">*</span></p>
                          <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value, reference_code: "" })} className="form-input text-sm">
                            <option value="cash" className="bg-slate-900">Efectivo</option>
                            <option value="nequi" className="bg-slate-900">Nequi</option>
                            <option value="loyalty" className="bg-slate-900">Puntos de fidelidad</option>
                          </select>
                        </div>
                        {payForm.method === "nequi" && (
                          <div>
                            <p className="text-white/40 text-xs mb-1">Código de referencia <span className="text-red-400">*</span></p>
                            <input type="text" value={payForm.reference_code} onChange={(e) => setPayForm({ ...payForm, reference_code: e.target.value })} placeholder="NEQ-123456" className="form-input text-sm font-mono" />
                          </div>
                        )}
                        <div>
                          <p className="text-white/40 text-xs mb-1">Notas <span className="text-white/20">(opcional)</span></p>
                          <textarea rows={2} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Observaciones..." className="form-input text-sm resize-none" />
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="secondary" onClick={() => setShowPayForm(false)} disabled={savingPay}>Cancelar</Btn>
                          <Btn variant="primary" onClick={handleRegisterPay} disabled={savingPay}>
                            <Save size={13} /> {savingPay ? "Guardando..." : "Confirmar"}
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── RIGHT: Timeline historial ── */}
                  <div className="px-6 py-5 flex flex-col">
                    <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-4">Historial de pagos</p>

                    {historyLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                      </div>
                    ) : history.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center py-10">
                        <p className="text-white/25 text-sm">Sin historial de pagos</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline vertical line */}
                        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-white/10" />

                        <div className="space-y-4">
                          {history.map((entry, idx) => {
                            const isFirst = idx === 0;
                            const isLast  = idx === history.length - 1;
                            const isPending = entry.amount === 0;
                            const isPaid    = !isPending;

                            return (
                              <div key={entry.id} className="flex gap-4 relative">
                                {/* Timeline dot */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2
                                  ${isPending
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                    : isLast
                                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                                      : "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                  }`}>
                                  {isPending
                                    ? <Clock size={12} />
                                    : isLast
                                      ? <CheckCircle size={12} />
                                      : <Circle size={12} />
                                  }
                                </div>

                                {/* Entry card */}
                                <div className={`flex-1 rounded-xl p-3 border mb-1 transition-all
                                  ${isPending
                                    ? "bg-amber-500/5 border-amber-500/15"
                                    : "bg-white/3 border-white/5"
                                  }`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className={`font-semibold text-sm font-mono ${isPending ? "text-amber-400" : "text-white"}`}>
                                      {isPending ? "Pendiente" : formatCOP(entry.amount)}
                                    </span>
                                    <span className="text-white/30 text-[10px] shrink-0">{formatDateShort(entry.payment_date)}</span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    <span className="text-white/50 text-xs">
                                      {METHOD_ICONS[entry.method] || ""} {METHOD_LABELS[entry.method] || entry.method}
                                    </span>
                                    {entry.reference_code && (
                                      <span className="text-cyan-400/70 text-xs font-mono">{entry.reference_code}</span>
                                    )}
                                  </div>

                                  {entry.notes && (
                                    <p className="text-white/30 text-[11px] mt-1 italic">{entry.notes}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Summary below timeline */}
                        <div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-2 gap-3">
                          <div className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                            <p className="text-white/40 text-[10px] mb-1">Total pagado</p>
                            <p className="text-cyan-400 font-semibold text-sm font-mono">{formatCOP(detailPaid)}</p>
                          </div>
                          <div className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                            <p className="text-white/40 text-[10px] mb-1">Saldo pendiente</p>
                            <p className={`font-semibold text-sm font-mono ${detailPending > 0 ? "text-amber-400" : "text-green-400"}`}>
                              {detailPending > 0 ? formatCOP(detailPending) : "Saldado ✓"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end px-6 py-4 border-t border-white/8 shrink-0">
                <Btn variant="secondary" onClick={closeDetail}>Cerrar</Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AdminLayout>
  );
}