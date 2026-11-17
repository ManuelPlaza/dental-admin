"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "dental_splash_seen";
// Debe coincidir con la duración de `splash-out` en globals.css (retardo + animación).
const TOTAL_MS = 3350;

/** Marca vectorial: cuadro con diagonal turquesa/azul marino y la muela en blanco. */
function BrandMark() {
  return (
    <svg className="splash-mark" viewBox="0 0 120 120" role="img" aria-label="Dental JC">
      <defs>
        <clipPath id="splash-clip"><rect x="6" y="6" width="108" height="108" rx="27" /></clipPath>
        <linearGradient id="splash-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#splash-clip)">
        <rect x="6" y="6" width="108" height="108" fill="#00234B" />
        <polygon points="6,6 114,6 114,12 14,112 6,114" fill="#3FD4C5" />
        {/* Muela: primero se dibuja el contorno y luego se rellena */}
        <g transform="translate(20.5 15) scale(0.79)">
          <path className="splash-tooth-fill" d="M50 22C40 6 11 4 9 34C8 54 20 62 22 84C23 100 30 112 37 100C43 88 42 70 50 70C58 70 57 88 63 100C70 112 77 100 78 84C80 62 92 54 91 34C89 4 60 6 50 22Z" fill="#fff" />
          <path className="splash-tooth-line" pathLength={1} d="M50 22C40 6 11 4 9 34C8 54 20 62 22 84C23 100 30 112 37 100C43 88 42 70 50 70C58 70 57 88 63 100C70 112 77 100 78 84C80 62 92 54 91 34C89 4 60 6 50 22Z" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        {/* Brillo que cruza una sola vez */}
        <rect className="splash-sheen" x="-60" y="-10" width="46" height="140" fill="url(#splash-sheen)" transform="skewX(-18)" />
      </g>
      {/* Destello de limpieza */}
      <path className="splash-sparkle" d="M99 20 L102 28 L110 31 L102 34 L99 42 L96 34 L88 31 L96 28 Z" fill="#fff" />
    </svg>
  );
}

export default function SplashScreen() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* sin almacenamiento: se muestra igual */ }
    const t = setTimeout(() => setGone(true), TOTAL_MS + 100);
    return () => clearTimeout(t);
  }, []);

  const skip = () => setLeaving(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (gone) return null;

  return (
    <div
      className={`splash${leaving ? " splash-skip" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando el panel de Dental JC"
      onClick={skip}
    >
      <div className="splash-glow" aria-hidden="true" />
      <div className="splash-center">
        <div className="splash-ring-wrap">
          <span className="splash-ring" aria-hidden="true" />
          <BrandMark />
        </div>
        <p className="splash-word">Dental <span>JC</span></p>
        <p className="splash-tag">Estética oral &amp; prevención</p>

        <div className="splash-progress" aria-hidden="true"><i /></div>
        <div className="splash-status" aria-hidden="true">
          <span>Preparando tu agenda…</span>
          <span>Revisando las citas de hoy…</span>
          <span>Todo listo</span>
        </div>
      </div>
    </div>
  );
}
