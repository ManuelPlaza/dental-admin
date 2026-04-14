"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ShieldAlert, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ─── Post-login loading overlay ─────────────────────────────────────────────── */
function LoginSuccessOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07101f]"
      style={{ animation: "fadeInOverlay 0.25s ease forwards" }}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes logoPulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.97); }
        }
        @keyframes spinnerRing {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#1a6fb5]/8 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div style={{ animation: "logoPulse 1.4s ease-in-out infinite" }}>
          <Image
            src="/logo-dentaljc.png"
            alt="Dental JC"
            width={220}
            height={55}
            priority
            className="drop-shadow-[0_0_18px_rgba(26,111,181,0.4)]"
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-9 h-9 rounded-full border-2 border-white/10 border-t-[#1a6fb5]"
            style={{ animation: "spinnerRing 0.8s linear infinite" }}
          />
          <p className="text-white/30 text-xs tracking-widest uppercase font-light">
            Cargando panel…
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 60_000; // 1 minute client-side lockout

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeEmail(v: string) {
  return v.trim().toLowerCase().slice(0, 254);
}

/* ─── Login Form ─────────────────────────────────────────────────────────────── */
function LoginForm() {
  const router          = useRouter();
  const params          = useSearchParams();
  const { user, login } = useAuth();

  const [form, setForm]           = useState({ email: "", password: "" });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError]         = useState("");
  const [expired, setExpired]     = useState(false);

  // Client-side brute-force throttle
  const [attempts, setAttempts]       = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown]     = useState(0);

  // Redirect if already authenticated (direct nav, no overlay needed)
  useEffect(() => { if (user && !loginSuccess) router.replace("/dashboard"); }, [user, router, loginSuccess]);
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
      setAttempts(0);
      setLoginSuccess(true);
      // Small delay so the overlay is visible before navigation
      setTimeout(() => router.replace("/dashboard"), 1800);
      return;
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

  if (loginSuccess) return <LoginSuccessOverlay />;

  return (
    <>
      {/* ── Header: logo ── */}
      <div className="flex items-center gap-3">
        <Image
          src="/logo-dentaljc.png"
          alt="Dental JC"
          width={148}
          height={37}
          priority
          style={{ objectFit: "contain" }}
        />
        <div className="h-5 w-px bg-white/10 mx-1" />
        <span className="text-white/25 text-[10px] tracking-widest uppercase font-medium">Admin</span>
      </div>

      {/* ── Headline ── */}
      <div className="mt-8 mb-7">
        <h1 className="text-white text-3xl font-semibold tracking-tight leading-[1.2]">
          Bienvenida<br />
          <span className="text-white/40 font-light">de vuelta</span>
        </h1>
        <p className="text-white/28 text-xs mt-2 leading-relaxed">
          Accede a tu panel de gestión clínica
        </p>
      </div>

      {/* ── Banners ── */}
      {expired && (
        <div role="alert" className="mb-7 flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm border"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.16)", color: "#fbbf24" }}>
          <Clock size={15} className="shrink-0 mt-0.5" />
          Tu sesión expiró. Por favor inicia sesión nuevamente.
        </div>
      )}
      {isLocked && (
        <div role="alert" className="mb-7 flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm border"
          style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.16)", color: "#fca5a5" }}>
          <ShieldAlert size={15} className="shrink-0 mt-0.5" />
          <span>
            Cuenta bloqueada temporalmente.{" "}
            <span className="font-semibold font-mono">{countdown}s</span> para desbloquear.
          </span>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Email */}
        <div className="group">
          <label htmlFor="login-email"
            className="block text-white/35 text-[10px] tracking-widest uppercase font-medium mb-2">
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
            className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14]
              text-white text-sm placeholder-white/20 rounded-xl
              px-4 py-3.5 focus:outline-none focus:bg-white/[0.06]
              focus:border-[#1a6fb5]/50 focus:ring-1 focus:ring-[#1a6fb5]/25
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        {/* Password */}
        <div className="group">
          <label htmlFor="login-password"
            className="block text-white/35 text-[10px] tracking-widest uppercase font-medium mb-2">
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
              className="w-full bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14]
                text-white text-sm placeholder-white/20 rounded-xl
                px-4 py-3.5 pr-12 focus:outline-none focus:bg-white/[0.06]
                focus:border-[#1a6fb5]/50 focus:ring-1 focus:ring-[#1a6fb5]/25
                transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              tabIndex={-1}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 transition-colors p-1"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && !isLocked && (
          <div id="login-error" role="alert"
            className="flex items-start gap-3 px-4 py-3.5 rounded-2xl text-xs border"
            style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.16)", color: "#fca5a5" }}>
            <ShieldAlert size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Attempts progress */}
        {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
          <div className="flex gap-1.5 px-0.5" aria-hidden="true">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div key={i}
                className={`h-0.5 flex-1 rounded-full transition-all duration-400 ${
                  i < attempts ? "bg-red-500/50" : "bg-white/8"
                }`}
              />
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2.5
              bg-gradient-to-r from-[#1a6fb5] to-[#0d4a8a]
              text-white font-semibold text-sm py-3.5 px-6 rounded-xl
              transition-all duration-300
              hover:shadow-[0_8px_32px_rgba(26,111,181,0.35)] hover:brightness-110 hover:-translate-y-px
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
              active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1a6fb5]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                Autenticando…
              </>
            ) : isLocked ? (
              <>
                <Clock size={15} />
                Bloqueado ({countdown}s)
              </>
            ) : (
              <>
                Iniciar Sesión
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-[#07101f]">

      {/* ── Left: editorial image — fills most of the screen ── */}
      <div className="hidden lg:block relative flex-1">
        <Image
          src="/cover-login.png"
          alt=""
          fill
          priority
          quality={95}
          className="object-cover object-center"
          draggable={false}
        />
        {/* Overlay logo sobre la imagen */}
        <div className="absolute bottom-10 left-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#07101f]/70 backdrop-blur-sm flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 2C9.5 2 7.5 3.5 6 5c-1 1-2 1.5-3 1.5C2.5 6.5 2 7 2 8c0 2 .5 4 1.5 6.5C4.5 17 5.5 22 7 22c1 0 1.5-1.5 2-3 .5-1.5 1-2.5 3-2.5s2.5 1 3 2.5c.5 1.5 1 3 2 3 1.5 0 2.5-5 3.5-7.5C21.5 12 22 10 22 8c0-1-.5-1.5-1-1.5-1 0-2-.5-3-1.5C16.5 3.5 14.5 2 12 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none drop-shadow">Dental Admin</p>
            <p className="text-white/50 text-[10px] tracking-widest uppercase mt-0.5 drop-shadow">Panel de Gestión Clínica</p>
          </div>
        </div>
        {/* Fade derecho hacia el panel */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-[#07101f]" />
      </div>

      {/* ── Right: login panel — columna angosta a la derecha ── */}
      <div className="flex flex-col min-h-screen w-full lg:w-[340px] xl:w-[360px] shrink-0 relative overflow-hidden">

        {/* Glow sutil en la esquina superior derecha */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#1a6fb5]/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-[#1a6fb5]/5 rounded-full blur-3xl translate-y-1/4 pointer-events-none" />

        {/* Mobile: imagen de fondo tenue */}
        <div className="lg:hidden absolute inset-0 -z-10">
          <Image
            src="/cover-login.png"
            alt=""
            fill
            className="object-cover object-top opacity-8"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07101f]/65 via-[#07101f]/88 to-[#07101f]" />
        </div>

        {/* Contenido: logo ↑ · form centro · footer ↓ */}
        <div className="relative z-10 flex flex-col flex-1 px-8 xl:px-10">

          {/* Zona 1 — top spacer */}
          <div className="pt-10" />

          {/* Zona 2 — form (crece y se centra verticalmente) */}
          <div className="flex-1 flex flex-col justify-center">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          {/* Zona 3 — footer al fondo */}
          <div className="pb-8 pt-4">
            <p className="text-white/12 text-[10px] font-light leading-relaxed">
              &copy; {new Date().getFullYear()} Técnica Dental JC<br />
              Todos los derechos reservados
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
