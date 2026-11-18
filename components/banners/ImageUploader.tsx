"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const MAX_MB = 8;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Las imágenes subidas se guardan como "/media/xxx.jpg"; en el admin hay que anteponer el servidor. */
export function resolveMedia(url: string): string {
  return url.startsWith("/media/") ? `${API_URL}${url}` : url;
}

type Meta = { width: number; height: number; bytes: number };

export default function ImageUploader({
  label, required, kind, value, onChange, error, sizeHint, targetRatio, tooltip,
}: {
  label: string;
  required?: boolean;
  kind: "desktop" | "mobile";
  value: string;
  onChange: (url: string) => void;
  error?: string;
  sizeHint: string;          // "1920 × 720 px"
  targetRatio: number;       // ancho / alto ideal
  tooltip?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  const upload = async (file: File) => {
    setMsg("");
    if (!ACCEPT.split(",").includes(file.type)) { setMsg("Usa una imagen JPG, PNG o WebP."); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setMsg(`La imagen pesa más de ${MAX_MB} MB. Redúcela un poco e inténtalo de nuevo.`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await authFetch(`${API_URL}/api/v1/banners/upload`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || "No se pudo subir la imagen."); return; }
      setMeta({ width: data.width, height: data.height, bytes: data.bytes });
      onChange(data.url);
    } catch {
      setMsg("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const pick = (files: FileList | null) => { const f = files?.[0]; if (f) upload(f); };
  const ratioOff = meta ? Math.abs(meta.width / meta.height - targetRatio) / targetRatio > 0.25 : false;

  return (
    <div>
      <p className="form-label flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && <span className="text-ink/60 font-normal text-xs">· {tooltip}</span>}
      </p>

      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files)} tabIndex={-1} />

      {value ? (
        <div className="rounded-2xl border border-line bg-page overflow-hidden">
          <div className="relative bg-ink/5" style={{ aspectRatio: kind === "mobile" ? "16 / 9" : "8 / 3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveMedia(value)} alt={`Vista de la imagen ${kind}`} className="absolute inset-0 w-full h-full object-contain" />
            {busy && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center gap-2 text-sm font-medium text-ink">
                <Loader2 size={18} className="animate-spin" /> Subiendo…
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t border-line bg-surface">
            <span className="text-xs text-ink/65 flex items-center gap-1.5 mr-auto min-w-0">
              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
              {meta ? `${meta.width} × ${meta.height} px · ${Math.max(1, Math.round(meta.bytes / 1024))} KB` : "Imagen cargada"}
            </span>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-accent-strong hover:bg-accent/10 transition-colors">
              <RefreshCw size={14} /> Cambiar
            </button>
            <button type="button" onClick={() => { onChange(""); setMeta(null); setMsg(""); }} disabled={busy}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-500/10 transition-colors">
              <Trash2 size={14} /> Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files); }}
          disabled={busy}
          className={`w-full rounded-2xl border-2 border-dashed px-4 py-7 flex flex-col items-center gap-2 text-center transition-colors
            ${drag ? "border-accent bg-accent/10" : error ? "border-red-400 bg-red-500/5" : "border-slate-300 bg-page hover:border-accent hover:bg-accent/5"}`}
        >
          {busy ? <Loader2 size={26} className="animate-spin text-accent" /> : <ImagePlus size={26} className="text-accent" />}
          <span className="text-sm font-semibold text-ink">{busy ? "Subiendo imagen…" : "Toca para elegir la imagen"}</span>
          <span className="text-xs text-ink/65">o arrástrala aquí · JPG, PNG o WebP · hasta {MAX_MB} MB</span>
          <span className="text-xs text-ink/65">Tamaño ideal: <b className="font-semibold">{sizeHint}</b></span>
        </button>
      )}

      {(msg || error) && (
        <p className="mt-2 text-xs text-red-600 flex items-start gap-1.5"><AlertCircle size={14} className="shrink-0 mt-px" />{msg || error}</p>
      )}
      {ratioOff && !msg && (
        <p className="mt-2 text-xs text-amber-700 flex items-start gap-1.5">
          <AlertCircle size={14} className="shrink-0 mt-px" />
          Esta imagen no tiene la proporción ideal ({sizeHint}); en el sitio se recortará un poco en los bordes. Mira la vista previa.
        </p>
      )}

      <button type="button" onClick={() => setShowUrl((v) => !v)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink/65 hover:text-ink underline-offset-2 hover:underline">
        <Link2 size={12} /> {showUrl ? "Ocultar" : "Usar un enlace (URL) en su lugar"}
      </button>
      {showUrl && (
        <input
          type="text" autoComplete="off" value={value}
          onChange={(e) => { onChange(e.target.value); setMeta(null); }}
          placeholder="https://…/imagen.jpg"
          className="form-input text-sm mt-2"
        />
      )}
    </div>
  );
}
