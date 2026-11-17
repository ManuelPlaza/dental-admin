"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Eye, EyeOff, ShieldAlert, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BrandMark } from "@/components/SplashScreen";

/* ─── Pantalla de carga tras iniciar sesión ──────────────────────────────────── */
function LoginSuccessOverlay() {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="boot boot-fade" style={{ zIndex: 70 }} role="status" aria-label="Cargando tu panel">
      <div className="splash-glow" aria-hidden="true" />
      <div className="boot-center">
        <div className="boot-mark"><BrandMark /></div>
        <p className="splash-word">Dental <span>JC</span></p>
        <div className="boot-spinner" aria-hidden="true" />
        <p className="boot-text">Cargando tu panel…</p>
      </div>
    </div>,
    document.body
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

  const signingIn = useRef(false);
  useEffect(() => { if (user && !loginSuccess && !signingIn.current) router.replace("/dashboard"); }, [user, router, loginSuccess]);
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

    signingIn.current = true;
    try {
      await login(sanitizeEmail(form.email), form.password);
      setAttempts(0);
      setLoginSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 1800);
      return;
    } catch (err: unknown) {
      signingIn.current = false;
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
// Composición a pantalla completa: fondo azul marino de marca, la foto anclada a la
// derecha con un degradado que la funde al fondo, y la tarjeta de acceso flotando
// a la izquierda. La foto se muestra con su altura natural como tope para no
// ampliarla de más y que no se pixele en pantallas grandes.
export default function LoginPage() {
  return (
    <div
      className="login-stage relative min-h-screen w-full overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(70% 60% at 18% 20%, rgb(14 116 144 / 0.38), transparent 70%), radial-gradient(60% 50% at 90% 100%, rgb(14 116 144 / 0.22), transparent 70%), linear-gradient(135deg, #08162A 0%, #0F2A47 55%, #123456 100%)",
      }}
    >
      <style>{`
        @keyframes loginPhotoIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        @keyframes loginCardIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .login-photo { animation: loginPhotoIn 1.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-card  { animation: loginCardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
        @media (prefers-reduced-motion: reduce) { .login-photo, .login-card { animation: none; } }
      `}</style>

      {/* Foto: nunca se recorta. Su caja conserva la proporción de la imagen (896×1024)
          y escala con la altura de la pantalla, así siempre se ve la persona completa.
          Escritorio: anclada abajo a la derecha. Celular: franja centrada arriba. */}
      <div
        className="login-photo login-photo-box pointer-events-none absolute"
        aria-hidden="true"
      >
        <Image
          src="/login-photo.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 80vw"
          quality={90}
          className="object-cover"
          draggable={false}
        />
        {/* Tinte de marca para que la foto se integre al azul */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08162A]/20 via-transparent to-[#08162A]/50" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col px-5 sm:px-10 lg:px-[6vw]">
        <div className="flex-1 flex items-center justify-center lg:justify-start pt-[calc(clamp(220px,36vh,340px)-48px)] pb-10 lg:pt-12">
          <div className="login-card w-full max-w-[440px] rounded-2xl bg-surface text-ink p-7 sm:p-10 shadow-[0_30px_80px_-20px_rgba(2,10,25,0.6)]">
            <Image
              src="/logo-dentaljc.png"
              alt="Dental JC"
              width={210}
              height={46}
              priority
              style={{ height: "auto" }}
              className="-ml-4 mb-6"
            />
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <footer className="pb-7 flex flex-col gap-3">
          <p className="hidden lg:block text-white/85 text-lg font-light max-w-[26ch] leading-snug">
            Tu agenda, tus pacientes y tus pagos, en un solo lugar.
          </p>
          <p className="text-white/70 text-xs text-center lg:text-left">
            &copy; {new Date().getFullYear()} Técnica Dental JC
          </p>
        </footer>
      </main>
    </div>
  );
}
