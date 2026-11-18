"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { resolveMedia } from "./ImageUploader";

/**
 * Vista previa fiel de cómo se verá el banner en la landing:
 * mismo recorte (object-cover centrado), misma sombra de lectura y mismo texto superpuesto.
 */
export default function BannerPreview({
  title, description, desktopUrl, mobileUrl,
}: { title: string; description: string; desktopUrl: string; mobileUrl: string }) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const isMobile = view === "mobile";
  // En el sitio, el celular usa la imagen móvil y, si no hay, la de escritorio
  const src = isMobile ? (mobileUrl || desktopUrl) : desktopUrl;
  const usingFallback = isMobile && !mobileUrl && !!desktopUrl;
  const hasText = !!(title.trim() || description.trim());

  const tab = (v: "desktop" | "mobile", icon: React.ReactNode, text: string) => (
    <button
      type="button" onClick={() => setView(v)} aria-pressed={view === v}
      className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold transition-colors
        ${view === v ? "bg-surface text-accent-strong shadow-card" : "text-ink/65 hover:text-ink"}`}
    >{icon}{text}</button>
  );

  return (
    <div className="rounded-2xl border border-line bg-page p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-ink">Vista previa</p>
          <p className="text-xs text-ink/65">Así se verá en el sitio web</p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-ink/[0.06]" role="group" aria-label="Dispositivo de la vista previa">
          {tab("desktop", <Monitor size={15} />, "Computador")}
          {tab("mobile", <Smartphone size={15} />, "Celular")}
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={`relative overflow-hidden bg-slate-900 shadow-pop ${isMobile ? "w-[min(100%,260px)] rounded-[22px] border-[6px] border-ink" : "w-full rounded-xl border border-line"}`}
          style={{ aspectRatio: isMobile ? "0.92" : "8 / 3" }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMedia(src)} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-sm text-white/70">
              Sube una imagen para ver cómo queda
            </div>
          )}
          {src && (
            <>
              <div className="absolute inset-x-0 top-0 h-[22%] pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)" }} />
              {hasText && <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />}
              {hasText && (
                <div className={`absolute bottom-0 inset-x-0 pointer-events-none ${isMobile ? "px-3.5 pb-4" : "px-[4%] pb-[4%]"}`}>
                  {title.trim() && (
                    <p className={`text-white font-bold leading-tight drop-shadow-lg font-serif ${isMobile ? "text-[15px] mb-0.5" : "text-xl sm:text-2xl lg:text-3xl mb-1"}`}>{title}</p>
                  )}
                  {description.trim() && (
                    <p className={`text-white/85 font-light drop-shadow ${isMobile ? "text-[11px]" : "text-xs sm:text-sm"}`}>{description}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {usingFallback && (
        <p className="mt-3 text-xs text-amber-700 text-center">
          No subiste imagen para celular: en el celular se usará la de computador (con recorte). Para mejor resultado, sube una imagen vertical.
        </p>
      )}
    </div>
  );
}
