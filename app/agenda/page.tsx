"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Portal from "@/components/ui/Portal";
import { authFetch } from "@/lib/auth";
import { formatCOP, fullName } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Calendar, Clock,
  User, Stethoscope, RefreshCw, LayoutGrid, List,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: number;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  start_time: string;
  end_time: string;
  notes?: string;
  patient?: { first_name: string; last_name: string; document_number?: string; phone?: string };
  specialist?: { first_name: string; last_name: string; specialty?: string };
  service?: { name: string; price: number; duration_minutes: number };
}

// ── Config ────────────────────────────────────────────────────────────────────

// Only show pending + scheduled
const VISIBLE_STATUSES = new Set(["pending", "scheduled"]);

const HOUR_START = 8;   // 8 AM
const HOUR_END   = 18;  // 6 PM
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const DAYS_ES    = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── Colors ────────────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  pending: {
    bg: "bg-amber-500/20",
    border: "border-l-amber-400",
    text: "text-amber-200",
    sub: "text-amber-300/60",
    dot: "bg-amber-400",
    badge: "bg-amber-500/30 text-amber-300 border border-amber-500/30",
    glow: "shadow-amber-500/20",
    label: "Pendiente",
  },
  scheduled: {
    bg: "bg-cyan-500/20",
    border: "border-l-cyan-400",
    text: "text-cyan-100",
    sub: "text-cyan-300/60",
    dot: "bg-cyan-400",
    badge: "bg-cyan-500/30 text-cyan-300 border border-cyan-500/30",
    glow: "shadow-cyan-500/20",
    label: "Confirmada",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Parsea ISO sin conversión UTC — mismo patrón que lib/utils.ts
// "2026-03-04T10:45:00" → new Date(2026, 2, 4, 10, 45) en hora local siempre
function parseISOLocal(iso: string): Date {
  const clean = iso.replace(/Z$/, "").replace(/\.\d+$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = "00:00:00"] = clean.split("T");
  const [y, mo, d]  = datePart.split("-").map(Number);
  const [h, mi, s]  = timePart.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, s ?? 0);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function sameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function timeToMinutes(iso: string): number {
  const d = parseISOLocal(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  const d = parseISOLocal(iso);
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function AppointmentTooltip({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const st = STATUS_STYLE[appt.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative z-10 bg-[#0d1526] border border-white/12 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Colored top bar */}
          <div className={`h-1.5 w-full ${appt.status === "scheduled" ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`} />

          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate">{fullName(appt.patient)}</p>
                <p className="text-white/40 text-xs mt-0.5">{appt.patient?.document_number}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${st.badge}`}>
                {st.label}
              </span>
            </div>

            {/* Details grid */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <Clock size={14} className="text-white/30 shrink-0" />
                <span className="text-white/70 text-sm">
                  {formatTime(appt.start_time)} — {formatTime(appt.end_time)}
                </span>
              </div>
              {appt.service && (
                <div className="flex items-center gap-3">
                  <Stethoscope size={14} className="text-white/30 shrink-0" />
                  <span className="text-white/70 text-sm">
                    {appt.service.name}
                    {appt.service.price > 0 && (
                      <span className="text-cyan-400 ml-2 font-mono text-xs">{formatCOP(appt.service.price)}</span>
                    )}
                  </span>
                </div>
              )}
              {appt.specialist && (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-white/30 shrink-0" />
                  <span className="text-white/70 text-sm">
                    {fullName(appt.specialist)}
                    {appt.specialist.specialty && (
                      <span className="text-white/30 ml-1">· {appt.specialist.specialty}</span>
                    )}
                  </span>
                </div>
              )}
              {appt.patient?.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-3.5 text-center shrink-0">📞</span>
                  <span className="text-white/50 text-sm">{appt.patient.phone}</span>
                </div>
              )}
            </div>

            {appt.notes && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/8">
                <p className="text-white/40 text-xs mb-1">Notas</p>
                <p className="text-white/60 text-sm">{appt.notes}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 text-white/40 hover:text-white/70 text-sm transition-colors border border-white/8 rounded-xl hover:border-white/15"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Calendar Block ────────────────────────────────────────────────────────────

function ApptBlock({
  appt,
  topPct,
  heightPct,
  leftPct,
  widthPct,
  onClick,
}: {
  appt: Appointment;
  topPct: number;
  heightPct: number;
  leftPct: number;
  widthPct: number;
  onClick: () => void;
}) {
  const st = STATUS_STYLE[appt.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
  const isShort = heightPct < 4;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${fullName(appt.patient)} — ${appt.service?.name ?? ""}`}
      className={`absolute rounded-lg border-l-2 ${st.bg} ${st.border} cursor-pointer
        hover:brightness-125 hover:scale-[1.02] transition-all duration-150 overflow-hidden px-2 py-1
        shadow-md ${st.glow} select-none z-10`}
      style={{
        top: `${topPct}%`,
        height: `${Math.max(heightPct, 2.5)}%`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
    >
      {isShort ? (
        <p className={`text-[10px] font-semibold truncate ${st.text}`}>{fullName(appt.patient)}</p>
      ) : (
        <>
          <p className={`text-xs font-semibold truncate leading-tight ${st.text}`}>{fullName(appt.patient)}</p>
          <p className={`text-[10px] truncate mt-0.5 ${st.sub}`}>{appt.service?.name ?? "Cita"}</p>
          {heightPct > 6 && (
            <p className={`text-[10px] mt-0.5 ${st.sub} font-mono`}>{formatTime(appt.start_time)}</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  appointments,
  onSelectAppt,
}: {
  weekStart: Date;
  appointments: Appointment[];
  onSelectAppt: (a: Appointment) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const totalMins = (HOUR_END - HOUR_START) * 60;

  // Group appointments by day, compute overlap layout
  const apptsByDay = days.map((day) => {
    const dayAppts = appointments.filter((a) => sameDay(parseISOLocal(a.start_time), day));
    // Simple overlap: sort by start, assign columns
    const columns: Appointment[][] = [];
    dayAppts.forEach((appt) => {
      const startMins = timeToMinutes(appt.start_time);
      const endMins   = timeToMinutes(appt.end_time);
      let placed = false;
      for (const col of columns) {
        const lastEnd = timeToMinutes(col[col.length - 1].end_time);
        if (startMins >= lastEnd) { col.push(appt); placed = true; break; }
      }
      if (!placed) columns.push([appt]);
    });
    return { day, columns };
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/8 shrink-0">
        <div />
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          return (
            <div key={i} className="text-center py-3 border-l border-white/5 first:border-l-0">
              <p className="text-white/40 text-xs uppercase tracking-wider">{DAYS_ES[day.getDay()]}</p>
              <div className={`mx-auto mt-1 w-8 h-8 rounded-full flex items-center justify-center
                ${isToday ? "bg-cyan-500 text-white font-bold" : "text-white/70"} text-sm`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">

          {/* Hour labels */}
          <div className="col-start-1">
            {HOURS.map((h) => (
              <div key={h} className="h-16 flex items-start justify-end pr-3 pt-0.5">
                <span className="text-white/25 text-[11px]">{h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {apptsByDay.map(({ day, columns }, di) => {
            const isToday = sameDay(day, today);
            const totalCols = columns.length || 1;

            return (
              <div key={di} className={`border-l border-white/5 relative ${isToday ? "bg-cyan-500/[0.03]" : ""}`}>
                {/* Hour lines */}
                {HOURS.map((h, hi) => (
                  <div key={h} className="h-16 border-t border-white/5 relative">
                    {/* Half-hour dashed line */}
                    <div className="absolute top-1/2 left-0 right-0 border-t border-white/[0.03] border-dashed" />
                  </div>
                ))}

                {/* Appointments */}
                {columns.map((col, ci) =>
                  col.map((appt) => {
                    const startMins = timeToMinutes(appt.start_time) - HOUR_START * 60;
                    const endMins   = timeToMinutes(appt.end_time)   - HOUR_START * 60;
                    const topPct    = (startMins / totalMins) * 100;
                    const heightPct = ((endMins - startMins) / totalMins) * 100;
                    const gap       = 2; // 2% gap between columns
                    const colW      = (100 - gap * (totalCols - 1)) / totalCols;
                    const leftPct   = ci * (colW + gap) + 1;
                    const widthPct  = colW - 2;

                    return (
                      <ApptBlock
                        key={appt.id}
                        appt={appt}
                        topPct={topPct}
                        heightPct={heightPct}
                        leftPct={leftPct}
                        widthPct={widthPct}
                        onClick={() => onSelectAppt(appt)}
                      />
                    );
                  })
                )}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowMins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
                  if (nowMins < 0 || nowMins > totalMins) return null;
                  const topPct = (nowMins / totalMins) * 100;
                  return (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${topPct}%` }}>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        <div className="flex-1 h-px bg-red-400/70" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({
  appointments,
  onSelectAppt,
}: {
  appointments: Appointment[];
  onSelectAppt: (a: Appointment) => void;
}) {
  // Group by date
  const byDate: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    const key = parseISOLocal(a.start_time).toDateString();
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });

  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const today = new Date();

  if (sortedDates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <Calendar size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">No hay citas pendientes ni confirmadas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 pr-1">
      {sortedDates.map((dateStr) => {
        const date = parseISOLocal(dateStr + 'T00:00:00');
        const isToday = sameDay(date, today);
        const dayAppts = byDate[dateStr].sort(
          (a, b) => parseISOLocal(a.start_time).getTime() - parseISOLocal(b.start_time).getTime()
        );

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex flex-col items-center w-12 h-12 rounded-xl justify-center shrink-0
                ${isToday ? "bg-cyan-500 shadow-lg shadow-cyan-500/30" : "bg-white/5 border border-white/8"}`}>
                <span className={`text-[10px] uppercase font-semibold ${isToday ? "text-cyan-100" : "text-white/40"}`}>
                  {DAYS_ES[date.getDay()]}
                </span>
                <span className={`text-lg font-bold leading-tight ${isToday ? "text-white" : "text-white/70"}`}>
                  {date.getDate()}
                </span>
              </div>
              <div>
                <p className={`font-semibold text-sm ${isToday ? "text-cyan-400" : "text-white/60"}`}>
                  {isToday ? "Hoy" : `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`}
                </p>
                <p className="text-white/30 text-xs">{dayAppts.length} cita{dayAppts.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 h-px bg-white/5 ml-2" />
            </div>

            {/* Appointments */}
            <div className="space-y-2 pl-15" style={{ paddingLeft: "60px" }}>
              {dayAppts.map((appt) => {
                const st = STATUS_STYLE[appt.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
                return (
                  <div
                    key={appt.id}
                    onClick={() => onSelectAppt(appt)}
                    className={`flex items-start gap-4 p-4 rounded-2xl border-l-2 ${st.bg} ${st.border}
                      cursor-pointer hover:brightness-125 transition-all group shadow-sm ${st.glow}`}
                  >
                    {/* Time */}
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-bold font-mono ${st.text}`}>{formatTime(appt.start_time)}</p>
                      <p className={`text-xs ${st.sub}`}>{formatTime(appt.end_time)}</p>
                    </div>

                    {/* Dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${st.dot}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold text-sm truncate ${st.text}`}>{fullName(appt.patient)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${st.badge}`}>{st.label}</span>
                      </div>
                      <p className="text-white/50 text-xs">{appt.service?.name ?? "Cita dental"}</p>
                      {appt.specialist && (
                        <p className="text-white/30 text-xs mt-0.5">{fullName(appt.specialist)}</p>
                      )}
                    </div>

                    {/* Price */}
                    {appt.service?.price && appt.service.price > 0 && (
                      <p className="text-cyan-400 font-mono text-xs shrink-0 self-center">{formatCOP(appt.service.price)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode]         = useState<"week" | "list">("week");
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Fetch all — filter pending+scheduled client-side
      const res = await authFetch(`${BASE}/appointments`);
      if (res.ok) {
        const all: Appointment[] = await res.json();
        setAppointments(all.filter((a) => VISIBLE_STATUSES.has(a.status)));
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter appointments for current week view
  const weekEnd = addDays(weekStart, 6);
  const weekAppts = appointments.filter((a) => {
    const d = parseISOLocal(a.start_time);
    return d >= weekStart && d <= weekEnd;
  });

  // Stats
  const pendingCount   = appointments.filter((a) => a.status === "pending").length;
  const scheduledCount = appointments.filter((a) => a.status === "scheduled").length;
  const today = new Date();
  const todayCount = appointments.filter((a) => sameDay(parseISOLocal(a.start_time), today)).length;

  const weekLabel = `${weekStart.getDate()} ${MONTHS_ES[weekStart.getMonth()]} — ${weekEnd.getDate()} ${MONTHS_ES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 lg:-m-8">

        {/* ── Header ── */}
        <div className="px-6 lg:px-8 pt-6 pb-4 border-b border-white/8 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">

            {/* Title + stats */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Calendar size={17} className="text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">Mi Agenda</h1>
                  <p className="text-white/40 text-xs">Citas pendientes y confirmadas</p>
                </div>
              </div>

              {/* Legend + stats */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-amber-400/80 border-l-2 border-amber-400" />
                  <span className="text-white/50 text-xs">Pendiente</span>
                  <span className="text-amber-400 font-bold text-sm ml-1">{pendingCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-cyan-400/80 border-l-2 border-cyan-400" />
                  <span className="text-white/50 text-xs">Confirmada</span>
                  <span className="text-cyan-400 font-bold text-sm ml-1">{scheduledCount}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-white/30 text-xs">Hoy: <span className="text-white/60 font-medium">{todayCount}</span></span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

              {/* View toggle */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/8">
                <button onClick={() => setViewMode("week")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all
                    ${viewMode === "week" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
                  <LayoutGrid size={13} /> Semana
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all
                    ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
                  <List size={13} /> Lista
                </button>
              </div>

              {/* Week navigation */}
              {viewMode === "week" && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setWeekStart((w) => addDays(w, -7))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all border border-white/8">
                    <ChevronLeft size={15} />
                  </button>
                  <button onClick={() => setWeekStart(startOfWeek(new Date()))}
                    className="px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-all border border-white/8">
                    Hoy
                  </button>
                  <button onClick={() => setWeekStart((w) => addDays(w, 7))}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all border border-white/8">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Refresh */}
              <button onClick={() => load(true)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all border border-white/8"
                title="Actualizar">
                <RefreshCw size={14} className={refreshing ? "animate-spin text-cyan-400" : ""} />
              </button>
            </div>
          </div>

          {/* Week label */}
          {viewMode === "week" && (
            <p className="text-white/30 text-xs mt-3 font-medium">{weekLabel}</p>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-h-0 overflow-hidden px-6 lg:px-8 py-4 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                  <Calendar size={18} className="text-white" />
                </div>
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            </div>
          ) : viewMode === "week" ? (
            <WeekView
              weekStart={weekStart}
              appointments={weekAppts}
              onSelectAppt={setSelectedAppt}
            />
          ) : (
            <ListView
              appointments={appointments}
              onSelectAppt={setSelectedAppt}
            />
          )}
        </div>
      </div>

      {/* ── Tooltip modal ── */}
      {selectedAppt && (
        <AppointmentTooltip appt={selectedAppt} onClose={() => setSelectedAppt(null)} />
      )}
    </AdminLayout>
  );
}