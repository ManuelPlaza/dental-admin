"use client";

import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { formatCOP, formatDateShort, formatDate, fullName } from "@/lib/utils";
import { CreditCard, DollarSign, Save, ChevronRight, Copy, Check, Link2, X } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE = `${API_URL}/api/v1`;

// ── Types ──────────────────────────────────────────────────────────────────────
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
    status?: string;
    patient?: { id: number; first_name: string; last_name: string; document_number?: string; phone?: string };
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

interface PaymentLink {
  id: number;
  token: string;
  amount: number;
  phone_number: string;
  status: "pending" | "paid" | "expired" | "rejected" | "cancelled";
  expires_at: string;
  payment_url: string;
}

const METHOD_LABELS: Record<string, string> = {
  pending: "Pendiente", cash: "Efectivo", nequi: "Nequi", loyalty: "Puntos de fidelidad",
};

const METHOD_ICONS: Record<string, string> = {
  pending: "⏳", cash: "💵", nequi: "📱", loyalty: "⭐",
};

function paymentStatusInfo(balance?: Balance): { label: string; cls: string } {
  if (!balance) return { label: "Pendiente", cls: "badge-cancelled" };
  if (balance.status === "PAID") return { label: "Pagado", cls: "badge-completed" };
  if (balance.status === "PARTIAL") return { label: "Parcial", cls: "badge-pending" };
  return { label: "Pendiente", cls: "badge-cancelled" };
}

