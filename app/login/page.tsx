"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ShieldAlert, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ─── Pantalla de carga tras iniciar sesión ──────────────────────────────────── */
function LoginSuccessOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-page"
      style={{ animation: "fadeInOverlay 0.25s ease forwards" }}
      role="status"
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spinnerRing { to { transform: rotate(360deg); } }
      `}</style>
      <div className="flex flex-col items-center gap-8">
        <Image src="/logo-dentaljc.png" alt="Dental JC" width={220} height={48} priority style={{ height: "auto" }} />
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-ink/10 border-t-accent"
            style={{ animation: "spinnerRing 0.8s linear infinite" }}
          />
          <p className="text-ink/65 text-sm">Cargando tu panel…</p>
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

  useEffect(() => { if (user && !loginSuccess) router.replace("/dashboard"); }, [user, router, loginSuccess]);
  useEffect(() => { if (params?.get("expired") === "1") setExpired(true); }, [params]);

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

  const field = `w-full bg-surface border border-slate-300 hover:border-slate-400 text-ink text-base sm:text-sm
    placeholder-ink/45 rounded-lg px-4 min-h-[48px] focus:outline-none focus:border-accent
    focus:ring-[3px] focus:ring-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100`;

  return (
    <>
      <div>
        <h1 className="text-ink text-[1.75rem] sm:text-3xl font-semibold tracking-tight leading-tight">
          Bienvenida de vuelta
        </h1>
        <p className="text-ink/65 text-sm mt-2">
          Ingresa para ver las citas y pagos de hoy.
        </p>
      </div>

      {expired && (
        <div role="alert" className="mt-6 flex items-start gap-3 px-4 py-3 rounded-lg text-sm border border-amber-600/30 bg-amber-50 text-amber-900">
          <Clock size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          Tu sesión expiró. Inicia sesión nuevamente.
        </div>
      )}
      {isLocked && (
        <div role="alert" className="mt-6 flex items-start gap-3 px-4 py-3 rounded-lg text-sm border border-red-600/25 bg-red-50 text-red-900">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Cuenta bloqueada por unos segundos. Podrás intentar de nuevo en{" "}
            <span className="font-semibold tabular">{countdown} s</span>.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-ink text-sm font-medium mb-2">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="nombre@correo.com"
            autoComplete="username email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            disabled={disabled}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
            className={field}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-ink text-sm font-medium mb-2">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={handleChange("password")}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              maxLength={128}
              disabled={disabled}
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPass}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg text-ink/60 hover:text-ink hover:bg-ink/[0.05] transition-colors"
            >
              {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && !isLocked && (
          <div id="login-error" role="alert"
            className="flex items-start gap-3 px-4 py-3 rounded-lg text-sm border border-red-600/25 bg-red-50 text-red-900">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        )}

        {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < attempts ? "bg-red-500" : "bg-ink/10"}`} />
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-strong text-white font-semibold text-sm
            min-h-[48px] px-6 rounded-lg transition-colors active:translate-y-px
            disabled:opacity-60 disabled:cursor-not-allowed disabled:active:translate-y-0
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Ingresando…
            </>
          ) : isLocked ? (
            <>
              <Clock size={16} aria-hidden="true" />
              Bloqueado ({countdown} s)
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Foto de la marca (la imagen ya incluye el nombre del panel); solo en escritorio */}
      <div className="hidden lg:block relative flex-1 bg-navy">
        <Image
          src="/cover-login.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 0px"
          quality={90}
          className="object-cover"
          style={{ objectPosition: "0% center" }}
          draggable={false}
        />
      </div>

      <main className="flex flex-col min-h-screen w-full lg:w-[460px] xl:w-[500px] shrink-0 px-6 sm:px-12 lg:px-12">
        <div className="pt-8 sm:pt-10">
          <Image
            src="/logo-dentaljc.png"
            alt="Dental JC"
            width={236}
            height={51}
            priority
            style={{ height: "auto" }}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center py-10 max-w-[400px] w-full mx-auto lg:mx-0">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="pb-8 text-ink/60 text-xs">
          &copy; {new Date().getFullYear()} Técnica Dental JC
        </p>
      </main>
    </div>
  );
}
