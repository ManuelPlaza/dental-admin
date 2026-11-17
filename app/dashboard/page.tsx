"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Skeleton } from "@/components/ui";
import { formatCOP, formatDateShort, fullName, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Calendar, ArrowRight } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { authFetch, useAuth } from "@/lib/auth";
import AmbassadorsCard from "@/components/dashboard/AmbassadorsCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

// Paleta de marca para gráficos: turquesa, azul marino, dorado, y neutros.
const COLORS = ["#0E7490", "#1E3A5F", "#B8960C", "#64748B", "#15803D", "#B45309", "#B91C1C", "#0891B2"];
const AXIS = { fill: "#64748B", fontSize: 12 };

// Altura común del cuerpo de cada tarjeta para mantener las filas alineadas.
const PANEL_H = "h-[260px]";

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

// "2025-09" → "sep 2025"
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

const timeFromISO = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

// ── Tooltips de gráficos ──
const TipShell = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div className="bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm shadow-pop">
    {label && <p className="text-ink/65 text-xs mb-0.5">{label}</p>}
    {children}
  </div>
);

const IncomeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return <TipShell label={label}><p className="text-accent-strong font-semibold tabular">{formatCOP(payload[0].value)}</p></TipShell>;
};

const CancelTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return <TipShell label={label}><p className="text-red-700 font-semibold">{payload[0].value} cancelaciones</p></TipShell>;
};

const ReasonTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: entry } = payload[0];
  return (
    <TipShell label={name}>
      <p className="font-semibold" style={{ color: entry?.color }}>{value} {value === 1 ? "caso" : "casos"}</p>
    </TipShell>
  );
};

const BAR_CURSOR  = { fill: "rgba(15,23,42,0.05)" };
const LINE_CURSOR = { stroke: "rgba(15,23,42,0.2)", strokeWidth: 1 };

