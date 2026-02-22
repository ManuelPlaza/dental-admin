"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Simulación de login — conecta con tu backend cuando tengas auth
    setTimeout(() => {
      if (form.email === "admin@dentaljc.com" && form.password === "admin123") {
        router.push("/dashboard");
      } else {
        setError("Credenciales incorrectas. Intenta de nuevo.");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-cyan-500/25 mb-4">
            JC
          </div>
          <h1 className="text-white font-bold text-2xl">Dental JC</h1>
          <p className="text-white/40 text-sm mt-1">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-6">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                placeholder="admin@dentaljc.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 flex items-center gap-1.5">
                <Lock size={12} /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="form-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 mt-2"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-white/30 text-xs text-center mt-6">
            Demo: admin@dentaljc.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
