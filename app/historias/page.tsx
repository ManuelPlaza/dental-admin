"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton, Btn } from "@/components/ui";
import { fullName, formatDateShort } from "@/lib/utils";
import { ClipboardList, FileDown } from "lucide-react";
import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE = `${API_URL}/api/v1`;

interface MedicalHistory {
  id: number;
  appointment_id: number;
  diagnosis: string;
  treatment: string;
  doctor_notes?: string;
  attachments?: string;
  next_appointment_date?: string;
  created_at: string;
  appointment?: {
    patient?: { id: number; first_name: string; last_name: string; document_number: string; };
    specialist?: { first_name: string; last_name: string; };
  };
}

export default function HistoriasPage() {
  const [records, setRecords] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    authFetch(`${BASE}/medical-history`)
      .then((r) => r.json())
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const patient = r.appointment?.patient;
    const specialist = r.appointment?.specialist;
    return (
      fullName(patient).toLowerCase().includes(q) ||
      patient?.document_number?.includes(q) ||
      r.diagnosis?.toLowerCase().includes(q) ||
      fullName(specialist).toLowerCase().includes(q)
    );
  });

  const handleViewPDF = async (record: MedicalHistory) => {
    const patientId = record.appointment?.patient?.id;
    if (!patientId) return;
    setDownloadingId(record.id);
    try {
      const res = await authFetch(`${BASE}/patients/${patientId}/medical-history/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("No se pudo generar el PDF");
    } finally { setDownloadingId(null); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Historias Clínicas" subtitle="Registro de atenciones médicas" />

      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por paciente, especialista o diagnóstico..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table
          headers={["Paciente", "Especialista", "Diagnóstico", "Tratamiento", "Notas", "Fecha", "PDF"]}
          empty={filtered.length === 0}
        >
          {filtered.map((r) => {
            const patient = r.appointment?.patient;
            const specialist = r.appointment?.specialist;
            return (
              <TR key={r.id}>
                <TD>
                  <p className="font-medium text-white">{fullName(patient)}</p>
                  <p className="text-white/40 text-xs">{patient?.document_number}</p>
                </TD>
                <TD className="text-white/70">{fullName(specialist) || "—"}</TD>
                <TD>
                  <p className="text-white/80 text-sm max-w-[180px] truncate" title={r.diagnosis}>{r.diagnosis}</p>
                </TD>
                <TD>
                  <p className="text-white/60 text-sm max-w-[180px] truncate" title={r.treatment}>{r.treatment}</p>
                </TD>
                <TD>
                  <p className="text-white/50 text-xs max-w-[140px] truncate" title={r.doctor_notes}>{r.doctor_notes || "—"}</p>
                </TD>
                <TD className="text-white/50 text-xs whitespace-nowrap">{formatDateShort(r.created_at)}</TD>
                <TD>
                  <Btn
                    variant="secondary"
                    size="sm"
                    disabled={!patient?.id || downloadingId === r.id}
                    onClick={() => handleViewPDF(r)}
                  >
                    <FileDown size={13} />
                    {downloadingId === r.id ? "..." : "PDF"}
                  </Btn>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<ClipboardList size={40} />} message="No se encontraron historias clínicas" />
      )}
    </AdminLayout>
  );
}