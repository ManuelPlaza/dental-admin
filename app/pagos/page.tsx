"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { formatCOP, formatDateShort, fullName } from "@/lib/utils";
import { CreditCard, DollarSign, Save } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

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
    patient?: { id: number; first_name: string; last_name: string; document_number?: string; };
    historical_price?: number;
    service?: { name: string };
  };
  // Balance computed after fetch
  _balance?: Balance;
}

const METHOD_LABELS: Record<string, string> = {
  pending: "Pendiente",
  cash: "Efectivo",
  nequi: "Nequi",
  loyalty: "Puntos de fidelidad",
};

function paymentStatusInfo(balance?: Balance): { label: string; cls: string } {
  if (!balance) return { label: "Pendiente", cls: "badge-cancelled" };
  if (balance.status === "PAID")    return { label: "Pagado",   cls: "badge-completed" };
  if (balance.status === "PARTIAL") return { label: "Parcial",  cls: "badge-pending" };
  return { label: "Pendiente", cls: "badge-cancelled" };
}

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

export default function PagosPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [toast, setToast]       = useState<Toast | null>(null);

  // Balances por appointment_id
  const [balances, setBalances] = useState<Record<number, Balance>>({});

  // Modal pago
  const [payModal, setPayModal] = useState<PaymentRecord | null>(null);
  const [payForm, setPayForm]   = useState({ amount: "", method: "cash", reference_code: "", notes: "" });
  const [savingPay, setSavingPay] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadBalance = async (appointmentId: number) => {
    try {
      const r = await fetch(`${BASE}/appointments/${appointmentId}/balance`);
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
      const r = await fetch(`${BASE}/payments`);
      const data: PaymentRecord[] = r.ok ? await r.json() : [];
      setPayments(data);
      // Load balances for all unique appointment_ids
      const ids = [...new Set(data.map((p) => p.appointment_id))];
      await Promise.all(ids.map(loadBalance));
    } catch { setPayments([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPayments(); }, []);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return !q || fullName(p.appointment?.patient).toLowerCase().includes(q) ||
      p.appointment?.patient?.document_number?.includes(q);
  });

  // Group by appointment — show latest per appointment
  const byAppointment = filtered.reduce<Record<number, PaymentRecord>>((acc, p) => {
    if (!acc[p.appointment_id] || new Date(p.payment_date) > new Date(acc[p.appointment_id].payment_date)) {
      acc[p.appointment_id] = p;
    }
    return acc;
  }, {});

  const rows = Object.values(byAppointment).sort((a, b) =>
    new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  const handleRegisterPay = async () => {
    if (!payModal) return;
    if (!payForm.amount || Number(payForm.amount) <= 0) { showToast("Ingresa un monto válido", "error"); return; }
    if (payForm.method === "nequi" && !payForm.reference_code.trim()) { showToast("El código de referencia es obligatorio para Nequi", "error"); return; }
    setSavingPay(true);
    try {
      const body: Record<string, unknown> = {
        appointment_id: payModal.appointment_id,
        amount: Number(payForm.amount),
        method: payForm.method,
        ...(payForm.reference_code.trim() && { reference_code: payForm.reference_code.trim() }),
        ...(payForm.notes.trim() && { notes: payForm.notes.trim() }),
      };
      const res = await fetch(`${BASE}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      showToast("Pago registrado correctamente", "success");
      setPayModal(null);
      setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
      await loadPayments();
    } catch { showToast("Error al registrar el pago", "error"); }
    finally { setSavingPay(false); }
  };

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
        <Table
          headers={["Paciente", "Valor cita", "Pagado", "Saldo", "Método", "Estado", "Fecha", "Acción"]}
          empty={rows.length === 0}
        >
          {rows.map((p) => {
            const bal     = balances[p.appointment_id];
            const total   = bal?.total_cost   ?? p.appointment?.historical_price ?? 0;
            const paid    = bal?.total_paid   ?? p.amount ?? 0;
            const pending = bal?.pending_balance ?? (total - paid);
            const si      = paymentStatusInfo(bal);
            const isPaid  = bal?.status === "PAID" || pending <= 0;

            return (
              <TR key={p.id}>
                <TD>
                  <p className="font-medium text-white">{fullName(p.appointment?.patient)}</p>
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
                <TD>
                  <Btn
                    size="sm"
                    variant={isPaid ? "ghost" : "secondary"}
                    disabled={isPaid}
                    onClick={() => {
                      setPayModal(p);
                      setPayForm({ amount: "", method: "cash", reference_code: "", notes: "" });
                    }}
                  >
                    <DollarSign size={12} />
                    {isPaid ? "Pagado" : "Registrar Pago"}
                  </Btn>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {rows.length === 0 && !loading && (
        <EmptyState icon={<CreditCard size={40} />} message="No se encontraron pagos" />
      )}

      {/* ── MODAL REGISTRAR PAGO ── */}
      {payModal && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPayModal(null)} />
            <div className="relative z-10 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <DollarSign size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">Registrar Pago</h2>
                    <p className="text-white/40 text-xs">{fullName(payModal.appointment?.patient)}</p>
                  </div>
                </div>
                <button onClick={() => setPayModal(null)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center text-xl leading-none transition-all">
                  ×
                </button>
              </div>

              {/* Balance info */}
              {(() => {
                const bal     = balances[payModal.appointment_id];
                const total   = bal?.total_cost   ?? payModal.appointment?.historical_price ?? 0;
                const paid    = bal?.total_paid   ?? payModal.amount ?? 0;
                const pending = bal?.pending_balance ?? (total - paid);
                return (
                  <div className="mx-6 mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: "Valor total",    val: formatCOP(total),   color: "text-white" },
                      { label: "Ya pagado",      val: formatCOP(paid),    color: "text-cyan-400" },
                      { label: "Saldo restante", val: formatCOP(pending), color: pending > 0 ? "text-amber-400" : "text-green-400" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="glass-card rounded-xl p-3 text-center">
                        <p className="text-white/40 text-[10px] mb-1">{label}</p>
                        <p className={`font-semibold text-sm font-mono ${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Form */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-white/50 text-xs mb-1">Monto a pagar <span className="text-red-400">*</span></p>
                  <input
                    type="number" min="0"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    placeholder="Ej: 60000"
                    className="form-input text-sm font-mono"
                  />
                </div>

                <div>
                  <p className="text-white/50 text-xs mb-1">Método de pago <span className="text-red-400">*</span></p>
                  <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value, reference_code: "" })}
                    className="form-input text-sm">
                    <option value="cash"    className="bg-slate-900">Efectivo</option>
                    <option value="nequi"   className="bg-slate-900">Nequi</option>
                    <option value="loyalty" className="bg-slate-900">Puntos de fidelidad</option>
                  </select>
                </div>

                {payForm.method === "nequi" && (
                  <div>
                    <p className="text-white/50 text-xs mb-1">Código de referencia <span className="text-red-400">*</span></p>
                    <input
                      type="text"
                      value={payForm.reference_code}
                      onChange={(e) => setPayForm({ ...payForm, reference_code: e.target.value })}
                      placeholder="Ej: NEQ-123456"
                      className="form-input text-sm font-mono"
                    />
                  </div>
                )}

                <div>
                  <p className="text-white/50 text-xs mb-1">Notas <span className="text-white/30">(opcional)</span></p>
                  <textarea rows={2} value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="Observaciones del pago..." className="form-input text-sm resize-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-white/8">
                <Btn variant="secondary" onClick={() => setPayModal(null)}>Cancelar</Btn>
                <Btn variant="primary" onClick={handleRegisterPay} disabled={savingPay}>
                  <Save size={14} />{savingPay ? "Guardando..." : "Registrar Pago"}
                </Btn>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AdminLayout>
  );
}