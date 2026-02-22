import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { EncounterRecentHistory } from "./types";

export default function RecentHistoriesCard({ items }: { items: EncounterRecentHistory[] }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">Últimos 3 historiales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
            Sin historiales previos (mock).
          </div>
        ) : (
          items.slice(0, 3).map((hx) => (
            <div key={hx.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{hx.date}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {hx.principalDxCode ? `DX ${hx.principalDxCode}` : "DX —"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{hx.summary}</div>
                </div>
                <Link
                  href={`/modulo-medico/consultaM/${encodeURIComponent(hx.encounterId)}`}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  Ver
                </Link>
              </div>
            </div>
          ))
        )}

        <div className="text-[11px] text-slate-500">
          TODO(encounter-history): cargar historiales previos desde Encounter/Notes por paciente (solo lectura).
        </div>
      </CardContent>
    </Card>
  );
}
