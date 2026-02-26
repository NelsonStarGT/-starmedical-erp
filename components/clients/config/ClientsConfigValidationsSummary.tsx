"use client";

import { useMemo, useState } from "react";
import ClientsConfigManagerDrawer from "@/components/clients/config/ClientsConfigManagerDrawer";
import ClientsConfigManagerRenderer, { type ClientsConfigManagerPayload } from "@/components/clients/config/ClientsConfigManagerRenderer";
import type { ClientsConfigScope, ClientsConfigSourceState } from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

type ValidationEntry = {
  key: string;
  label: string;
  summary?: string;
  managerComponentId: string;
  source: ClientsConfigSourceState;
  scope: ClientsConfigScope;
  activeItems: number;
  inactiveItems: number;
  usedBy: string[];
  dependsOn: string[];
};

const SOURCE_BADGE_STYLES: Record<ClientsConfigSourceState, string> = {
  db: "border-emerald-200 bg-emerald-50 text-emerald-700",
  fallback: "border-amber-200 bg-amber-50 text-amber-700",
  defaults: "border-amber-200 bg-amber-50 text-amber-700",
  "n/a": "border-slate-200 bg-slate-100 text-slate-600"
};

const SCOPE_LABELS: Record<ClientsConfigScope, string> = {
  tenant: "Por empresa",
  shared: "Global",
  legacy: "Legacy",
  future: "Futuro"
};

export default function ClientsConfigValidationsSummary({
  entries,
  payload
}: {
  entries: ValidationEntry[];
  payload: ClientsConfigManagerPayload;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openEntry = useMemo(() => entries.find((entry) => entry.key === openKey) ?? null, [entries, openKey]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Autoguía</p>
        <p className="mt-1 text-sm text-slate-600">
          Empieza por geografía (país/divisiones) y luego revisa documentos de validación para cerrar cobertura operativa.
        </p>
      </section>

      {!entries.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          No hay consolas de validación visibles en esta sección.
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {entries.map((entry) => (
            <section key={entry.key} className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-[#4aadf5]/30 bg-[#4aadf5]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    {SCOPE_LABELS[entry.scope]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      SOURCE_BADGE_STYLES[entry.source]
                    )}
                  >
                    {entry.source}
                  </span>
                </div>
              </div>

              <p className="truncate text-xs text-slate-600" title={entry.summary || undefined}>
                <span className="font-semibold text-slate-700">Qué es:</span> {entry.summary || "Consola de validación por país."}
              </p>
              <p className="truncate text-xs text-slate-500" title={entry.usedBy.join(" · ") || undefined}>
                <span className="font-semibold text-slate-700">Se usa en:</span>{" "}
                {entry.usedBy.length ? entry.usedBy.join(" · ") : "Sin uso registrado"}
              </p>

              <p className="text-xs text-slate-500">
                Items: <span className="font-semibold text-slate-700">{entry.activeItems}</span> activos ·{" "}
                <span className="font-semibold text-slate-700">{entry.inactiveItems}</span> inactivos
              </p>
              <p className="text-xs text-slate-500">Dependencias: {entry.dependsOn.length ? entry.dependsOn.join(" · ") : "—"}</p>

              <button
                type="button"
                onClick={() => setOpenKey(entry.key)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                Administrar
              </button>
            </section>
          ))}
        </div>
      )}

      <ClientsConfigManagerDrawer
        open={Boolean(openEntry)}
        onClose={() => setOpenKey(null)}
        title={openEntry?.label ?? "Validaciones"}
        subtitle={openEntry ? `${SCOPE_LABELS[openEntry.scope]} · Validaciones` : undefined}
      >
        {openEntry ? <ClientsConfigManagerRenderer managerComponentId={openEntry.managerComponentId} payload={payload} /> : null}
      </ClientsConfigManagerDrawer>
    </div>
  );
}
