"use client";

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
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

const TOKEN_KEY = "dental_access_token";
const REFRESH_KEY = "dental_refresh_token";
const USER_KEY = "dental_user";

export const storage = {
  getAccess: () => (typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null),
  getRefresh: () => (typeof window !== "undefined" ? sessionStorage.getItem(REFRESH_KEY) : null),
  getUser: () => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || "null") as AuthUser | null; }
    catch { return null; }
  },
  set: (access: string, refresh: string, user: AuthUser) => {
    sessionStorage.setItem(TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

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
  const access = storage.getAccess();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };

  const res = await fetch(input, { ...init, headers });

  if (res.status !== 401) return res;

  // ── 401 → attempt refresh ──
  if (isRefreshing) {
    // Other request is already refreshing — queue this one
    const newToken = await new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
    return fetch(input, {
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
    const refreshRes = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshRes.ok) throw new Error("refresh failed");

    const data = await refreshRes.json();
    const newAccess = data.access_token;
    const newRefresh = data.refresh_token;
    const user = storage.getUser()!;
    storage.set(newAccess, newRefresh, user);

    flushQueue(newAccess);
    isRefreshing = false;

    return fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
        Authorization: `Bearer ${newAccess}`,
      },
    });
  } catch (err) {
    flushQueue(null, err);
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
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
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) throw new Error("credentials");
    if (res.status === 403) throw new Error("inactive");
    if (!res.ok) throw new Error("server");

    const data = await res.json();

    // Backend returns { access_token, refresh_token, expires_in }
    // Name comes from JWT claims — fetch /auth/me or use a fallback
    const authUser: AuthUser = {
      id: data.admin_id || data.user?.id || 1,
      name: data.user?.name || data.user?.first_name
        ? `${data.user.first_name} ${data.user.last_name}`.trim()
        : "Administrador",
      email: data.user?.email || email,
    };

    storage.set(data.access_token, data.refresh_token, authUser);
    setUser(authUser);

    // Fetch /auth/me to get real user data
    try {
      const meRes = await authFetch(`${BASE}/auth/me`, {}, handleSessionExpired);
      if (meRes.ok) {
        const me = await meRes.json();
        const realUser: AuthUser = {
          id: me.admin_id,
          name: me.name,
          email: me.email,
        };
        storage.set(data.access_token, data.refresh_token, realUser);
        setUser(realUser);
      }
    } catch { }

    router.push("/dashboard");
  }, [router, handleSessionExpired]);

  const logout = useCallback(async (e?: React.MouseEvent) => {
    // Si viene de un botón o link, evitamos que navegue por defecto
    if (e) e.preventDefault(); 

    console.log("1. Iniciando proceso de logout...");
    const refresh = storage.getRefresh();
    const access  = storage.getAccess();
    
    console.log("2. Tokens encontrados:", { access: !!access, refresh: !!refresh });

    try {
      if (refresh && access) {
        console.log("3. Llamando al endpoint de logout en Go...");
        await fetch(`${BASE}/auth/logout`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${access}` 
          },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        console.log("4. Petición al backend finalizada.");
      } else {
        console.log("3. Saltando petición: No se encontraron tokens en sessionStorage.");
      }
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor:", error);
    } finally {
      console.log("5. Limpiando almacenamiento y redirigiendo al Login...");
      storage.clear();
      setUser(null);
      window.location.href = "/login";
    }
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

// Safe fallback — returned during SSR or if accidentally used outside provider
const fallbackCtx: AuthCtx = {
  user: null,
  loading: true,
  login: async () => { throw new Error("AuthProvider not mounted"); },
  logout: async () => { },
};

export function useAuth() {
  const ctx = useContext(Ctx);
  // Return fallback during SSR instead of throwing (avoids 500 on hydration)
  return ctx ?? fallbackCtx;
}
