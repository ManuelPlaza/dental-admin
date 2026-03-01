"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users, UserCog,
  Briefcase, FileText, CreditCard, Menu, X, LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth"; // Ajusta la ruta si es diferente

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Citas", href: "/citas", icon: Calendar },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Especialistas", href: "/especialistas", icon: UserCog },
  { label: "Servicios", href: "/servicios", icon: Briefcase },
  { label: "Historias Clínicas", href: "/historias", icon: FileText },
  { label: "Pagos", href: "/pagos", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { logout } = useAuth(); // <--- Añade esta línea

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white/70"
      >
        <Menu size={18} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0d1526] border-r border-white/5 flex flex-col z-50 transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-cyan-500/25">
              JC
            </div>
            <div>
              <p className="text-white font-bold text-sm">Dental JC</p>
              <p className="text-white/40 text-xs">Panel Admin</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-cyan-500/15 text-cyan-400 border-r-2 border-cyan-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">Administradora</p>
              <p className="text-white/40 text-xs truncate">Dental JC</p>
            </div>
            <button
              onClick={(e) => logout(e)}
              className="text-white/40 hover:text-red-400 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
