"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton } from "@/components/ui";
import { api, Specialist } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { UserCog } from "lucide-react";

export default function EspecialistasPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getSpecialists().catch(() => []).then(setSpecialists).finally(() => setLoading(false));
  }, []);

  const filtered = specialists.filter((s) => {
    const q = search.toLowerCase();
    return !q ||
      fullName(s).toLowerCase().includes(q) ||
      s.specialty?.toLowerCase().includes(q) ||
      s.license_number?.toLowerCase().includes(q);
  });

  const toggleActive = async (s: Specialist) => {
    try {
      await api.updateSpecialist(s.id, { is_active: !s.is_active });
      setSpecialists((prev) => prev.map((sp) => sp.id === s.id ? { ...sp, is_active: !sp.is_active } : sp));
    } catch { alert("Error al actualizar especialista"); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Especialistas" subtitle="Gestión de personal médico" />
      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, especialidad o licencia..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Nombre", "Especialidad", "Licencia", "Teléfono", "Estado", "Acciones"]} empty={filtered.length === 0}>
          {filtered.map((s) => (
            <TR key={s.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-600/30 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
                    {s.first_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-white">{fullName(s)}</span>
                </div>
              </TD>
              <TD className="text-white/60">{s.specialty}</TD>
              <TD className="text-white/60">{s.license_number}</TD>
              <TD className="text-white/60">{s.phone}</TD>
              <TD>
                <span className={`badge ${s.is_active ? "badge-completed" : "badge-cancelled"}`}>
                  {s.is_active ? "Activo" : "Inactivo"}
                </span>
              </TD>
              <TD>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={s.is_active} onChange={() => toggleActive(s)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-cyan-500 rounded-full transition-all peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all" />
                </label>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<UserCog size={40} />} message="No se encontraron especialistas" />
      )}
    </AdminLayout>
  );
}
