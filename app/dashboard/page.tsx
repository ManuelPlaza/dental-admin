"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { StatCard, Skeleton } from "@/components/ui";
import { api, Appointment, Payment } from "@/lib/api";
import { formatCOP, formatDate, fullName, isToday, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Users, Calendar, DollarSign, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAppointments().catch(() => []),
      api.getPayments().catch(() => []),
    ]).then(([appts, pays]) => {
      setAppointments(appts);
      setPayments(pays);
      setLoading(false);
    });
  }, []);

  const totalPatients = new Set(appointments.map((a) => a.patient_id)).size;
  const thisMonth = new Date().getMonth();
  const citasDelMes = appointments.filter((a) => new Date(a.start_time).getMonth() === thisMonth).length;
  const ingresos = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendientes = appointments.filter((a) => a.status === "pending").length;
  const citasHoy = appointments.filter((a) => isToday(a.start_time));

  // Service distribution
  const serviceCount: Record<string, number> = {};
  appointments.forEach((a) => {
    const name = a.service?.name || `Servicio ${a.service_id}`;
    serviceCount[name] = (serviceCount[name] || 0) + 1;
  });
  const pieData = Object.entries(serviceCount).map(([name, value]) => ({ name, value }));

  // Monthly income chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const total = payments
      .filter((p) => {
        const pd = new Date(p.payment_date || p.created_at);
        return pd.getMonth() === m && pd.getFullYear() === y && p.status === "paid";
      })
      .reduce((s, p) => s + p.amount, 0);
    return {
      mes: d.toLocaleString("es-CO", { month: "short" }),
      ingresos: total,
    };
  });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Bienvenida a tu panel de administración</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Total Pacientes" value={totalPatients} sub="Registrados en el sistema"
              icon={<Users size={22} className="text-white" />} color="bg-gradient-to-br from-cyan-500 to-blue-600" />
            <StatCard label="Citas del Mes" value={citasDelMes} sub="Citas programadas"
              icon={<Calendar size={22} className="text-white" />} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
            <StatCard label="Ingresos del Mes" value={formatCOP(ingresos)} sub="Total recaudado"
              icon={<DollarSign size={22} className="text-white" />} color="bg-gradient-to-br from-purple-500 to-pink-600" />
            <StatCard label="Citas Pendientes" value={pendientes} sub="Por confirmar"
              icon={<Clock size={22} className="text-white" />} color="bg-gradient-to-br from-amber-500 to-orange-600" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Ingresos */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Ingresos Mensuales</h3>
          {loading ? <Skeleton className="h-48" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  formatter={(v: number) => [formatCOP(v), "Ingresos"]}
                />
                <Line type="monotone" dataKey="ingresos" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Citas por Servicio</h3>
          {loading ? <Skeleton className="h-48" /> : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-white/30 text-sm">Sin datos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Citas hoy */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Citas de Hoy</h3>
          {loading ? <Skeleton className="h-32" /> : citasHoy.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-3">
              {citasHoy.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{fullName(a.patient)}</p>
                    <p className="text-white/40 text-xs">{formatDate(a.start_time)}</p>
                  </div>
                  <span className={statusBadgeClass(a.status)}>{statusLabel(a.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos pagos */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Últimos Pagos</h3>
          {loading ? <Skeleton className="h-32" /> : payments.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No hay pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{fullName(p.patient)}</p>
                    <p className="text-white/40 text-xs">{p.service?.name}</p>
                  </div>
                  <p className="text-cyan-400 text-sm font-semibold">{formatCOP(p.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
