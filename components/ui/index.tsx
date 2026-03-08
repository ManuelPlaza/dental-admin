"use client";

import { Search, X } from "lucide-react";

// ── PAGE HEADER ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider truncate">{label}</p>
        <p className="text-white text-2xl font-bold mt-1 leading-tight">{value}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-lg shrink-0`}
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
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        aria-label={placeholder || "Buscar"}
        maxLength={100}
        className="form-input pl-9 pr-9 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/5">
              {headers.map((h) => (
                <th key={h} scope="col" className="text-left px-5 py-3.5 text-white/40 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {empty && (
        <div className="py-16 text-center text-white/30 text-sm">
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
      className={`border-b border-white/5 last:border-0 transition-colors
        ${onClick ? "cursor-pointer hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:outline-none" : ""}`}
    >
      {children}
    </tr>
  );
}

// ── TABLE CELL ───────────────────────────────────────────────────────────────
export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-4 text-white/80 text-sm ${className ?? ""}`}>
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
    <div className="flex flex-wrap gap-1 bg-white/5 rounded-xl p-1" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 ${
            value === opt.value
              ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
              : "text-white/50 hover:text-white hover:bg-white/5"
          }`}
        >
          {opt.label}
        </button>
      ))}
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
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className={`relative bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/8">
          <h2 id="modal-title" className="text-white font-bold text-lg leading-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-white/40 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
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
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
      <div className="text-white/20" aria-hidden="true">{icon}</div>
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
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm" };
  const variants = {
    primary:   "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 focus-visible:outline-cyan-500",
    secondary: "bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 focus-visible:outline-white",
    danger:    "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 focus-visible:outline-red-500",
    ghost:     "text-white/60 hover:text-white hover:bg-white/5 focus-visible:outline-white",
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
