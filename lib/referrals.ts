import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE    = `${API_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Ambassador {
  document_number: string;
  name:            string;
  /** Referidos directos (primer nivel). */
  direct:          number;
  /** Red completa: toda la descendencia, todos los niveles. */
  network_total:   number;
}

interface NetworkResponse {
  ambassadors: Ambassador[] | null;
}

export interface NetworkParams {
  depth?: number;
  limit?: number;
}

// ── API surface ───────────────────────────────────────────────────────────────

// Mismo mapeo de errores que lib/api.ts — nunca exponemos detalles del servidor.
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

/**
 * Embajadores de la clínica: pacientes ordenados desc por el tamaño de su red
 * completa de referidos. El backend ya devuelve el array ordenado.
 */
export async function getReferralNetwork(
  { depth = 5, limit = 10 }: NetworkParams = {},
): Promise<Ambassador[]> {
  let res: Response;
  try {
    res = await authFetch(`${BASE}/admin/referrals/network?depth=${depth}&limit=${limit}`, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    throw new Error(isAbort ? "request_timeout" : "network_error");
  }

  if (!res.ok) throw new Error(statusMap[res.status] ?? "server_error");

  const data = (await res.json()) as NetworkResponse;
  return Array.isArray(data?.ambassadors) ? data.ambassadors : [];
}