function linkStatusBadge(status: PaymentLink["status"]): { label: string; cls: string } {
  switch (status) {
    case "pending":   return { label: "Pendiente", cls: "bg-amber-500/15 border border-amber-500/30 text-amber-400" };
    case "paid":      return { label: "Pagado",    cls: "bg-green-500/15 border border-green-500/30 text-green-400" };
    case "expired":   return { label: "Expirado",  cls: "bg-white/5 border border-white/10 text-white/35" };
    case "rejected":  return { label: "Rechazado", cls: "bg-red-500/15 border border-red-500/30 text-red-400" };
    case "cancelled": return { label: "Cancelado", cls: "bg-white/5 border border-white/10 text-white/35" };
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cls = toast.type === "success"
    ? "bg-green-500/20 border-green-500/30 text-green-300"
    : "bg-red-500/20 border-red-500/30 text-red-300";
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border ${cls}`}>
        {toast.type === "success" ? "✅" : "❌"} {toast.msg}
      </div>
    </Portal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PagosPage() {
  const [payments, setPayments]           = useState<PaymentRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [toast, setToast]                 = useState<Toast | null>(null);
  const [balances, setBalances]           = useState<Record<number, Balance>>({});
  const [detailRecord, setDetailRecord]   = useState<PaymentRecord | null>(null);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPayForm, setShowPayForm]     = useState(false);
  const [payForm, setPayForm]             = useState({ amount: "", method: "cash", reference_code: "", notes: "" });
  const [savingPay, setSavingPay]         = useState(false);

  // Nequi payment link state
  const [nequiLinks, setNequiLinks]           = useState<PaymentLink[]>([]);
  const [nequiLinksLoading, setNequiLinksLoading] = useState(false);
  const [showNequiForm, setShowNequiForm]     = useState(false);
  const [nequiForm, setNequiForm]             = useState({ amount: "", phone: "" });
  const [generatingLink, setGeneratingLink]   = useState(false);
  const [activeLink, setActiveLink]           = useState<PaymentLink | null>(null);
  const [cancellingLink, setCancellingLink]   = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [secondsLeft, setSecondsLeft]         = useState(0);

  // Ref to avoid stale closure in polling
  const detailRecordRef = useRef<PaymentRecord | null>(null);
  useEffect(() => { detailRecordRef.current = detailRecord; }, [detailRecord]);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  // ── Balance & data loaders ──────────────────────────────────────────────────
  const loadBalance = async (appointmentId: number) => {
    try {
      const r = await authFetch(`${BASE}/appointments/${appointmentId}/balance`);
      if (r.ok) {
        const b: Balance = await r.json();
        setBalances((prev) => ({ ...prev, [appointmentId]: b }));
        return b;
      }
    } catch { }
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

  const loadNequiLinks = async (appointmentId: number) => {
    setNequiLinksLoading(true);
    try {
      const r = await authFetch(`${BASE}/appointments/${appointmentId}/payment-links`);
      if (r.ok) {
        const links: PaymentLink[] = await r.json();
        setNequiLinks(links);
        // Set the most recent pending link as active (if any)
        const pending = links.find((l) => l.status === "pending");
        setActiveLink(pending ?? null);
      } else {
        setNequiLinks([]);
        setActiveLink(null);
      }
    } catch { setNequiLinks([]); setActiveLink(null); }
    finally { setNequiLinksLoading(false); }
  };

  useEffect(() => { loadPayments(); }, []);

  // ── Countdown for active pending link ──────────────────────────────────────
  useEffect(() => {
    if (!activeLink || activeLink.status !== "pending") { setSecondsLeft(0); return; }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(activeLink.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) setActiveLink((prev) => prev ? { ...prev, status: "expired" } : null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeLink?.expires_at, activeLink?.status]);

  // ── Polling for pending link status ────────────────────────────────────────
  useEffect(() => {
    if (!activeLink || activeLink.status !== "pending") return;
    const poll = async () => {
      try {
        const r = await fetch(`${BASE}/pay/${activeLink.token}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.status !== "pending") {
          setActiveLink((prev) => prev ? { ...prev, status: data.status } : null);
          setNequiLinks((prev) => prev.map((l) => l.token === activeLink.token ? { ...l, status: data.status } : l));
          if (data.status === "paid") {
            showToast("¡Pago recibido por Nequi!", "success");
            const rec = detailRecordRef.current;
            if (rec) await Promise.all([loadBalance(rec.appointment_id), loadHistory(rec.appointment_id), loadPayments()]);
          }
        }
      } catch { }
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [activeLink?.token, activeLink?.status]);

  // ── Modal open/close ───────────────────────────────────────────────────────
  const openDetail = (record: PaymentRecord) => {
    setDetailRecord(record);
    setShowPayForm(false);
    setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
    setShowNequiForm(false);
    setActiveLink(null);
    setNequiLinks([]);
    loadHistory(record.appointment_id);
    loadBalance(record.appointment_id);
    loadNequiLinks(record.appointment_id);
  };

  const closeDetail = () => {
    setDetailRecord(null);
    setHistory([]);
    setShowPayForm(false);
    setShowNequiForm(false);
    setActiveLink(null);
    setNequiLinks([]);
  };

  // ── Register traditional payment ───────────────────────────────────────────
  const handleRegisterPay = async () => {
    if (!detailRecord) return;
    if (!payForm.amount || Number(payForm.amount) <= 0) { showToast("Ingresa un monto válido", "error"); return; }
    if (payForm.method === "nequi" && !payForm.reference_code.trim()) { showToast("El código de referencia es obligatorio para Nequi", "error"); return; }
    setSavingPay(true);
    try {
      const body = {
        appointment_id: detailRecord.appointment_id,
        amount: Number(payForm.amount),
        method: payForm.method,
        reference_code: payForm.reference_code.trim(),
        notes: payForm.notes.trim(),
      };
      const res = await authFetch(`${BASE}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast("Pago registrado correctamente", "success");
      setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
      setShowPayForm(false);
      await Promise.all([loadHistory(detailRecord.appointment_id), loadBalance(detailRecord.appointment_id), loadPayments()]);
    } catch { showToast("Error al registrar el pago", "error"); }
    finally { setSavingPay(false); }
  };

  // ── Generate Nequi link ────────────────────────────────────────────────────
  const handleGenerateLink = async () => {
    if (!detailRecord) return;
    const amt = Number(nequiForm.amount);
    if (!amt || amt <= 0) { showToast("Ingresa un monto válido", "error"); return; }
    if (detailPending > 0 && amt > detailPending) { showToast("El monto no puede superar el saldo pendiente", "error"); return; }
    if (!nequiForm.phone.trim()) { showToast("Ingresa el número de celular", "error"); return; }
    setGeneratingLink(true);
    try {
      const res = await authFetch(`${BASE}/appointments/${detailRecord.appointment_id}/payment-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, phone_number: nequiForm.phone.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || err.message || "Error al generar el link", "error");
        return;
      }
      const link: PaymentLink = await res.json();
      setActiveLink(link);
      setNequiLinks((prev) => [link, ...prev]);
      setShowNequiForm(false);
      showToast("Link de pago generado", "success");
    } catch { showToast("Error de conexión", "error"); }
    finally { setGeneratingLink(false); }
  };

  // ── Cancel Nequi link ──────────────────────────────────────────────────────
  const handleCancelLink = async () => {
    if (!activeLink) return;
    setCancellingLink(true);
    try {
      const res = await authFetch(`${BASE}/payment-links/${activeLink.token}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setActiveLink(null);
      setNequiLinks((prev) => prev.map((l) => l.token === activeLink.token ? { ...l, status: "cancelled" } : l));
      showToast("Link cancelado", "success");
    } catch { showToast("Error al cancelar el link", "error"); }
    finally { setCancellingLink(false); }
  };

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!activeLink) return;
    navigator.clipboard.writeText(activeLink.payment_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Derived data ───────────────────────────────────────────────────────────
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

  const detailBal     = detailRecord ? balances[detailRecord.appointment_id] : undefined;
  const detailTotal   = detailBal?.total_cost ?? detailRecord?.appointment?.historical_price ?? 0;
  const detailPaid    = detailBal?.total_paid ?? 0;
  const detailPending = detailBal?.pending_balance ?? (detailTotal - detailPaid);
  const detailSI      = paymentStatusInfo(detailBal);
  const detailIsPaid  = detailBal?.status === "PAID" || detailPending <= 0;

  const canGenerateLink = detailPending > 0 && !activeLink;

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
            const total   = bal?.total_cost ?? p.appointment?.historical_price ?? 0;
            const paid    = bal?.total_paid ?? p.amount ?? 0;
            const pending = bal?.pending_balance ?? (total - paid);
            const si      = paymentStatusInfo(bal);
            return (
              <tr key={p.id} onClick={() => openDetail(p)} className="cursor-pointer group hover:bg-white/5 transition-colors border-b border-white/5">
                <td className="p-4">
                  <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">{fullName(p.appointment?.patient)}</p>
                  <p className="text-white/40 text-xs">{p.appointment?.patient?.document_number}</p>
                </td>
                <td className="p-4 text-white/70 font-mono text-sm">{formatCOP(total)}</td>
                <td className="p-4 text-cyan-400 font-mono text-sm">{formatCOP(paid)}</td>
                <td className={`p-4 font-mono text-sm font-semibold ${pending > 0 ? "text-amber-400" : "text-green-400"}`}>
                  {pending > 0 ? formatCOP(pending) : "—"}
                </td>
                <td className="p-4 text-white/50 text-xs">{METHOD_LABELS[p.method] || p.method}</td>
                <td className="p-4"><span className={`badge ${si.cls}`}>{si.label}</span></td>
                <td className="p-4 text-white/40 text-xs">{formatDateShort(p.payment_date)}</td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Btn size="sm" variant="ghost" onClick={() => openDetail(p)}>
                    <ChevronRight size={12} /> Ver
                  </Btn>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {rows.length === 0 && !loading && (
        <EmptyState icon={<CreditCard size={40} />} message="No se encontraron pagos" />
      )}

      {/* ── Detail Modal ── */}
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

              <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/8">

                  {/* ── Left: payment info ── */}
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest">Información del pago</p>
                    <div className="bg-white/3 rounded-xl p-4 border border-white/5">
                      <p className="text-white/40 text-xs mb-1">Paciente</p>
                      <p className="text-white font-semibold">{fullName(detailRecord.appointment?.patient)}</p>
                      <p className="text-white/40 text-xs mt-0.5">{detailRecord.appointment?.patient?.document_number}</p>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: "Servicio", val: detailRecord.appointment?.service?.name || "—" },
                        { label: "Especialista", val: detailRecord.appointment?.specialist ? fullName(detailRecord.appointment.specialist) : "—" },
                        { label: "Método último pago", val: `${METHOD_ICONS[detailRecord.method] || ""} ${METHOD_LABELS[detailRecord.method] || detailRecord.method}` },
                        { label: "Último pago", val: formatDate(detailRecord.payment_date) },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <span className="text-white/40 text-xs shrink-0">{label}</span>
                          <span className="text-white/80 text-xs text-right">{val}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/40 text-xs">Estado</span>
                        <span className={`badge ${detailSI.cls}`}>{detailSI.label}</span>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="bg-white/3 rounded-xl p-4 border border-white/5">
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
                    </div>

                    {/* Register payment button */}
                    {!detailIsPaid && !showPayForm && (
                      <div className="w-full flex justify-center">
                        <Btn variant="primary" onClick={() => setShowPayForm(true)}>
                          <DollarSign size={14} /> Registrar Pago
                        </Btn>
                      </div>
                    )}

                    {/* Register payment form */}
                    {showPayForm && (
                      <div className="bg-white/3 rounded-xl p-4 border border-white/8 space-y-3">
                        <div>
                          <p className="text-white/50 text-xs mb-1">Monto <span className="text-red-400">*</span></p>
                          <input type="number" min="0" value={payForm.amount}
                            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                            placeholder="Ej: 90000" className="form-input text-sm" />
                        </div>
                        <div>
                          <p className="text-white/50 text-xs mb-2">Método de pago <span className="text-red-400">*</span></p>
                          <div className="flex flex-col gap-2">
                            {[
                              { value: "cash", label: "💵 Efectivo" },
                              { value: "nequi", label: "📱 Nequi" },
                              { value: "loyalty_points", label: "⭐ Puntos de fidelidad" },
                            ].map(({ value, label }) => (
                              <label key={value} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all
                                ${payForm.method === value ? "bg-cyan-500/10 border-cyan-500/40 text-white" : "bg-white/3 border-white/8 text-white/50 hover:border-white/20"}`}>
                                <input type="radio" name="payment_method" value={value} checked={payForm.method === value}
                                  onChange={() => setPayForm({ ...payForm, method: value, reference_code: "" })} className="sr-only" />
                                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${payForm.method === value ? "border-cyan-400" : "border-white/20"}`}>
                                  {payForm.method === value && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                                </span>
                                <span className="text-sm">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {payForm.method === "nequi" && (
                          <div>
                            <p className="text-white/50 text-xs mb-1">Código de referencia <span className="text-red-400">*</span></p>
                            <input type="text" autoComplete="off" value={payForm.reference_code}
                              onChange={(e) => setPayForm({ ...payForm, reference_code: e.target.value })}
                              placeholder="Ej: NEQ-123456" className="form-input text-sm" />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Btn variant="secondary" onClick={() => setShowPayForm(false)} disabled={savingPay}>Cancelar</Btn>
                          <Btn variant="primary" onClick={handleRegisterPay} disabled={savingPay}>
                            <Save size={13} />{savingPay ? "Registrando..." : "Registrar pago"}
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Right: history + Nequi links ── */}
                  <div className="px-6 py-5 flex flex-col gap-6">

                    {/* Historial de pagos */}
                    <div>
                      <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest mb-4">Historial de pagos</p>
                      {historyLoading ? <Skeleton className="h-20 w-full" /> : (
                        <div className="space-y-2">
                          {history.length === 0 && <p className="text-white/25 text-xs">Sin pagos registrados</p>}
                          {history.map((entry) => (
                            <div key={entry.id} className="bg-white/3 border border-white/5 rounded-xl p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-white font-mono text-sm">{formatCOP(entry.amount)}</span>
                                <span className="text-white/30 text-[10px]">{formatDateShort(entry.payment_date)}</span>
                              </div>
                              <p className="text-white/35 text-xs mt-0.5">{METHOD_LABELS[entry.method] || entry.method}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Link de Pago Nequi ── */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white/30 text-[11px] font-semibold uppercase tracking-widest">Link de Pago Nequi</p>
                        {canGenerateLink && !showNequiForm && (
                          <Btn variant="secondary" size="sm" onClick={() => {
                            setNequiForm({
                              amount: detailPending > 0 ? String(Math.round(detailPending)) : "",
                              phone: detailRecord.appointment?.patient?.phone || "",
                            });
                            setShowNequiForm(true);
                          }}>
                            <Link2 size={12} /> Generar Link
                          </Btn>
                        )}
                      </div>

                      {/* Nequi form */}
                      {showNequiForm && (
                        <div className="bg-white/3 rounded-xl p-4 border border-white/8 space-y-3 mb-3">
                          <div>
                            <p className="text-white/50 text-xs mb-1">Monto <span className="text-red-400">*</span></p>
                            <input type="number" min="0" value={nequiForm.amount}
                              onChange={(e) => setNequiForm({ ...nequiForm, amount: e.target.value })}
                              placeholder="Ej: 90000" className="form-input text-sm" />
                            {detailPending > 0 && (
                              <p className="text-white/25 text-[10px] mt-1">Saldo pendiente: {formatCOP(detailPending)}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-white/50 text-xs mb-1">Número de celular <span className="text-red-400">*</span></p>
                            <input type="text" autoComplete="off" value={nequiForm.phone}
                              onChange={(e) => setNequiForm({ ...nequiForm, phone: e.target.value })}
                              placeholder="Ej: 3001234567" className="form-input text-sm" />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Btn variant="secondary" size="sm" onClick={() => setShowNequiForm(false)} disabled={generatingLink}>Cancelar</Btn>
                            <Btn variant="primary" size="sm" onClick={handleGenerateLink} disabled={generatingLink}>
                              <Link2 size={12} />{generatingLink ? "Generando..." : "Generar"}
                            </Btn>
                          </div>
                        </div>
                      )}

                      {/* Active pending link */}
                      {activeLink && activeLink.status === "pending" && (
                        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">Link activo</span>
                            <span className="text-amber-400 font-mono text-sm font-bold">
                              {secondsLeft > 0 ? `Expira en ${formatCountdown(secondsLeft)}` : "Expirado"}
                            </span>
                          </div>
                          <div>
                            <p className="text-white/40 text-[10px] mb-1">URL de pago</p>
                            <div className="flex items-center gap-2">
                              <code className="text-white/60 text-xs bg-white/5 rounded-lg px-2 py-1.5 flex-1 truncate">{activeLink.payment_url}</code>
                              <button onClick={handleCopy}
                                className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">{formatCOP(activeLink.amount)} · {activeLink.phone_number}</span>
                            <Btn variant="danger" size="sm" onClick={handleCancelLink} disabled={cancellingLink}>
                              <X size={11} />{cancellingLink ? "Cancelando..." : "Cancelar link"}
                            </Btn>
                          </div>
                        </div>
                      )}

                      {/* Paid link confirmation */}
                      {activeLink && activeLink.status === "paid" && (
                        <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-4 mb-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                            <span className="text-lg">✅</span>
                          </div>
                          <div>
                            <p className="text-green-400 font-semibold text-sm">¡Pago recibido!</p>
                            <p className="text-white/40 text-xs">{formatCOP(activeLink.amount)} via Nequi</p>
                          </div>
                        </div>
                      )}

                      {/* Links history */}
                      {nequiLinksLoading ? <Skeleton className="h-12 w-full" /> : (
                        <div className="space-y-1.5">
                          {nequiLinks.filter((l) => l.token !== activeLink?.token || activeLink.status !== "pending").map((l) => {
                            const { label, cls } = linkStatusBadge(l.status);
                            return (
                              <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-white/3 border border-white/5 rounded-xl">
                                <span className="text-white/60 font-mono text-xs">{formatCOP(l.amount)}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!nequiLinksLoading && nequiLinks.length === 0 && !showNequiForm && (
                        <p className="text-white/25 text-xs">Sin links generados</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
