"use client";

import { Search } from "lucide-react";

// ── PAGE HEADER ──
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── STAT CARD ──
export function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
      <div>
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
    </div>
  );
}

// ── SEARCH BAR ──
export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        className="form-input pl-9 text-sm"
      />
    </div>
  );
}

// ── TABLE ──
export function Table({ headers, children, empty }: {
  headers: string[]; children: React.ReactNode; empty?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {headers.map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-white/40 text-xs font-semibold uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <div className="py-16 text-center text-white/30 text-sm">
          No se encontraron registros
        </div>
      )}
    </div>
  );
}

// ── TABLE ROW ──
export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-white/5 last:border-0 ${onClick ? "cursor-pointer hover:bg-white/[0.03]" : ""} transition-colors`}
    >
      {children}
    </tr>
  );
}

// ── TABLE CELL ──
export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-4 text-white/80 text-sm ${className ?? ""}`}>
      {children}
    </td>
  );
}

// ── FILTER TABS ──
export function FilterTabs({ options, value, onChange }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-cyan-500/20 text-cyan-400"
              : "text-white/50 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── MODAL ──
export function Modal({ isOpen, onClose, title, children, wide }: {
  isOpen: boolean; onClose: () => void;
  title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/8">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── SKELETON ──
export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? "h-4 w-full"}`} />;
}

// ── EMPTY STATE ──
export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
      <div className="text-white/20">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── BTN ──
export function Btn({ children, onClick, variant = "primary", size = "md", disabled, type = "button" }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-xl transition-all disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm" };
  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20",
    secondary: "bg-white/8 hover:bg-white/12 text-white border border-white/10",
    danger: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20",
    ghost: "text-white/60 hover:text-white hover:bg-white/5",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}
