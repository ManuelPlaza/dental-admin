export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

// ── Estrategia de fechas ─────────────────────────────────────────────────────
// El backend retorna fechas como "2026-03-04T10:45:00" (sin Z) o con Z.
// new Date("2026-03-04T10:45:00") en Railway (UTC) → interpreta como UTC
// → formatear con timeZone:"America/Bogota" le resta 5h → BUG.
//
// Solución: parsear manualmente con constructor LOCAL new Date(y,m,d,h,mm)
// → nunca hace conversión UTC, muestra exactamente lo que viene del backend.
// ─────────────────────────────────────────────────────────────────────────────

function parseISOLocal(dateStr: string): Date {
  const clean = dateStr.replace(/Z$/, "").replace(/\.\d+$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  const [datePart, timePart = "00:00:00"] = clean.split("T");
  const [year, month, day]  = datePart.split("-").map(Number);
  const [hour, minute, sec] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, sec ?? 0);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = parseISOLocal(dateStr);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  const d = parseISOLocal(dateStr);
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function statusLabel(status: string, cancellationReason?: string): string {
  if (status === "cancelled" && cancellationReason === "auto_expired") return "Expirada";
  const map: Record<string, string> = {
    pending:   "Pendiente",
    scheduled: "Aprobada",
    completed: "Completada",
    cancelled: "Cancelada",
    paid:      "Pagado",
    refunded:  "Reembolsado",
  };
  return map[status] ?? status;
}

export function statusBadgeClass(status: string, cancellationReason?: string): string {
  if (status === "cancelled" && cancellationReason === "auto_expired") return "badge badge-expired";
  const map: Record<string, string> = {
    pending:   "badge badge-pending",
    scheduled: "badge badge-scheduled",
    completed: "badge badge-completed",
    cancelled: "badge badge-cancelled",
    paid:      "badge badge-completed",
    refunded:  "badge badge-cancelled",
  };
  return map[status] ?? "badge";
}

export function fullName(obj?: { first_name?: string; last_name?: string } | null): string {
  if (!obj) return "";
  return `${obj.first_name ?? ""} ${obj.last_name ?? ""}`.trim();
}

// Extrae "YYYY-MM-DD" del ISO string sin conversión de timezone
export function toBogotaDateStr(dateStr: string): string {
  return dateStr.replace(/Z$/, "").split(".")[0].split("T")[0];
}

export function isToday(dateStr: string): boolean {
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  return toBogotaDateStr(dateStr) === todayStr;
}
