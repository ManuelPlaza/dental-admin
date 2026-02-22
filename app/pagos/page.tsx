"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton } from "@/components/ui";
import { api, Payment } from "@/lib/api";
import { formatCOP, formatDateShort, fullName, statusBadgeClass, statusLabel } from "@/lib/utils";
import { CreditCard } from "lucide-react";

const STATUS_OPTIONS = [
  { label: "Todos los estados", value: "all" },
  { label: "Pagado", value: "paid" },
  { label: "Pendiente", value: "pending" },
  { label: "Reembolsado", value: "refunded" },
];

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    api.getPayments().catch(() => []).then(setPayments).finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      fullName(p.patient).toLowerCase().includes(q) ||
      p.service?.name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalFiltered = filtered
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <AdminLayout>
      <PageHeader title="Pagos" subtitle="Gestión de pagos y transacciones" />

      {/* Total card */}
      <div className="glass-card rounded-2xl p-5 flex items-center gap-4 mb-6 border-l-4 border-green-500">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Total Ingresos (Filtrados)</p>
          <p className="text-white text-2xl font-bold">{formatCOP(totalFiltered)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por paciente o servicio..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/70 text-sm rounded-xl px-4 py-2.5 cursor-pointer shrink-0"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Paciente", "Servicio", "Monto", "Fecha", "Método", "Estado"]} empty={filtered.length === 0}>
          {filtered.map((p) => (
            <TR key={p.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center text-green-400 text-xs font-bold shrink-0">
                    {p.patient?.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-white">{fullName(p.patient)}</span>
                </div>
              </TD>
              <TD className="text-white/60">{p.service?.name || "—"}</TD>
              <TD className="text-cyan-400 font-semibold">{formatCOP(p.amount)}</TD>
              <TD className="text-white/60">{formatDateShort(p.payment_date || p.created_at)}</TD>
              <TD className="text-white/60">{p.payment_method || "—"}</TD>
              <TD><span className={statusBadgeClass(p.status)}>{statusLabel(p.status)}</span></TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<CreditCard size={40} />} message="No se encontraron pagos" />
      )}
    </AdminLayout>
  );
}
