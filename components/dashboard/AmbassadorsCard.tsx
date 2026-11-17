"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { getReferralNetwork, type Ambassador } from "@/lib/referrals";

// ── Fila de embajador ─────────────────────────────────────────────────────────

function AmbassadorRow({ data, position, maxNetwork }: {
  data:       Ambassador;
  position:   number;
  maxNetwork: number;
}) {
  const { name, document_number, direct, network_total } = data;

  // Ancho de la barra relativo al embajador más influyente
  const networkPct = maxNetwork > 0 ? (network_total / maxNetwork) * 100 : 0;
  // Porción de esa barra que corresponde a referidos directos
  const directPct  = network_total > 0 ? (direct / network_total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="text-ink/55 text-xs font-semibold w-4 tabular shrink-0">{position}</span>
        <p className="text-ink text-sm font-medium truncate flex-1 min-w-0">{name || "Paciente"}</p>
        <span className="text-ink font-semibold text-sm tabular shrink-0">{network_total}</span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1 ml-6">
        <p className="text-ink/60 text-xs truncate tabular">CC {document_number}</p>
        <p className="text-ink/60 text-xs shrink-0">Red: {network_total} · Directos: {direct}</p>
      </div>

      {/* Barra: total de la red, con la porción directa resaltada */}
      <div className="ml-6 mt-2 h-1.5 bg-ink/[0.07] rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent/35 transition-all"
          style={{ width: `${networkPct}%` }}>
          <div className="h-full rounded-full bg-accent"
            style={{ width: `${directPct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────

export default function AmbassadorsCard({ bodyHeight = "h-[260px]" }: { bodyHeight?: string }) {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

  useEffect(() => {
    let active = true;

    getReferralNetwork({ depth: 5, limit: 10 })
      .then((list) => { if (active) setAmbassadors(list); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const maxNetwork = Math.max(...ambassadors.map((a) => a.network_total), 1);

  return (
    <div className="glass-card rounded-xl p-5 min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-ink font-semibold text-base truncate">Embajadores</h2>
        <span className="text-ink/60 text-xs shrink-0">red completa</span>
      </div>

      <div className={`${bodyHeight} overflow-y-auto`}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <AlertTriangle size={26} className="text-amber-600" aria-hidden="true" />
            <p className="text-ink/60 text-sm">No pudimos cargar la red de referidos.</p>
          </div>
        ) : ambassadors.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-ink/60 text-sm text-center px-4">
            Aún no hay referidos registrados.
          </div>
        ) : (
          <div className="space-y-3.5">
            {ambassadors.map((a, i) => (
              <AmbassadorRow
                key={a.document_number}
                data={a}
                position={i + 1}
                maxNetwork={maxNetwork}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
