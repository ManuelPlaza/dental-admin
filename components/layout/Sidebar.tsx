"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, CalendarDays, Users, UserCog,
  Briefcase, FileText, CreditCard, Menu, X, LogOut, ImagePlay, Bot, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

// Agrupado por lo que se hace en el día, no por orden de creación del sistema.
type NavItem = { label: string; href: string; icon: LucideIcon };
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Día a día",
    items: [
      { label: "Inicio",             href: "/dashboard",     icon: LayoutDashboard },
      { label: "Mi agenda",          href: "/agenda",        icon: CalendarDays },
      { label: "Citas",              href: "/citas",         icon: Calendar },
      { label: "Pacientes",          href: "/pacientes",     icon: Users },
      { label: "Historias clínicas", href: "/historias",     icon: FileText },
      { label: "Pagos",              href: "/pagos",         icon: CreditCard },
    ],
  },
  {
    label: "Negocio",
    items: [
      { label: "Especialistas", href: "/especialistas", icon: UserCog },
      { label: "Servicios",     href: "/servicios",     icon: Briefcase },
      { label: "Inventario",    href: "/inventario",    icon: Package },
    ],
  },
  {
    label: "Sitio web",
    items: [
      { label: "Banners",    href: "/banners", icon: ImagePlay },
      { label: "Chatbot IA", href: "/chatbot", icon: Bot },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

export default function Sidebar() {
  const pathname         = usePathname();
  const [open, setOpen]  = useState(false);
  const { user, logout } = useAuth();
  const closeRef         = useRef<HTMLButtonElement>(null);
  const menuBtnRef       = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  const current = allItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <>
      {/* Barra superior en celular: marca, sección actual y menú */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-surface/95 backdrop-blur border-b border-line flex items-center gap-3 px-3 pt-[env(safe-area-inset-top,0px)] box-content">
        <button
          ref={menuBtnRef}
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={open}
          aria-controls="sidebar-nav"
          className="w-11 h-11 -ml-1 flex items-center justify-center rounded-lg text-ink/80 hover:bg-ink/[0.06] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <p className="font-semibold text-ink text-base truncate">{current?.label ?? "Dental JC"}</p>
        <div
          className="ml-auto w-9 h-9 rounded-full bg-navy text-white text-xs font-semibold flex items-center justify-center select-none"
          aria-hidden="true"
        >
          {initials}
        </div>
      </header>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-ink/50 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar-nav"
        aria-label="Menú principal"
        className={`fixed top-0 left-0 h-full w-72 lg:w-64 bg-surface border-r border-line flex flex-col z-50 transition-transform duration-300 ease-out
          ${open ? "translate-x-0 shadow-pop" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="h-16 px-5 border-b border-line flex items-center justify-between shrink-0">
          <Link href="/dashboard" onClick={() => setOpen(false)} aria-label="Dental JC, ir al inicio" className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
            <Image src="/logo-dentaljc.png" alt="Dental JC" width={176} height={38} priority style={{ height: "auto" }} />
          </Link>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center text-ink/60 hover:text-ink rounded-lg hover:bg-ink/[0.06] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto" aria-label="Secciones">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-3 mb-1.5 text-[11px] font-semibold text-ink/55 uppercase tracking-wider">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 min-h-[44px] lg:min-h-[40px] rounded-lg text-sm font-medium transition-colors
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent
                          ${active
                            ? "bg-accent/10 text-accent-strong"
                            : "text-ink/75 hover:text-ink hover:bg-ink/[0.05]"
                          }`}
                      >
                        <Icon size={18} aria-hidden="true" className={`shrink-0 ${active ? "text-accent" : "text-ink/55"}`} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-line shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div
              className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-xs font-semibold text-white shrink-0 select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-sm font-semibold truncate leading-tight">
                {user?.name || "Administradora"}
              </p>
              <p className="text-ink/60 text-xs truncate leading-tight mt-0.5">
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="w-10 h-10 flex items-center justify-center text-ink/60 hover:text-red-700 transition-colors rounded-lg hover:bg-red-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 shrink-0"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
