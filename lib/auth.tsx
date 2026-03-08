"use client";

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE = `${API_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const TOKEN_KEY   = "dental_access_token";
const REFRESH_KEY = "dental_refresh_token";
const USER_KEY    = "dental_user";

export const storage = {
  getAccess:  () => (typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY)   : null),
  getRefresh: () => (typeof window !== "undefined" ? sessionStorage.getItem(REFRESH_KEY) : null),
  getUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || "null") as AuthUser | null; }
    catch { return null; }
  },
  set: (access: string, refresh: string, user: AuthUser) => {
    sessionStorage.setItem(TOKEN_KEY,   access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
    sessionStorage.setItem(USER_KEY,    JSON.stringify(user));
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

// ── Fetch with configurable timeout ──────────────────────────────────────────

function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// ── Authenticated fetch with auto-refresh ─────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function flushQueue(token: string | null, error?: unknown) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
}

export async function authFetch(
  input: RequestInfo,
  init: RequestInit = {},
  onSessionExpired?: () => void,
): Promise<Response> {
  const access  = storage.getAccess();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  const res = await fetchWithTimeout(input, { ...init, headers });

  if (res.status !== 401) return res;

  // ── 401 → attempt refresh ──
  if (isRefreshing) {
    const newToken = await new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
    return fetchWithTimeout(input, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${newToken}` },
    });
  }

  isRefreshing = true;
  const refreshToken = storage.getRefresh();

  if (!refreshToken) {
    storage.clear();
    onSessionExpired?.();
    isRefreshing = false;
    return res;
  }

  try {
    const refreshRes = await fetchWithTimeout(`${BASE}/auth/refresh`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshRes.ok) throw new Error("refresh_failed");

    const data        = await refreshRes.json();
    const newAccess   = data.access_token  as string;
    const newRefresh  = data.refresh_token as string;
    const user        = storage.getUser()!;
    storage.set(newAccess, newRefresh, user);

    flushQueue(newAccess);
    isRefreshing = false;

    return fetchWithTimeout(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
        Authorization: `Bearer ${newAccess}`,
      },
    });
  } catch {
    flushQueue(null, new Error("Session expired"));
    isRefreshing = false;
    storage.clear();
    onSessionExpired?.();
    return res;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = storage.getUser();
    const token = storage.getAccess();
    if (saved && token) setUser(saved);
    setLoading(false);
  }, []);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    router.push("/login?expired=1");
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetchWithTimeout(`${BASE}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });

    if (res.status === 401) throw new Error("credentials");
    if (res.status === 403) throw new Error("inactive");
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok)            throw new Error("server");

    const data = await res.json();

    const authUser: AuthUser = {
      id:    data.admin_id ?? data.user?.id ?? 0,
      name:  data.user?.name
        ? data.user.name
        : data.user?.first_name
          ? `${data.user.first_name} ${data.user.last_name ?? ""}`.trim()
          : "Administrador",
      email: data.user?.email ?? email,
    };

    storage.set(data.access_token, data.refresh_token, authUser);
    setUser(authUser);

    // Refresh real user data from /auth/me without blocking navigation
    try {
      const meRes = await authFetch(`${BASE}/auth/me`, {}, handleSessionExpired);
      if (meRes.ok) {
        const me         = await meRes.json();
        const realUser: AuthUser = { id: me.admin_id, name: me.name, email: me.email };
        storage.set(data.access_token, data.refresh_token, realUser);
        setUser(realUser);
      }
    } catch { /* non-critical: proceed with data from login response */ }

    router.push("/dashboard");
  }, [router, handleSessionExpired]);

  const logout = useCallback(async () => {
    const refresh = storage.getRefresh();
    const access  = storage.getAccess();

    try {
      if (refresh && access) {
        await fetchWithTimeout(`${BASE}/auth/logout`, {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${access}`,
          },
          body: JSON.stringify({ refresh_token: refresh }),
        }, 5_000);
      }
    } catch { /* Ignore network errors on logout — always clear local session */ }

    storage.clear();
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// Safe fallback — returned during SSR or if accidentally used outside provider
const fallbackCtx: AuthCtx = {
  user:    null,
  loading: true,
  login:   async () => { throw new Error("AuthProvider not mounted"); },
  logout:  async () => { },
};

export function useAuth() {
  const ctx = useContext(Ctx);
  return ctx ?? fallbackCtx;
}
