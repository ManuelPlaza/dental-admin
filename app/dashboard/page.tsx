"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { StatCard, Skeleton } from "@/components/ui";
import { formatCOP, formatDateShort, fullName, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Users, Calendar, DollarSign, Clock, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#84cc16"];

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

const METHOD_LABELS: Record<string, string> = {
  pending: "Pendiente", cash: "Efectivo", nequi: "Nequi", loyalty: "Puntos",
};

interface DashboardData {
  summary: { total: number; pending: number; scheduled: number; completed: number; cancelled: number };
  today: Array<{ id: number; start_time: string; end_time: string; status: string; patient: { first_name: string; last_name: string }; specialist: { first_name: string; last_name: string; specialty: string } }>;
  monthly_income: Array<{ month: string; total: number }>;
  cancellations: Array<{ month: string; count: number; reason: string }>;
  top_patients: Array<{ patient_id: number; first_name: string; last_name: string; document: string; total_citas: number }>;
  recent_payments: Array<{ id: number; amount: number; method: string; payment_date: string; appointment: { historical_price: number; patient: { first_name: string; last_name: string }; specialist: { first_name: string; last_name: string } } }>;
}

// Format "2025-09" → "Sep 2025"
const formatMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("es-CO", { month: "short", year: "numeric" });
};

const formatCOPShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

// ── Tooltip personalizado ──
const IncomeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-cyan-400 font-semibold">{formatCOP(payload[0].value)}</p>
    </div>
  );
};

const CancelTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-red-400 font-semibold">{payload[0].value} cancelaciones</p>
    </div>
  );
};

