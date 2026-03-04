"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

/* ─── Contenido del formulario ─────────────────────────────────────────────── */
function LoginForm() {
  const router          = useRouter();
  const params          = useSearchParams();
  const { user, login } = useAuth();

  const [form, setForm]         = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [expired, setExpired]   = useState(false);

  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);
  useEffect(() => { if (params?.get("expired") === "1") setExpired(true); }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Completa todos los campos"); return; }
    setLoading(true); setError("");
    try {
      await login(form.email, form.password);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "credentials") setError("Correo o contraseña incorrectos.");
      else if (msg === "inactive") setError("Cuenta inactiva. Contacta al administrador.");
      else setError("Error del servidor. Intenta nuevamente.");
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 py-12">

      {/* Logo */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a6fb5] to-[#0d4a8a] flex items-center justify-center shadow-lg shadow-blue-900/40">
            {/* Tooth SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
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

      {/* Banner expirado */}
      {expired && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm border"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
          <span className="shrink-0 text-base">⏱</span>
          Tu sesión expiró. Por favor inicia sesión nuevamente.
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-xs tracking-wider uppercase font-medium">
            Correo electrónico
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
            placeholder="admin@dentaljc.com"
            autoComplete="email"
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20
              focus:outline-none focus:border-[#1a6fb5]/60 focus:bg-white/8 transition-all duration-200
              disabled:opacity-50"
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <label className="text-white/40 text-xs tracking-wider uppercase font-medium">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20
                focus:outline-none focus:border-[#1a6fb5]/60 focus:bg-white/8 transition-all duration-200
                disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1"
            >
              {showPass
                ? <EyeOff size={15} />
                : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm border"
            style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            <span className="shrink-0">✕</span> {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full relative overflow-hidden flex items-center justify-center gap-2.5
            bg-gradient-to-r from-[#1a6fb5] to-[#0d4a8a]
            hover:from-[#2280cc] hover:to-[#1058a0]
            text-white font-semibold text-sm py-3.5 px-6 rounded-xl
            transition-all duration-300 mt-1
            disabled:opacity-60 disabled:cursor-not-allowed
            shadow-lg shadow-blue-900/30
            active:scale-[0.98]"
          style={{ letterSpacing: "0.02em" }}
        >
          {/* Shimmer effect */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />

          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Autenticando...
            </>
          ) : (
            <>
              Iniciar Sesión
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-white/15 text-xs mt-10 font-light">
        © {new Date().getFullYear()} Técnica Dental JC · Todos los derechos reservados
      </p>
    </div>
  );
}

/* ─── Page principal ────────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-[#07101f]">

      {/* ── LADO IZQUIERDO: imagen de portada ── */}
      <div className="hidden lg:block lg:w-[58%] xl:w-[62%] relative overflow-hidden">
        {/* Imagen tal cual */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cover-login.png"
          alt="Dental Admin"
          className="absolute inset-0 w-full h-full object-cover object-center"
          draggable={false}
        />

        {/* Gradiente sutil en el borde derecho para transición suave con el panel */}
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#07101f] to-transparent" />

        {/* Gradiente sutil en el borde inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07101f]/40 to-transparent" />
      </div>

      {/* ── LADO DERECHO: panel de login ── */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col relative">

        {/* Fondo con textura sutil */}
        <div className="absolute inset-0 bg-[#07101f]">
          {/* Glow azul tenue */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#1a6fb5]/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a6fb5]/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          {/* Línea decorativa izquierda */}
          <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#1a6fb5]/20 to-transparent" />
        </div>

        {/* Contenido del formulario */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Imagen de fondo en mobile (cuando la columna izquierda no se ve) */}
        <div className="lg:hidden absolute inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cover-login.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top opacity-15"
            draggable={false}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07101f]/70 via-[#07101f]/90 to-[#07101f]" />
        </div>
      </div>
    </div>
  );
}