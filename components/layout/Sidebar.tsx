"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Users, UserCog,
  Briefcase, FileText, CreditCard, Menu, X, LogOut, ImagePlay, Bot,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { label: "Dashboard",          href: "/dashboard",     icon: LayoutDashboard },
  { label: "Mi Agenda",          href: "/agenda",        icon: CalendarDays },
  { label: "Citas",              href: "/citas",         icon: Calendar },
  { label: "Pacientes",          href: "/pacientes",     icon: Users },
  { label: "Especialistas",      href: "/especialistas", icon: UserCog },
  { label: "Servicios",          href: "/servicios",     icon: Briefcase },
  { label: "Historias Clínicas", href: "/historias",     icon: FileText },
  { label: "Pagos",              href: "/pagos",         icon: CreditCard },
  { label: "Banners",            href: "/banners",       icon: ImagePlay },
  { label: "Chatbot IA",         href: "/chatbot",       icon: Bot },
] as const;

export default function Sidebar() {
  const pathname         = usePathname();
  const [open, setOpen]  = useState(false);
  const { user, logout } = useAuth();
  const closeRef         = useRef<HTMLButtonElement>(null);
  const menuBtnRef       = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Trap focus inside sidebar when open on mobile
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        ref={menuBtnRef}
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        aria-controls="sidebar-nav"
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-slate-800/90 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-slate-700 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        role="navigation"
        aria-label="Menú principal"
        className={`fixed top-0 left-0 h-full w-64 bg-[#0d1526] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-cyan-500/25"
              aria-hidden="true"
            >
              JC
            </div>
            <div>
              <p className="text-white font-bold text-sm">Dental JC</p>
              <p className="text-white/40 text-xs">Panel Admin</p>
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto" aria-label="Secciones">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon   = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500
                  ${active
                    ? "bg-cyan-500/15 text-cyan-400 shadow-sm"
                    : "text-white/55 hover:text-white hover:bg-white/[0.06]"
                  }`}
              >
                {/* Active indicator strip */}
                <span
                  className={`absolute left-0 w-0.5 h-7 rounded-r-full transition-all duration-200 ${
                    active ? "bg-cyan-400 opacity-100" : "opacity-0"
                  }`}
                  aria-hidden="true"
                />
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={`shrink-0 transition-colors ${active ? "text-cyan-400" : "text-white/40 group-hover:text-white/70"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile + logout */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0 select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            {/* User info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {user?.name || "Administrador"}
              </p>
              <p className="text-white/35 text-xs truncate leading-tight mt-0.5">
                {user?.email || ""}
              </p>
            </div>
            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="text-white/35 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 shrink-0"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