// ── Hora local de ISO ──
const timeFromISO = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
};

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [totalPatients, setTotal] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/dashboard`).then((r) => r.json()),
      fetch(`${BASE}/patients`).then((r) => r.json()).catch(() => []),
    ]).then(([dash, patients]) => {
      setData(dash);
      setTotal(Array.isArray(patients) ? patients.length : 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Derived data ──
  const lastMonthIncome = data?.monthly_income?.length
    ? data.monthly_income[data.monthly_income.length - 1].total
    : 0;

  const incomeChartData = (data?.monthly_income || []).map((m) => ({
    mes: formatMonth(m.month),
    ingresos: m.total,
  }));

  // Agrupar cancelaciones por mes
  const cancelByMonth: Record<string, number> = {};
  (data?.cancellations || []).forEach(({ month, count }) => {
    cancelByMonth[month] = (cancelByMonth[month] || 0) + count;
  });
  const cancelChartData = Object.entries(cancelByMonth).map(([month, total]) => ({
    mes: formatMonth(month), total,
  }));

  // Pie de servicios — usando cancellations por motivo como proxy si no hay service data
  const reasonCounts: Record<string, number> = {};
  (data?.cancellations || []).forEach(({ reason, count }) => {
    reasonCounts[reason] = (reasonCounts[reason] || 0) + count;
  });
  const cancelPieData = Object.entries(reasonCounts).map(([reason, value]) => ({
    name: CANCELLATION_LABELS[reason] || reason, value,
  }));

  // Top patients max
  const maxCitas = Math.max(...(data?.top_patients || []).map((p) => p.total_citas), 1);

  const statusOrder = ["scheduled", "pending", "completed", "cancelled"];
  const summaryCards = [
    { label: "Total Pacientes",   value: totalPatients,           sub: "Registrados",      icon: <Users      size={22} className="text-white" />, color: "bg-gradient-to-br from-cyan-500 to-blue-600" },
    { label: "Citas del Mes",     value: data?.summary.total ?? 0, sub: "Programadas",     icon: <Calendar   size={22} className="text-white" />, color: "bg-gradient-to-br from-violet-500 to-purple-600" },
    { label: "Ingresos del Mes",  value: formatCOP(lastMonthIncome), sub: "Último mes",    icon: <DollarSign size={22} className="text-white" />, color: "bg-gradient-to-br from-green-500 to-emerald-600" },
    { label: "Citas Pendientes",  value: data?.summary.pending ?? 0, sub: "Por confirmar", icon: <Clock      size={22} className="text-white" />, color: "bg-gradient-to-br from-amber-500 to-orange-500" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Bienvenida a tu panel de administración</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : summaryCards.map((c) => (
              <div key={c.label} className={`${c.color} rounded-2xl p-5 flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <p className="text-white/70 text-sm font-medium">{c.label}</p>
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">{c.icon}</div>
                </div>
                <p className="text-white text-3xl font-bold tracking-tight">{c.value}</p>
                <p className="text-white/50 text-xs">{c.sub}</p>
              </div>
            ))
        }
      </div>

      {/* ── Row 1: Ingresos + Citas de Hoy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Ingresos mensuales */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">Ingresos Mensuales</h2>
          </div>
          {loading ? <Skeleton className="h-[350px] rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={incomeChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCOPShort} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<IncomeTooltip />} />
                <Line type="monotone" dataKey="ingresos" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Citas de hoy */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              <h2 className="text-white font-semibold">Citas de Hoy</h2>
            </div>
            <span className="text-white/40 text-xs">{new Date().toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
          {loading ? <Skeleton className="flex-1 rounded-xl" /> : (
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
              {!data?.today?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Calendar size={36} className="text-white/15 mb-3" />
                  <p className="text-white/40 text-sm">No hay citas programadas para hoy</p>
                </div>
              ) : data.today.map((a) => (
                <div key={a.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-white font-medium text-sm">{fullName(a.patient)}</p>
                    <span className={`badge ${statusBadgeClass(a.status)} shrink-0 text-[10px]`}>{statusLabel(a.status)}</span>
                  </div>
                  <p className="text-white/40 text-xs">{a.specialist.first_name} {a.specialist.last_name} · {a.specialist.specialty}</p>
                  <p className="text-cyan-400 text-xs mt-1 font-mono">{timeFromISO(a.start_time)} – {timeFromISO(a.end_time)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Cancelaciones + Top Pacientes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Gráfico cancelaciones */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-red-400" />
            <h2 className="text-white font-semibold">Cancelaciones por Mes</h2>
          </div>
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : cancelChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-white/30 text-sm">Sin datos de cancelaciones</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cancelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CancelTooltip />} />
                <Bar dataKey="total" fill="#ef4444" radius={[6, 6, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Desglose por motivo */}
          {!loading && (data?.cancellations?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-2 gap-1.5">
              {Object.entries(reasonCounts).map(([reason, count], i) => (
                <div key={reason} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-white/50 truncate">{CANCELLATION_LABELS[reason] || reason}</span>
                  <span className="text-white/70 ml-auto font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Pacientes */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-amber-400" />
            <h2 className="text-white font-semibold">Top Pacientes</h2>
          </div>
          {loading ? <Skeleton className="h-[300px] rounded-xl" /> : !data?.top_patients?.length ? (
            <div className="flex items-center justify-center h-[300px] text-white/30 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-4">
              {data.top_patients.slice(0, 5).map((p, i) => (
                <div key={p.patient_id}>
                  <div className="flex items-center gap-3 mb-1.5">
                    {/* Posición */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${i === 0 ? "bg-amber-500/30 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/40"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-white/30 text-xs">{p.document}</p>
                    </div>
                    <span className="text-cyan-400 font-bold text-sm shrink-0">{p.total_citas} <span className="text-white/30 text-xs font-normal">citas</span></span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="ml-9 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{ width: `${(p.total_citas / maxCitas) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Últimos Pagos + Torta distribución ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Últimos pagos */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={16} className="text-green-400" />
            <h2 className="text-white font-semibold">Últimos Pagos</h2>
          </div>
          {loading ? <Skeleton className="h-[200px] rounded-xl" /> : !data?.recent_payments?.length ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Sin pagos recientes</div>
          ) : (
            <div className="space-y-2">
              {data.recent_payments.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 bg-white/3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{fullName(p.appointment?.patient)}</p>
                    <p className="text-white/40 text-xs truncate">{fullName(p.appointment?.specialist)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {p.amount === 0 ? (
                      <span className="badge badge-pending text-xs">Pendiente</span>
                    ) : (
                      <p className="text-green-400 font-semibold text-sm font-mono">{formatCOP(p.amount)}</p>
                    )}
                    <p className="text-white/30 text-xs mt-0.5">{METHOD_LABELS[p.method] || p.method}</p>
                  </div>
                  <p className="text-white/30 text-xs shrink-0 hidden sm:block">{formatDateShort(p.payment_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribución cancelaciones por motivo (Pie) */}
        <div className="glass-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-red-400" />
            <h2 className="text-white font-semibold text-sm">Motivos de Cancelación</h2>
          </div>
          {loading ? <Skeleton className="flex-1 rounded-xl" /> : cancelPieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Sin cancelaciones</div>
          ) : (
            <div className="flex-1 flex flex-col">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={cancelPieData} cx="50%" cy="50%" outerRadius={110} innerRadius={55}
                    dataKey="value" paddingAngle={3}>
                    {cancelPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} casos`, ""]} contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {cancelPieData.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-white/50 truncate flex-1">{name}</span>
                    <span className="text-white/70 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}