import { authFetch } from "@/lib/auth";

const INVENTORY_URL  = process.env.NEXT_PUBLIC_INVENTORY_URL || "http://localhost:8081";
const INVENTORY_BASE = `${INVENTORY_URL}/api/supplies/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Supply {
  id:           number;
  name:         string;
  category:     string;
  stock:        number;
  minimumStock: number;
  critical:     boolean;
}

export interface CreateSupplyDto {
  name:         string;
  category:     string;
  stock:        number;
  minimumStock: number;
}

// ── Generic request ───────────────────────────────────────────────────────────

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(`${INVENTORY_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    throw new Error(isAbort ? "request_timeout" : "network_error");
  }

  if (res.ok) {
    // DELETE returns 200 void
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  const statusMap: Record<number, string> = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "server_error",
    502: "server_error",
    503: "server_error",
  };
  throw new Error(statusMap[res.status] ?? "server_error");
}

// ── API surface ───────────────────────────────────────────────────────────────

export const inventoryApi = {
  getSupplies: () =>
    req<Supply[]>(""),

  getSupplyById: (id: number) =>
    req<Supply>(`/${id}`),

  createSupply: (data: CreateSupplyDto) =>
    req<Supply>("", { method: "POST", body: JSON.stringify(data) }),

  updateSupply: (id: number, data: CreateSupplyDto) =>
    req<Supply>(`/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteSupply: (id: number) =>
    req<void>(`/${id}`, { method: "DELETE" }),

  getCriticalSupplies: () =>
    req<Supply[]>("/critical"),

  getLowStockSupplies: (threshold: number) =>
    req<Supply[]>(`/low-stock/${threshold}`),
};
