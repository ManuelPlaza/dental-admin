"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldAlert, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";

// ── Constants ────────────────────────────────────────────────────────────────
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60_000; // 1 minute client-side lockout

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeEmail(v: string) {
  return v.trim().toLowerCase().slice(0, 254);
}

/* ─── Login Form ────────────────────────────────────────────────────────────── */
function LoginForm() {
  const router          = useRouter();
  const params          = useSearchParams();
  const { user, login } = useAuth();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState("");
  const [expired, setExpired]   = useState(false);

  // Client-side brute-force throttle
  const [attempts,   setAttempts]   = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown,   setCountdown]   = useState(0);

  // Redirect if already authenticated
  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);
  useEffect(() => { if (params?.get("expired") === "1") setExpired(true); }, [params]);

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown(0);
        setError("");
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleChange = useCallback(
    (field: "email" | "password") => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (error && !isLocked) setError("");
    },
    [error, isLocked],
  );

  const validate = (): string | null => {
    if (!form.email.trim()) return "El correo electrónico es requerido.";
    if (!EMAIL_RE.test(form.email.trim())) return "Ingresa un correo electrónico válido.";
    if (!form.password) return "La contraseña es requerida.";
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) return;

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    try {
      await login(sanitizeEmail(form.email), form.password);
      // Reset attempts on success
      setAttempts(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (msg === "credentials") {
        const remaining = MAX_ATTEMPTS - newAttempts;
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setError("Demasiados intentos fallidos. Espera 1 minuto antes de intentarlo de nuevo.");
        } else {
          setError(
            remaining === 1
              ? "Correo o contraseña incorrectos. 1 intento restante antes del bloqueo temporal."
              : `Correo o contraseña incorrectos. ${remaining} intentos restantes.`,
          );
        }
      } else if (msg === "inactive") {
        setError("Cuenta inactiva. Contacta al administrador del sistema.");
      } else if (msg === "rate_limited") {
        setError("Demasiadas solicitudes. Por favor espera unos minutos.");
      } else if (msg.includes("abort") || msg.includes("timeout")) {
        setError("El servidor tardó demasiado en responder. Verifica tu conexión.");
      } else {
        setError("Error del servidor. Intenta nuevamente en unos momentos.");
      }
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || isLocked;

  return (
    <div className="w-full h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12">

      {/* Logo */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a6fb5] to-[#0d4a8a] flex items-center justify-center shadow-lg shadow-blue-900/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 2C9.5 2 7.5 3.5 6 5c-1 1-2 1.5-3 1.5C2.5 6.5 2 7 2 8c0 2 .5 4 1.5 6.5C4.5 17 5.5 22 7 22c1 0 1.5-1.5 2-3 .5-1.5 1-2.5 3-2.5s2.5 1 3 2.5c.5 1.5 1 3 2 3 1.5 0 2.5-5 3.5-7.5C21.5 12 22 10 22 8c0-1-.5-1.5-1-1.5-1 0-2-.5-3-1.5C16.5 3.5 14.5 2 12 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-white/90 text-lg font-semibold tracking-tight leading-none">Dental Admin</p>
            <p className="text-white/35 text-xs tracking-widest uppercase mt-0.5">Panel de Gestión Clínica</p>
          </div>
        </div>

        <div className="w-10 h-px bg-gradient-to-r from-[#1a6fb5] to-transparent mb-7" />

        <h1 className="text-white text-2xl sm:text-3xl font-light tracking-tight leading-snug">
          Bienvenida de<br />
          <span className="font-semibold text-white">vuelta</span>
        </h1>
        <p className="text-white/35 text-sm mt-2 font-light">Accede a tu panel de administración</p>
      </div>

      {/* Session expired banner */}
      {expired && (
        <div role="alert" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
          <Clock size={16} className="shrink-0 mt-0.5" />
          Tu sesión expiró. Por favor inicia sesión nuevamente.
        </div>
      )}

      {/* Locked-out banner */}
      {isLocked && (
        <div role="alert" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            Cuenta bloqueada temporalmente.{" "}
            <span className="font-semibold font-mono">{countdown}s</span> para desbloquear.
          </span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-white/40 text-xs tracking-wider uppercase font-medium">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="admin@dentaljc.com"
            autoComplete="username email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            disabled={disabled}
            aria-required="true"
            aria-describedby={error ? "login-error" : undefined}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20
              focus:outline-none focus:border-[#1a6fb5]/60 focus:bg-white/[0.08] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-white/40 text-xs tracking-wider uppercase font-medium">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={handleChange("password")}
              placeholder="••••••••"
              autoComplete="current-password"
              maxLength={128}
              disabled={disabled}
              aria-required="true"
              aria-describedby={error ? "login-error" : undefined}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20
                focus:outline-none focus:border-[#1a6fb5]/60 focus:bg-white/[0.08] transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              tabIndex={-1}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1 rounded"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && !isLocked && (
          <div id="login-error" role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm border"
            style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Attempts indicator (warn when getting close) */}
        {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i < attempts ? "bg-red-500/70" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled}
          className="w-full relative overflow-hidden flex items-center justify-center gap-2.5
            bg-gradient-to-r from-[#1a6fb5] to-[#0d4a8a]
            hover:from-[#2280cc] hover:to-[#1058a0]
            text-white font-semibold text-sm py-3.5 px-6 rounded-xl
            transition-all duration-300 mt-1
            disabled:opacity-60 disabled:cursor-not-allowed
            shadow-lg shadow-blue-900/30
            active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a6fb5]"
          style={{ letterSpacing: "0.02em" }}
        >
          {/* Shimmer */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />

          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Autenticando...
            </>
          ) : isLocked ? (
            <>
              <Clock size={16} />
              Bloqueado ({countdown}s)
            </>
          ) : (
            <>
              Iniciar Sesión
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-white/15 text-xs mt-10 font-light">
        &copy; {new Date().getFullYear()} Técnica Dental JC &middot; Todos los derechos reservados
      </p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-[#07101f]">

      {/* Left: cover image */}
      <div className="hidden lg:block lg:w-[58%] xl:w-[62%] relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cover-login.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#07101f] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07101f]/40 to-transparent" />
      </div>

      {/* Right: login panel */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col relative">

        <div className="absolute inset-0 bg-[#07101f]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#1a6fb5]/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a6fb5]/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1a6fb5]/20 to-transparent" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Mobile background */}
        <div className="lg:hidden absolute inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cover-login.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-top opacity-15"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07101f]/70 via-[#07101f]/90 to-[#07101f]" />
        </div>
      </div>
    </div>
  );
}
