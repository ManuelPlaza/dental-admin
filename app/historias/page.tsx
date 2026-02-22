"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, Modal, EmptyState, Skeleton, Btn } from "@/components/ui";
import { api, ClinicalRecord, Patient, Specialist } from "@/lib/api";
import { fullName, formatDateShort } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";

const initialForm = {
  patient_id: "",
  specialist_id: "",
  attention_date: new Date().toISOString().split("T")[0],
  next_appointment: "",
  reason: "",
  medical_history: "",
  clinical_exam: "",
  diagnosis: "",
  treatment: "",
  observations: "",
};

export default function HistoriasPage() {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<ClinicalRecord | null>(null);

  useEffect(() => {
    Promise.all([
      api.getClinicalRecords().catch(() => []),
      api.getPatients().catch(() => []),
      api.getSpecialists().catch(() => []),
    ]).then(([r, p, s]) => {
      setRecords(r);
      setPatients(p);
      setSpecialists(s);
      setLoading(false);
    });
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return !q ||
      (r.patient && fullName(r.patient).toLowerCase().includes(q)) ||
      r.diagnosis?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.specialist_id || !form.reason || !form.diagnosis) {
      alert("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      const newRecord = await api.createClinicalRecord({
        ...form,
        patient_id: Number(form.patient_id),
        specialist_id: Number(form.specialist_id),
      });
      setRecords((prev) => [newRecord, ...prev]);
      setShowModal(false);
      setForm(initialForm);
    } catch {
      alert("Error al crear la historia clínica");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type: "input" | "textarea" | "select" | "date" = "input", required = false) => (
    <div>
      <label className="text-white/60 text-xs font-medium mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          rows={3}
          placeholder={label + "..."}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="form-input resize-none"
        />
      ) : type === "select" ? null : (
        <input
          type={type === "date" ? "date" : "text"}
          placeholder={label}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="form-input"
        />
      )}
    </div>
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Historias Clínicas"
        subtitle="Gestión de historias clínicas de pacientes"
        action={
          <Btn onClick={() => setShowModal(true)} variant="primary">
            <Plus size={15} /> Nueva Historia
          </Btn>
        }
      />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por paciente, especialista o diagnóstico..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Paciente", "Especialista", "Fecha", "Motivo", "Diagnóstico", "Acciones"]} empty={filtered.length === 0}>
          {filtered.map((r) => (
            <TR key={r.id} onClick={() => setSelected(r)}>
              <TD><span className="font-medium text-white">{r.patient ? fullName(r.patient) : `Paciente #${r.patient_id}`}</span></TD>
              <TD className="text-white/60">{r.specialist ? fullName(r.specialist) : `Esp. #${r.specialist_id}`}</TD>
              <TD className="text-white/60">{formatDateShort(r.attention_date)}</TD>
              <TD className="text-white/60 max-w-xs truncate">{r.reason}</TD>
              <TD className="text-white/60 max-w-xs truncate">{r.diagnosis}</TD>
              <TD>
                <button onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">
                  Ver detalle
                </button>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<FileText size={40} />} message="No se encontraron historias clínicas" />
      )}

      {/* New Record Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Historia Clínica" wide>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 pb-2 border-b border-white/8">Datos del Paciente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Paciente <span className="text-red-400">*</span></label>
                <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className="form-input">
                  <option value="" className="bg-slate-900">Nombre del paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{fullName(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Fecha de Atención <span className="text-red-400">*</span></label>
                <input type="date" value={form.attention_date} onChange={(e) => setForm({ ...form, attention_date: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Especialista <span className="text-red-400">*</span></label>
                <select value={form.specialist_id} onChange={(e) => setForm({ ...form, specialist_id: e.target.value })} className="form-input">
                  <option value="" className="bg-slate-900">Nombre del especialista</option>
                  {specialists.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">{fullName(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Próxima Cita</label>
                <input type="date" value={form.next_appointment} onChange={(e) => setForm({ ...form, next_appointment: e.target.value })} className="form-input" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-4 pb-2 border-b border-white/8">Información Clínica</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Motivo de Consulta <span className="text-red-400">*</span></label>
                <textarea rows={3} placeholder="Describe el motivo de la consulta..." value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })} className="form-input resize-none" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Antecedentes Médicos</label>
                <textarea rows={3} placeholder="Antecedentes médicos relevantes..." value={form.medical_history}
                  onChange={(e) => setForm({ ...form, medical_history: e.target.value })} className="form-input resize-none" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Examen Clínico</label>
                <textarea rows={3} placeholder="Resultados del examen clínico..." value={form.clinical_exam}
                  onChange={(e) => setForm({ ...form, clinical_exam: e.target.value })} className="form-input resize-none" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Diagnóstico <span className="text-red-400">*</span></label>
                <textarea rows={3} placeholder="Diagnóstico..." value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="form-input resize-none" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Tratamiento</label>
                <textarea rows={3} placeholder="Tratamiento realizado o recomendado..." value={form.treatment}
                  onChange={(e) => setForm({ ...form, treatment: e.target.value })} className="form-input resize-none" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Observaciones</label>
                <textarea rows={3} placeholder="Observaciones adicionales..." value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })} className="form-input resize-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn type="submit" variant="primary" disabled={saving}>{saving ? "Guardando..." : "Guardar Historia"}</Btn>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Historia Clínica" wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Paciente", selected.patient ? fullName(selected.patient) : `#${selected.patient_id}`],
                ["Especialista", selected.specialist ? fullName(selected.specialist) : `#${selected.specialist_id}`],
                ["Fecha de Atención", formatDateShort(selected.attention_date)],
                ["Próxima Cita", selected.next_appointment ? formatDateShort(selected.next_appointment) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="glass-card rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-0.5">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
            {[
              ["Motivo de Consulta", selected.reason],
              ["Antecedentes Médicos", selected.medical_history],
              ["Examen Clínico", selected.clinical_exam],
              ["Diagnóstico", selected.diagnosis],
              ["Tratamiento", selected.treatment],
              ["Observaciones", selected.observations],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="glass-card rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1">{label}</p>
                <p className="text-white/80 text-sm leading-relaxed">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
