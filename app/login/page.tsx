"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router          = useRouter();
  const params          = useSearchParams();
  const { user, login } = useAuth();

  const [form, setForm]         = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [expiredMsg, setExpiredMsg] = useState("");

  // Si ya está autenticado → redirigir directo
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  // Mensaje de sesión expirada cuando viene ?expired=1
  useEffect(() => {
    if (params?.get("expired") === "1") {
      setExpiredMsg("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
    }
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Completa todos los campos"); return; }
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      // login() redirige a /dashboard internamente al tener éxito
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "credentials") setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      else if (msg === "inactive") setError("Tu cuenta está inactiva. Contacta al administrador.");
      else setError("Error del servidor. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-cyan-500/30 mb-5">
            JC
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Técnica Dental JC</h1>
          <p className="text-white/40 text-sm mt-1">Panel de Administración</p>
        </div>

        {/* Banner sesión expirada */}
        {expiredMsg && (
          <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-sm">
            <span className="text-base shrink-0">⏱️</span>
            {expiredMsg}
          </div>
        )}

        {/* Card login */}
        <div className="bg-[#0d1526] border border-white/8 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
                placeholder="admin@dentaljc.com"
                autoComplete="email"
                disabled={loading}
                className="form-input text-sm"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="form-input text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error inline */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                <span>❌</span> {error}
              </div>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600
                hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-xl
                transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed
                shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © {new Date().getFullYear()} Técnica Dental JC · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}