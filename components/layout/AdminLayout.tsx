"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
      <div className="flex min-h-screen bg-page items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-5">
          <Image src="/logo-dentaljc.png" alt="Dental JC" width={180} height={39} priority style={{ height: "auto" }} className="animate-pulse" />
          <p className="text-ink/65 text-sm">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0"
        tabIndex={-1}
      >
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8 fade-in max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
