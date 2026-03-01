"use client"; // Muy importante agregar esto porque ahora usaremos hooks aquí

import Sidebar from "./Sidebar";
import { useAuth } from "@/lib/auth"; // Ajusta la ruta si es necesario
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 1. Efecto de redirección global
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 2. Pantalla de carga global mientras verifica el token
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0f1e] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-cyan-500/25 animate-pulse">
            JC
          </div>
          <p className="text-white/50 text-sm animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // 3. Si no hay usuario, devolvemos null para evitar renderizar componentes huérfanos
  if (!user) return null;

  // 4. Si todo está en orden, renderizamos la estructura normal con el Sidebar
  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 fade-in">{children}</div>
      </main>
    </div>
  );
}