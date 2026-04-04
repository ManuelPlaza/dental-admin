"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──────────────────────────────────────────────────────────────────────
interface PaymentLinkPublic {
  id: number;
  token: string;
  amount: number;
  phone_number: string;
  status: "pending" | "paid" | "expired" | "rejected" | "cancelled";
  expires_at: string;
  payment_url: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(n);
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Status config ──────────────────────────────────────────────────────────────
type StatusConfig = {
  icon: string;
  title: string;
  subtitle: string;
  bg: string;
  ring: string;
  textColor: string;
};

function getStatusConfig(status: PaymentLinkPublic["status"] | "loading" | "error"): StatusConfig {
  switch (status) {
    case "pending":
      return {
        icon: "⏳",
        title: "Pago pendiente",
        subtitle: "Abre la app de Nequi y aprueba el cobro.",
        bg: "bg-amber-500/10",
        ring: "ring-amber-500/30",
        textColor: "text-amber-400",
      };
    case "paid":
      return {
        icon: "✅",
        title: "¡Pago recibido!",
        subtitle: "Tu pago fue procesado exitosamente. ¡Gracias!",
        bg: "bg-green-500/10",
        ring: "ring-green-500/30",
        textColor: "text-green-400",
      };
    case "expired":
      return {
        icon: "⌛",
        title: "Link expirado",
        subtitle: "Este link de pago ya venció. Solicita uno nuevo al consultorio.",
        bg: "bg-white/5",
        ring: "ring-white/10",
        textColor: "text-white/40",
      };
    case "rejected":
      return {
        icon: "❌",
        title: "Pago rechazado",
        subtitle: "El cobro fue rechazado por Nequi. Verifica tu cuenta e intenta de nuevo.",
        bg: "bg-red-500/10",
        ring: "ring-red-500/30",
        textColor: "text-red-400",
      };
    case "cancelled":
      return {
        icon: "🚫",
        title: "Link cancelado",
        subtitle: "Este link fue cancelado. Contacta al consultorio para más información.",
        bg: "bg-white/5",
        ring: "ring-white/10",
        textColor: "text-white/40",
      };
    case "error":
      return {
        icon: "⚠️",
        title: "Link no encontrado",
        subtitle: "El link que buscas no existe o es inválido.",
        bg: "bg-white/5",
        ring: "ring-white/10",
        textColor: "text-white/40",
      };
    default:
      return {
        icon: "⏳",
        title: "Cargando...",
        subtitle: "",
        bg: "bg-white/5",
        ring: "ring-white/10",
        textColor: "text-white/40",
      };
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PagarPage() {
  const params = useParams();
  const token = params?.token as string;

  const [link, setLink]           = useState<PaymentLinkPublic | null>(null);
  const [fetchStatus, setFetchStatus] = useState<"loading" | "error" | "ok">("loading");
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const linkRef = useRef<PaymentLinkPublic | null>(null);
  linkRef.current = link;

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/pay/${token}`)
      .then(res => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: PaymentLinkPublic) => {
        setLink(data);
        setFetchStatus("ok");
      })
      .catch(() => setFetchStatus("error"));
  }, [token]);

  // ── Polling every 5 s while pending ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const current = linkRef.current;
      if (!current || current.status !== "pending") return;
      fetch(`${API_URL}/api/v1/pay/${token}`)
        .then(res => res.ok ? res.json() : null)
        .then((data: PaymentLinkPublic | null) => {
          if (data) setLink(data);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // ── Countdown tick (1 s) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!link || link.status !== "pending") return;
    const tick = () => {
      const diff = Math.floor((new Date(link.expires_at).getTime() - Date.now()) / 1000);
      setSecondsLeft(diff > 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [link]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const displayStatus = fetchStatus === "error" ? "error" : (link?.status ?? "loading");
  const cfg = getStatusConfig(displayStatus);
  const isPending = link?.status === "pending";
  const isTerminal = link && link.status !== "pending";

  return (
    <div className="min-h-screen bg-[#07101f] flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">🦷</div>
        <h1 className="text-white font-semibold text-xl tracking-tight">Técnica Dental JC</h1>
        <p className="text-white/40 text-sm mt-1">Portal de pagos</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className={`rounded-2xl p-6 ring-1 ${cfg.bg} ${cfg.ring} text-center`}>

          {/* Status icon */}
          <div className="text-5xl mb-4">{cfg.icon}</div>

          {/* Status title */}
          <h2 className={`text-lg font-semibold mb-1 ${cfg.textColor}`}>{cfg.title}</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-5">{cfg.subtitle}</p>

          {/* Amount */}
          {link && (
            <div className="bg-white/5 rounded-xl px-4 py-3 mb-5">
              <p className="text-white/40 text-xs mb-0.5">Monto a pagar</p>
              <p className="text-white text-2xl font-bold">{formatCOP(link.amount)}</p>
            </div>
          )}

          {/* Countdown (pending only) */}
          {isPending && secondsLeft > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-400 text-sm mb-5">
              <span>⏱</span>
              <span>Expira en <span className="font-mono font-bold">{formatCountdown(secondsLeft)}</span></span>
            </div>
          )}

          {/* Expired countdown */}
          {isPending && secondsLeft === 0 && (
            <div className="text-white/35 text-sm mb-5">
              Este link ha expirado.
            </div>
          )}

          {/* Phone hint (pending) */}
          {isPending && link && (
            <div className="text-white/40 text-xs leading-relaxed">
              Se enviará una solicitud de cobro a{" "}
              <span className="text-white/60 font-medium">{link.phone_number}</span> vía Nequi.
              Abre la app y aprueba el cobro.
            </div>
          )}

          {/* Terminal states — no action needed */}
          {isTerminal && (
            <div className="text-white/30 text-xs mt-2">
              Token: <span className="font-mono">{token}</span>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {fetchStatus === "loading" && (
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-white/5 rounded-full w-3/4 mx-auto animate-pulse" />
            <div className="h-3 bg-white/5 rounded-full w-1/2 mx-auto animate-pulse" />
          </div>
        )}

        {/* Polling indicator */}
        {isPending && (
          <p className="text-center text-white/25 text-xs mt-4">
            Actualizando automáticamente…
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="mt-10 text-white/20 text-xs text-center">
        © 2025 Técnica Dental JC · Todos los derechos reservados
      </p>
    </div>
  );
}
