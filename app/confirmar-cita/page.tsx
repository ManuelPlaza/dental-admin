"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle, XCircle } from "lucide-react";

// ── Ícono diente ──────────────────────────────────────────────────────────────
function ToothIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C9.5 2 7.5 3.5 6 5c-1 1-2 1.5-3 1.5C2.5 6.5 2 7 2 8c0 2 .5 4 1.5 6.5C4.5 17 5.5 22 7 22c1 0 1.5-1.5 2-3 .5-1.5 1-2.5 3-2.5s2.5 1 3 2.5c.5 1.5 1 3 2 3 1.5 0 2.5-5 3.5-7.5C21.5 12 22 10 22 8c0-1-.5-1.5-1-1.5-1 0-2-.5-3-1.5C16.5 3.5 14.5 2 12 2z" />
    </svg>
  );
}

// ── Lógica principal ──────────────────────────────────────────────────────────
function ConfirmarCitaContent() {
  const searchParams = useSearchParams();
  const [status, setStatus]   = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [visible, setVisible]  = useState(false);

useEffect(() => {
  const success = searchParams.get("success");
  const error   = searchParams.get("error");
  const token   = searchParams.get("token");

  if (success === "true") {
    setTimeout(() => {
      setStatus("success");
      requestAnimationFrame(() => setVisible(true));
    }, 600);
    return;
  }

  if (error) {
    setTimeout(() => {
      setStatus("error");
      setErrorMsg(decodeURIComponent(error));
      requestAnimationFrame(() => setVisible(true));
    }, 600);
    return;
  }

  if (token) {
    // Llamar al backend con el token
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    fetch(`${apiUrl}/api/v1/appointments/confirm?token=${token}`, {
      method: "GET",
      redirect: "manual", // No seguir el redirect automáticamente
    })
      .then(() => {
        setStatus("success");
        requestAnimationFrame(() => setVisible(true));
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("No se pudo confirmar la cita. Por favor comunícate con nosotros.");
        requestAnimationFrame(() => setVisible(true));
      });
    return;
  }

  // Sin params válidos
  setStatus("error");
  setErrorMsg("Token no válido o expirado.");
  requestAnimationFrame(() => setVisible(true));
}, [searchParams]);

  // animar entrada cuando status cambia
  useEffect(() => {
    if (status !== "loading") {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #070f1c 0%, #0a1628 60%, #07101f 100%)" }}
    >
      {/* Glows de fondo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(29,114,184,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(29,114,184,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* Logo arriba */}
      <div
        className="flex items-center gap-3 mb-8 z-10"
        style={{ opacity: 1, transition: "opacity 0.5s ease" }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #1d72b8, #0c4a8a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(29,114,184,0.35)",
        }}>
          <ToothIcon />
        </div>
        <div>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
            Dental Admin
          </p>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Técnica Dental JC
          </p>
        </div>
      </div>

      {/* Card principal */}
      <div
        className="z-10 w-full"
        style={{
          maxWidth: 440,
          opacity:  visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          textAlign: "center",
        }}>

          {/* ── LOADING ─────────────────────────────────────────── */}
          {status === "loading" && (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{
                  width: 56, height: 56,
                  border: "3px solid rgba(255,255,255,0.08)",
                  borderTop: "3px solid #1d72b8",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: 0 }}>
                Verificando tu confirmación...
              </p>
            </>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────── */}
          {status === "success" && (
            <>
              {/* Círculo con ícono */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "rgba(34,197,94,0.1)",
                  border: "2px solid rgba(34,197,94,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 40px rgba(34,197,94,0.15)",
                }}>
                  <CheckCircle size={46} color="#22c55e" strokeWidth={1.5} />
                </div>
              </div>

              {/* Título */}
              <h1 style={{
                color: "#ffffff", fontSize: 26, fontWeight: 700,
                margin: "0 0 12px", letterSpacing: "-0.5px",
              }}>
                ¡Cita Confirmada!
              </h1>

              {/* Divider */}
              <div style={{
                width: 40, height: 2, borderRadius: 2,
                background: "linear-gradient(90deg, #22c55e, transparent)",
                margin: "0 auto 20px",
              }} />

              {/* Mensaje principal */}
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.65, margin: "0 0 20px" }}>
                Tu asistencia ha sido registrada exitosamente.<br />
                <strong style={{ color: "#ffffff" }}>¡Te esperamos!</strong>
              </p>

              {/* Mensaje secundario */}
              <div style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.15)",
                borderRadius: 12,
                padding: "14px 18px",
              }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  📅 Recuerda llegar <strong style={{ color: "rgba(255,255,255,0.65)" }}>10 minutos antes</strong> de tu cita.
                </p>
              </div>
            </>
          )}

          {/* ── ERROR ───────────────────────────────────────────── */}
          {status === "error" && (
            <>
              {/* Círculo con ícono */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "rgba(239,68,68,0.1)",
                  border: "2px solid rgba(239,68,68,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 40px rgba(239,68,68,0.12)",
                }}>
                  <XCircle size={46} color="#ef4444" strokeWidth={1.5} />
                </div>
              </div>

              {/* Título */}
              <h1 style={{
                color: "#ffffff", fontSize: 24, fontWeight: 700,
                margin: "0 0 12px", letterSpacing: "-0.4px",
              }}>
                No se pudo confirmar la cita
              </h1>

              {/* Divider */}
              <div style={{
                width: 40, height: 2, borderRadius: 2,
                background: "linear-gradient(90deg, #ef4444, transparent)",
                margin: "0 auto 20px",
              }} />

              {/* Mensaje de error exacto del backend */}
              <div style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.18)",
                borderRadius: 12,
                padding: "16px 18px",
                marginBottom: 20,
              }}>
                <p style={{ color: "#fca5a5", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  {errorMsg || "Ha ocurrido un error inesperado."}
                </p>
              </div>

              {/* Mensaje secundario */}
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Por favor comunícate con nosotros directamente.
              </p>
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <p style={{
        color: "rgba(255,255,255,0.12)", fontSize: 12, marginTop: 32, zIndex: 10,
        textAlign: "center",
      }}>
        © {new Date().getFullYear()} Técnica Dental JC · Todos los derechos reservados
      </p>

      {/* Keyframes para el spinner */}
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Export con Suspense (obligatorio para useSearchParams en Next.js 14) ──────
export default function ConfirmarCitaPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#07101f",
      }}>
        <div style={{
          width: 48, height: 48,
          border: "3px solid rgba(255,255,255,0.08)",
          borderTop: "3px solid #1d72b8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ConfirmarCitaContent />
    </Suspense>
  );
}
