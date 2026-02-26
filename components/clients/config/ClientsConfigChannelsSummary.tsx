"use client";

import { ClientCatalogType } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionLoadClientAcquisitionDefaults, actionLoadClientCatalogDefaults } from "@/app/admin/clientes/actions";
import ClientsConfigManagerDrawer from "@/components/clients/config/ClientsConfigManagerDrawer";
import ClientsConfigManagerRenderer, { type ClientsConfigManagerPayload } from "@/components/clients/config/ClientsConfigManagerRenderer";
import type { ClientsConfigScope, ClientsConfigSourceState } from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

type ChannelEntry = {
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

function parseCatalogType(managerComponentId: string): ClientCatalogType | null {
  if (!managerComponentId.startsWith("catalog:")) return null;
  const token = managerComponentId.split(":")[1] ?? "";
  if (!token) return null;
  const maybe = token.trim().toUpperCase() as ClientCatalogType;
  return Object.values(ClientCatalogType).includes(maybe) ? maybe : null;
}

export default function ClientsConfigChannelsSummary({
  entries,
  payload
}: {
  entries: ChannelEntry[];
  payload: ClientsConfigManagerPayload;
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeLoadingKey, setActiveLoadingKey] = useState<string | null>(null);
  const [feedbackByKey, setFeedbackByKey] = useState<Record<string, string>>({});
  const openEntry = useMemo(() => entries.find((entry) => entry.key === openKey) ?? null, [entries, openKey]);

  const loadDefaults = (entry: ChannelEntry) => {
    setActiveLoadingKey(entry.key);

    startTransition(async () => {
      try {
        if (entry.managerComponentId === "channels:acquisition_sources") {
          const result = await actionLoadClientAcquisitionDefaults();
          setFeedbackByKey((prev) => ({
            ...prev,
            [entry.key]: `Iniciales cargadas: ${result.createdSources} fuentes nuevas, ${result.createdDetails} detalles nuevos.`
          }));
        } else {
          const catalogType = parseCatalogType(entry.managerComponentId);
          if (!catalogType) {
            throw new Error("Este manager no soporta carga inicial automática.");
          }
          const result = await actionLoadClientCatalogDefaults({ type: catalogType });
          setFeedbackByKey((prev) => ({
            ...prev,
            [entry.key]: `Iniciales cargadas: ${result.created} nuevas, ${result.reactivated} reactivadas.`
          }));
        }

        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudieron cargar iniciales.");
      } finally {
        setActiveLoadingKey(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Autoguía</p>
        <p className="mt-1 text-sm text-slate-600">
          Administra catálogos comerciales por bloque. Abre solo el manager que necesitas y evita el scroll largo.
        </p>
      </section>

      {!entries.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          No hay catálogos visibles. Revisa si fueron marcados como deprecados en Resumen.
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => {
            const isEmpty = entry.activeItems + entry.inactiveItems === 0;
            const canLoadDefaults = entry.managerComponentId === "channels:acquisition_sources" || Boolean(parseCatalogType(entry.managerComponentId));

            return (
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
                  <span className="font-semibold text-slate-700">Qué es:</span>{" "}
                  {entry.summary || "Catálogo comercial para normalizar atributos y reportes del módulo Clientes."}
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

                {isEmpty ? (
                  <ChannelEmptyState
                    canLoadDefaults={canLoadDefaults}
                    loading={activeLoadingKey === entry.key && isPending}
                    onLoadDefaults={() => loadDefaults(entry)}
                    feedback={feedbackByKey[entry.key] ?? null}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setOpenKey(entry.key)}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Administrar
                </button>
              </section>
            );
          })}
        </div>
      )}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <ClientsConfigManagerDrawer
        open={Boolean(openEntry)}
        onClose={() => setOpenKey(null)}
        title={openEntry?.label ?? "Catálogo comercial"}
        subtitle={openEntry ? `${SCOPE_LABELS[openEntry.scope]} · Gobierno de catálogos` : undefined}
      >
        {openEntry ? <ClientsConfigManagerRenderer managerComponentId={openEntry.managerComponentId} payload={payload} /> : null}
      </ClientsConfigManagerDrawer>
    </div>
  );
}

function ChannelEmptyState({
  canLoadDefaults,
  loading,
  onLoadDefaults,
  feedback
}: {
  canLoadDefaults: boolean;
  loading: boolean;
  onLoadDefaults: () => void;
  feedback: string | null;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-semibold">Catálogo vacío</p>
      <p>Impacto: campos comerciales quedan sin opciones y baja la trazabilidad en reportes.</p>
      {canLoadDefaults ? (
        <button
          type="button"
          onClick={onLoadDefaults}
          disabled={loading}
          className={cn(
            "inline-flex h-9 items-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 hover:border-amber-400",
            loading && "cursor-not-allowed opacity-60"
          )}
        >
          Cargar iniciales
        </button>
      ) : null}
      {feedback ? <p className="text-emerald-700">{feedback}</p> : null}
    </section>
  );
}
