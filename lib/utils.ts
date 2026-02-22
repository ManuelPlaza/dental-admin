export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    scheduled: "Aprobada",
    completed: "Completada",
    cancelled: "Cancelada",
    paid: "Pagado",
    refunded: "Reembolsado",
  };
  return map[status] ?? status;
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: "badge badge-pending",
    scheduled: "badge badge-scheduled",
    completed: "badge badge-completed",
    cancelled: "badge badge-cancelled",
    paid: "badge badge-completed",
    refunded: "badge badge-cancelled",
  };
  return map[status] ?? "badge";
}

export function fullName(obj?: { first_name?: string; last_name?: string } | null): string {
  if (!obj) return "—";
  return `${obj.first_name ?? ""} ${obj.last_name ?? ""}`.trim() || "—";
}
export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
