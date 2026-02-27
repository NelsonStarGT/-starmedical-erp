"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionLoadClientContactDepartmentDefaults,
  actionLoadClientContactJobTitleDefaults,
  actionLoadClientInsurerLineDefaults,
  actionLoadClientPbxCategoryDefaults
} from "@/app/admin/clientes/actions";
import ClientsConfigManagerDrawer from "@/components/clients/config/ClientsConfigManagerDrawer";
import ClientsConfigManagerRenderer, { type ClientsConfigManagerPayload } from "@/components/clients/config/ClientsConfigManagerRenderer";
import ResponsiveInfoCard from "@/components/ui/ResponsiveInfoCard";
import type { ClientsConfigScope, ClientsConfigSourceState } from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

type DirectoryEntry = {
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

function resolveLoadDefaultsAction(managerComponentId: string) {
  if (managerComponentId === "directories:departments") return actionLoadClientContactDepartmentDefaults;
  if (managerComponentId === "directories:job_titles") return actionLoadClientContactJobTitleDefaults;
  if (managerComponentId === "directories:pbx_categories") return actionLoadClientPbxCategoryDefaults;
  if (managerComponentId === "directories:insurer_lines") return actionLoadClientInsurerLineDefaults;
  return null;
}

export default function ClientsConfigDirectoriesSummary({
  entries,
  payload
}: {
  entries: DirectoryEntry[];
  payload: ClientsConfigManagerPayload;
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeLoadingKey, setActiveLoadingKey] = useState<string | null>(null);
  const [feedbackByKey, setFeedbackByKey] = useState<Record<string, string>>({});
  const openEntry = useMemo(() => entries.find((entry) => entry.key === openKey) ?? null, [entries, openKey]);

  const loadDefaults = (entry: DirectoryEntry) => {
    const runAction = resolveLoadDefaultsAction(entry.managerComponentId);
    if (!runAction) return;

    setActiveLoadingKey(entry.key);
    startTransition(async () => {
      try {
        const result = await runAction();
        setFeedbackByKey((prev) => ({
          ...prev,
          [entry.key]: `Iniciales cargadas: ${result.created} nuevas, ${result.reactivated} reactivadas.`
        }));
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
      {!entries.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          No hay directorios visibles. Revisa si fueron marcados como deprecados en Resumen.
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {entries.map((entry) => {
            const isEmpty = entry.activeItems + entry.inactiveItems === 0;
            const canLoadDefaults = Boolean(resolveLoadDefaultsAction(entry.managerComponentId));

            return (
              <ResponsiveInfoCard
                key={entry.key}
                title={entry.label}
                subtitle={`${entry.activeItems} activos · ${entry.inactiveItems} inactivos`}
                badges={
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full border border-[#4aadf5]/30 bg-[#4aadf5]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba] sm:text-[11px]">
                      {SCOPE_LABELS[entry.scope]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]",
                        SOURCE_BADGE_STYLES[entry.source]
                      )}
                    >
                      {entry.source}
                    </span>
                  </div>
                }
                actions={
                  <button
                    type="button"
                    onClick={() => setOpenKey(entry.key)}
                    className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] sm:h-10 sm:text-sm"
                  >
                    Administrar
                  </button>
                }
                summary={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {isEmpty ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 sm:text-xs">
                        Directorio vacío
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-2 py-0.5 text-[11px] font-semibold text-slate-700 sm:text-xs">
                        Items: {entry.activeItems + entry.inactiveItems}
                      </span>
                    )}
                  </div>
                }
              >
                <p className="break-words text-xs text-slate-600 sm:text-sm" title={entry.summary || undefined}>
                  <span className="font-semibold text-slate-700">Qué es:</span>{" "}
                  {entry.summary || "Directorio operativo para normalizar datos de contacto de empresas."}
                </p>
                <p className="break-words text-xs text-slate-500 sm:text-sm" title={entry.usedBy.join(" · ") || undefined}>
                  <span className="font-semibold text-slate-700">Se usa en:</span>{" "}
                  {entry.usedBy.length ? entry.usedBy.join(" · ") : "Sin uso registrado"}
                </p>
                <p className="break-words text-xs text-slate-500 sm:text-sm">
                  <span className="font-semibold text-slate-700">Dependencias:</span> {entry.dependsOn.length ? entry.dependsOn.join(" · ") : "—"}
                </p>
                {isEmpty ? (
                  <DirectoryEmptyState
                    canLoadDefaults={canLoadDefaults}
                    loading={activeLoadingKey === entry.key && isPending}
                    onLoadDefaults={() => loadDefaults(entry)}
                    feedback={feedbackByKey[entry.key] ?? null}
                  />
                ) : null}
              </ResponsiveInfoCard>
            );
          })}
        </div>
      )}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <ClientsConfigManagerDrawer
        open={Boolean(openEntry)}
        onClose={() => setOpenKey(null)}
        title={openEntry?.label ?? "Directorio"}
        subtitle="Configuración tenant-scoped"
      >
        {openEntry ? <ClientsConfigManagerRenderer managerComponentId={openEntry.managerComponentId} payload={payload} /> : null}
      </ClientsConfigManagerDrawer>
    </div>
  );
}

function DirectoryEmptyState({
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
      <p className="font-semibold">Directorio vacío</p>
      <p>Impacto: formularios de Empresas no podrán clasificar contactos con esta dimensión.</p>
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
