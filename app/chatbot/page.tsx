"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, Btn } from "@/components/ui";
import Portal from "@/components/ui/Portal";
import { authFetch } from "@/lib/auth";
import { useRefreshOnFocus } from "@/lib/useRefreshOnFocus";
import { Bot, Save, Phone, MapPin, Clock, Link, Mail, FileText, Info } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const BASE    = `${API_URL}/api/v1`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatConfig {
  whatsapp:       string;
  address:        string;
  business_hours: string;
  policy_url:     string;
  contact_email:  string;
  extra_info:     string;
}

interface Toast { msg: string; type: "success" | "error"; }

const empty: ChatConfig = {
  whatsapp:       "",
  address:        "",
  business_hours: "",
  policy_url:     "",
  contact_email:  "",
  extra_info:     "",
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastNotif({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <Portal>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border
        ${toast.type === "success"
          ? "bg-green-500/20 border-green-500/30 text-green-300"
          : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
        {toast.type === "success" ? "✅" : "❌"} {toast.msg}
      </div>
    </Portal>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function Field({ icon, label, hint, children }: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-white/50 text-xs mb-1.5">
        <span className="text-white/25">{icon}</span>
        {label}
      </label>
      {children}
      {hint && <p className="text-white/25 text-xs mt-1">{hint}</p>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const [form,    setForm]    = useState<ChatConfig>(empty);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<Toast | null>(null);

  const showToast = (msg: string, type: Toast["type"]) => setToast({ msg, type });

  const loadConfig = useCallback(async () => {
    try {
      const r = await authFetch(`${BASE}/admin/chat-config`);
      if (r.ok) setForm(await r.json());
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useRefreshOnFocus(loadConfig);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/admin/chat-config`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      showToast("Configuración guardada correctamente", "success");
    } catch {
      showToast("Error al guardar la configuración", "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof ChatConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <AdminLayout>
      {toast && <ToastNotif toast={toast} onClose={() => setToast(null)} />}

      <PageHeader
        title="Configuración del Chatbot IA"
        subtitle="Información que el asistente usará para responder a los pacientes"
      />

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 bg-cyan-500/8 border border-cyan-500/20 rounded-2xl px-5 py-4 mb-8">
        <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-white/60 text-sm leading-relaxed">
          Los cambios se aplican <span className="text-cyan-400 font-medium">de inmediato</span> — el próximo
          mensaje al chatbot ya usará la nueva información sin necesidad de redesplegar nada.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">

        {loading ? (
          /* Skeleton */
          <div className="space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-32 bg-white/5 rounded-full animate-pulse" />
                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── Datos de contacto ── */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Phone size={14} className="text-cyan-400" /> Datos de contacto
              </h2>

              <Field icon={<Phone size={13} />} label="WhatsApp / Teléfono">
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={set("whatsapp")}
                  placeholder="+57 310 123 4567"
                  className="form-input text-sm"
                />
              </Field>

              <Field icon={<MapPin size={13} />} label="Dirección">
                <input
                  type="text"
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Calle 45 #23-10, Bogotá"
                  className="form-input text-sm"
                />
              </Field>

              <Field icon={<Clock size={13} />} label="Horario de atención">
                <input
                  type="text"
                  value={form.business_hours}
                  onChange={set("business_hours")}
                  placeholder="Lunes a Viernes 8am–6pm, Sábados 8am–12pm"
                  className="form-input text-sm"
                />
              </Field>

              <Field icon={<Mail size={13} />} label="Email de contacto">
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={set("contact_email")}
                  placeholder="info@dentaljc.com"
                  className="form-input text-sm"
                />
              </Field>

              <Field
                icon={<Link size={13} />}
                label="URL Política de datos (Ley 1581)"
                hint="El chatbot la comparte cuando el usuario pregunta por privacidad o PQRSF"
              >
                <input
                  type="text"
                  value={form.policy_url}
                  onChange={set("policy_url")}
                  placeholder="https://dentaljc.com/politica-de-datos"
                  className="form-input text-sm"
                  autoComplete="off"
                />
              </Field>
            </div>

            {/* ── Información adicional ── */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-cyan-400" /> Información adicional / FAQs
                </h2>
                <p className="text-white/35 text-xs">
                  Escribe aquí todo lo que quieras que el bot sepa: formas de pago, restricciones, preguntas frecuentes,
                  políticas del laboratorio, etc. El chatbot lo leerá textualmente como parte de su contexto.
                </p>
              </div>

              <textarea
                rows={8}
                value={form.extra_info}
                onChange={set("extra_info")}
                placeholder={`Ej:\n- Aceptamos pagos en Nequi, efectivo y transferencia bancaria.\n- Somos un laboratorio técnico dental, no atendemos pacientes directamente.\n- Para agendar cita el paciente debe ser referido por un odontólogo.\n- Los trabajos tienen garantía de 6 meses por defectos de fabricación.\n- No hacemos urgencias sin cita previa.`}
                className="form-input text-sm resize-y min-h-[180px] font-mono leading-relaxed"
              />
            </div>

            {/* ── Guardar ── */}
            <div className="flex justify-end pt-2">
              <Btn variant="primary" onClick={handleSave} disabled={saving}>
                <Save size={15} />
                {saving ? "Guardando..." : "Guardar configuración"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
