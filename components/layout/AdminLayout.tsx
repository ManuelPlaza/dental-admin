"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0f1e] items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          {/* Animated logo */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-base shadow-xl shadow-cyan-500/25 animate-pulse">
              JC
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 blur-md animate-pulse" />
          </div>
          <p className="text-white/50 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 lg:ml-64 min-h-screen"
        tabIndex={-1}
      >
        <div className="p-5 sm:p-6 lg:p-8 fade-in max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
