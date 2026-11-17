"use client";

import { useEffect } from "react";
import { Search, X } from "lucide-react";

// ── PAGE HEADER ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-[1.75rem] font-semibold tracking-tight text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-ink/65 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 max-sm:w-full [&>*]:max-sm:w-full">{action}</div>}
    </div>
  );
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, color }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink/65 text-xs font-medium truncate">{label}</p>
        <p className="text-ink text-2xl font-semibold mt-1 leading-tight tabular">{value}</p>
        {sub && <p className="text-ink/60 text-xs mt-0.5">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}
        aria-hidden="true">
        {icon}
      </div>
    </div>
  );
}

// ── SEARCH BAR ───────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/60 pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        aria-label={placeholder || "Buscar"}
        maxLength={100}
        className="form-input pl-10 pr-10 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ── TABLE ────────────────────────────────────────────────────────────────────
export function Table({ headers, children, empty }: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-line bg-ink/[0.025]">
              {headers.map((h) => (
                <th key={h} scope="col" className="text-left px-5 py-3 text-ink/65 text-xs font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {empty && (
        <div className="py-16 text-center text-ink/60 text-sm">
          No se encontraron registros
        </div>
      )}
    </div>
  );
}

// ── TABLE ROW ────────────────────────────────────────────────────────────────
export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`border-b border-line last:border-0 transition-colors
        ${onClick ? "cursor-pointer hover:bg-accent/[0.05] focus-visible:bg-accent/[0.08] focus-visible:outline-none" : ""}`}
    >
      {children}
    </tr>
  );
}

// ── TABLE CELL ───────────────────────────────────────────────────────────────
export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-3.5 text-ink/85 text-sm ${className ?? ""}`}>
      {children}
    </td>
  );
}

// ── FILTER TABS ──────────────────────────────────────────────────────────────
export function FilterTabs({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <div className="inline-flex gap-1 bg-ink/[0.05] rounded-xl p-1" role="tablist">
        {options.map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 min-h-[36px] rounded-lg text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              value === opt.value
                ? "bg-surface text-accent-strong shadow-card"
                : "text-ink/70 hover:text-ink hover:bg-ink/[0.04]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, wide }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-ink/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* En celular sube desde abajo como una hoja; en escritorio va centrado */}
      <div className={`relative bg-surface sm:border border-line rounded-t-2xl sm:rounded-2xl shadow-pop w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="sticky top-0 z-10 bg-surface flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-line">
          <h2 id="modal-title" className="text-ink font-semibold text-lg leading-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-ink/60 hover:text-ink transition-colors w-10 h-10 -mr-2 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

// ── SKELETON ─────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`skeleton ${className ?? "h-4 w-full"}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}

// ── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-ink/60">
      <div className="text-ink/40" aria-hidden="true">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── BUTTON ───────────────────────────────────────────────────────────────────
export function Btn({
  children, onClick, variant = "primary", size = "md",
  disabled, type = "button", loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  loading?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const sizes = { sm: "px-3 min-h-[36px] text-xs", md: "px-5 min-h-[44px] text-sm" };
  const variants = {
    primary:   "bg-accent hover:bg-accent-strong text-white shadow-card focus-visible:outline-accent",
    secondary: "bg-surface hover:bg-ink/[0.04] text-ink border border-line focus-visible:outline-accent",
    danger:    "bg-red-600/10 hover:bg-red-600/15 text-red-700 border border-red-600/20 focus-visible:outline-red-600",
    ghost:     "text-ink/70 hover:text-ink hover:bg-ink/[0.05] focus-visible:outline-accent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {loading && (
        <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
