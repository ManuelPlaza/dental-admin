"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PageHeader, SearchBar, Table, TR, TD, EmptyState, Skeleton } from "@/components/ui";
import { api, Service } from "@/lib/api";
import { formatCOP } from "@/lib/utils";
import { Briefcase } from "lucide-react";

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getServices().catch(() => []).then(setServices).finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const toggleActive = async (s: Service) => {
    try {
      await api.updateService(s.id, { is_active: !s.is_active });
      setServices((prev) => prev.map((sv) => sv.id === s.id ? { ...sv, is_active: !sv.is_active } : sv));
    } catch { alert("Error al actualizar servicio"); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Servicios" subtitle="Gestión de servicios dentales" />
      <div className="mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o categoría..." />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <Table headers={["Nombre", "Descripción", "Precio", "Duración", "Estado"]} empty={filtered.length === 0}>
          {filtered.map((s) => (
            <TR key={s.id}>
              <TD>
                <span className="font-medium text-white">{s.name}</span>
              </TD>
              <TD className="text-white/50 text-xs max-w-xs truncate">{s.description}</TD>
              <TD className="text-cyan-400 font-semibold">{formatCOP(s.price)}</TD>
              <TD className="text-white/60">{s.duration_minutes} min</TD>
              <TD>
                <div className="flex items-center gap-3">
                  <span className={`badge ${s.is_active ? "badge-completed" : "badge-cancelled"}`}>
                    {s.is_active ? "Activo" : "Inactivo"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={s.is_active} onChange={() => toggleActive(s)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-white/10 peer-checked:bg-cyan-500 rounded-full transition-all peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all" />
                  </label>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {filtered.length === 0 && !loading && (
        <EmptyState icon={<Briefcase size={40} />} message="No se encontraron servicios" />
      )}
    </AdminLayout>
  );
}