// ── Tarjeta con título ──
function Panel({ title, meta, className = "", children }: {
  title: string; meta?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`glass-card rounded-xl p-5 min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-ink font-semibold text-base truncate">{title}</h2>
        {meta && <span className="text-ink/60 text-xs shrink-0">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="py-14 flex items-center justify-center text-ink/60 text-sm text-center px-4">{children}</div>
);

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData]           = useState<DashboardData | null>(null);
  const [totalPatients, setTotal] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [topReferrers, setTopReferrers] = useState<Array<{ document_number: string; name: string; referral_count: number }>>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      authFetch(`${BASE}/dashboard`).then((r) => {
        if (!r.ok) throw new Error("Dashboard fetch failed");
        return r.json();
      }),
      authFetch(`${BASE}/patients`).then((r) => {
        if (!r.ok) throw new Error("Patients fetch failed");
        return r.json();
      }).catch(() => []),
      authFetch(`${BASE}/admin/referrals/top?limit=10`).then((r) => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([dash, patients, referrers]) => {
        setData(dash);
        setTotal(Array.isArray(patients) ? patients.length : 0);
        setTopReferrers(Array.isArray(referrers) ? referrers : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-ink/65 text-sm animate-pulse">Verificando sesión…</p>
        </div>
      </AdminLayout>
    );
  }
  if (!user) return null;

  // ── Datos derivados ──
  const lastMonthIncome = data?.monthly_income?.length
    ? data.monthly_income[data.monthly_income.length - 1].total
    : 0;

  const incomeChartData = (data?.monthly_income || []).map((m) => ({ mes: formatMonth(m.month), ingresos: m.total }));

  const cancelByMonth: Record<string, number> = {};
  (data?.cancellations || []).forEach(({ month, count }) => {
    cancelByMonth[month] = (cancelByMonth[month] || 0) + count;
  });
  const cancelChartData = Object.entries(cancelByMonth).map(([month, total]) => ({ mes: formatMonth(month), total }));

  const reasonCounts: Record<string, number> = {};
  (data?.cancellations || []).forEach(({ reason, count }) => {
    reasonCounts[reason] = (reasonCounts[reason] || 0) + count;
  });
  const cancelPieData = Object.entries(reasonCounts).map(([reason, value], i) => ({
    name: CANCELLATION_LABELS[reason] || reason, value, color: COLORS[i % COLORS.length],
  }));

  const maxCitas = Math.max(...(data?.top_patients || []).map((p) => p.total_citas), 1);
  const maxReferrals = Math.max(...topReferrers.map((r) => r.referral_count), 1);

  const today = [...(data?.today || [])].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const pending = data?.summary?.pending ?? 0;
  const firstName = user.name?.split(" ")[0] || "";
  const todayLabel = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  const summaryRows = [
    { label: "Pacientes registrados", value: totalPatients },
    { label: "Citas este mes",        value: data?.summary?.total ?? 0 },
    { label: "Completadas",           value: data?.summary?.completed ?? 0 },
    { label: "Ingresos del último mes", value: formatCOP(lastMonthIncome) },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-[1.75rem] font-semibold tracking-tight text-ink leading-tight">
          Hola{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-ink/65 text-sm mt-1 first-letter:uppercase">{todayLabel}</p>
      </div>

      {/* ── Fila 1: lo de hoy (2/3) + resumen (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Panel
          className="lg:col-span-2"
          title="Citas de hoy"
          meta={loading ? undefined : `${today.length} ${today.length === 1 ? "cita" : "citas"}`}
        >
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : !today.length ? (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
              <Calendar size={28} className="text-ink/35" aria-hidden="true" />
              <p className="text-ink/75 text-sm font-medium">No hay citas para hoy</p>
              <Link href="/citas" className="text-accent-strong text-sm font-medium hover:underline underline-offset-4 inline-flex items-center gap-1 min-h-[44px]">
                Ver todas las citas <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className={`max-h-[260px] overflow-y-auto divide-y divide-line -my-1`}>
              {today.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <div className="w-[5.75rem] shrink-0 tabular whitespace-nowrap">
                    <p className="text-ink font-semibold text-sm leading-tight">{timeFromISO(a.start_time)}</p>
                    <p className="text-ink/60 text-xs">{timeFromISO(a.end_time)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink font-medium text-sm truncate">{fullName(a.patient)}</p>
                    <p className="text-ink/65 text-xs truncate">{a.specialist.first_name} {a.specialist.last_name} · {a.specialist.specialty}</p>
                  </div>
                  <span className={`badge ${statusBadgeClass(a.status)} shrink-0`}>{statusLabel(a.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Resumen del mes">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : (
            <div className="flex flex-col gap-4">
              {pending > 0 && (
                <Link
                  href="/citas"
                  className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-600/25 px-4 min-h-[48px] text-amber-900 text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  <span>{pending} {pending === 1 ? "cita por confirmar" : "citas por confirmar"}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
              <dl className="divide-y divide-line">
                {summaryRows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 py-3 first:pt-0">
                    <dt className="text-ink/70 text-sm">{r.label}</dt>
                    <dd className="text-ink font-semibold text-base tabular text-right">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Fila 2: ingresos + últimos pagos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Panel className="lg:col-span-2" title="Ingresos mensuales">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : !incomeChartData.length ? (
            <Empty>Aún no hay ingresos registrados.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={incomeChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="mes" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCOPShort} tick={AXIS} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<IncomeTooltip />} cursor={LINE_CURSOR} />
                <Line type="monotone" dataKey="ingresos" stroke="#0E7490" strokeWidth={2.5} dot={{ fill: "#0E7490", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Últimos pagos">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : !data?.recent_payments?.length ? (
            <Empty>Sin pagos recientes</Empty>
          ) : (
            <ul className={`max-h-[260px] overflow-y-auto divide-y divide-line -my-1`}>
              {data.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate">{fullName(p.appointment?.patient)}</p>
                    <p className="text-ink/65 text-xs truncate">{formatDateShort(p.payment_date)} · {METHOD_LABELS[p.method] || p.method}</p>
                  </div>
                  {p.amount === 0 ? (
                    <span className="badge badge-pending shrink-0">Pendiente</span>
                  ) : (
                    <p className="text-ink font-semibold text-sm tabular shrink-0">{formatCOP(p.amount)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Fila 3: seguimiento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Panel title="Cancelaciones por mes">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : cancelChartData.length === 0 ? (
            <Empty>Sin datos de cancelaciones</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cancelChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="mes" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip content={<CancelTooltip />} cursor={BAR_CURSOR} />
                <Bar dataKey="total" fill="#B91C1C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Motivos de cancelación">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : cancelPieData.length === 0 ? (
            <Empty>Sin cancelaciones</Empty>
          ) : (
            <div className={`${PANEL_H} flex flex-col`}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={cancelPieData} cx="50%" cy="50%" outerRadius={66} innerRadius={38}
                    dataKey="value" paddingAngle={2} stroke="none">
                    {cancelPieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ReasonTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 overflow-y-auto space-y-1.5 mt-2 min-h-0">
                {cancelPieData.map(({ name, value, color }) => (
                  <li key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                    <span className="text-ink/75 truncate flex-1">{name}</span>
                    <span className="text-ink font-semibold tabular">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Pacientes frecuentes" meta="por citas">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : !data?.top_patients?.length ? (
            <Empty>Sin datos</Empty>
          ) : (
            <ol className={`max-h-[260px] overflow-y-auto space-y-3.5`}>
              {data.top_patients.map((p, i) => (
                <li key={p.patient_id}>
                  <div className="flex items-baseline gap-2.5 mb-1.5">
                    <span className="text-ink/55 text-xs font-semibold w-4 tabular shrink-0">{i + 1}</span>
                    <p className="text-ink text-sm font-medium truncate flex-1 min-w-0">{p.first_name} {p.last_name}</p>
                    <span className="text-ink font-semibold text-sm tabular shrink-0">{p.total_citas}</span>
                  </div>
                  <div className="ml-6 h-1.5 bg-ink/[0.07] rounded-full overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(p.total_citas / maxCitas) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* ── Fila 4: referidos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Quién más refiere" meta="referidos directos">
          {loading ? <Skeleton className={`${PANEL_H} rounded-lg`} /> : topReferrers.length === 0 ? (
            <Empty>Aún no hay referidos registrados.</Empty>
          ) : (
            <ol className={`max-h-[260px] overflow-y-auto space-y-3.5`}>
              {topReferrers.map((r, i) => (
                <li key={r.document_number}>
                  <div className="flex items-baseline gap-2.5 mb-1.5">
                    <span className="text-ink/55 text-xs font-semibold w-4 tabular shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink text-sm font-medium truncate">{r.name || "Paciente"}</p>
                      <p className="text-ink/60 text-xs truncate tabular">CC {r.document_number}</p>
                    </div>
                    <span className="text-ink font-semibold text-sm tabular shrink-0">{r.referral_count}</span>
                  </div>
                  <div className="ml-6 h-1.5 bg-ink/[0.07] rounded-full overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(r.referral_count / maxReferrals) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <AmbassadorsCard bodyHeight="max-h-[260px]" />
      </div>
    </AdminLayout>
  );
}
