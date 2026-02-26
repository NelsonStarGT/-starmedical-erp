"use client";

import { ClientCatalogType } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionLoadClientCatalogDefaults } from "@/app/admin/clientes/actions";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ClientsConfigManagerRenderer, { type ClientsConfigManagerPayload } from "@/components/clients/config/ClientsConfigManagerRenderer";
import type { ClientsConfigSourceState } from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

type CatalogEntry = {
  key: string;
  label: string;
  managerComponentId: string;
  source: ClientsConfigSourceState;
  activeItems: number;
  inactiveItems: number;
};

type StoredCatalogFocus = {
  selectedKey: string;
  gridMode: boolean;
};

const SOURCE_BADGE_STYLES: Record<ClientsConfigSourceState, string> = {
  db: "border-emerald-200 bg-emerald-50 text-emerald-700",
  fallback: "border-amber-200 bg-amber-50 text-amber-700",
  defaults: "border-amber-200 bg-amber-50 text-amber-700",
  "n/a": "border-slate-200 bg-slate-100 text-slate-600"
};

const STORAGE_PREFIX = "star-clients-config:catalog-focus";

function buildStorageKey(preferenceScope: string) {
  return `${STORAGE_PREFIX}:${preferenceScope}`;
}

function parseCatalogType(managerComponentId: string): ClientCatalogType | null {
  if (!managerComponentId.startsWith("catalog:")) return null;
  const token = managerComponentId.split(":")[1] ?? "";
  if (!token) return null;
  const maybe = token.trim().toUpperCase() as ClientCatalogType;
  return Object.values(ClientCatalogType).includes(maybe) ? maybe : null;
}

function parseStoredState(preferenceScope: string): StoredCatalogFocus | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(buildStorageKey(preferenceScope));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCatalogFocus>;
    return {
      selectedKey: typeof parsed.selectedKey === "string" ? parsed.selectedKey : "",
      gridMode: Boolean(parsed.gridMode)
    };
  } catch {
    return null;
  }
}

export default function ClientsConfigCatalogFocus({
  entries,
  payload,
  preferenceScope
}: {
  entries: CatalogEntry[];
  payload: ClientsConfigManagerPayload;
  preferenceScope: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialState = useMemo(() => parseStoredState(preferenceScope), [preferenceScope]);

  const [selectedKey, setSelectedKey] = useState(initialState?.selectedKey || entries[0]?.key || "");
  const [gridMode, setGridMode] = useState(Boolean(initialState?.gridMode));
  const [activeLoadingKey, setActiveLoadingKey] = useState<string | null>(null);
  const [feedbackByKey, setFeedbackByKey] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!entries.length) {
      if (selectedKey) setSelectedKey("");
      return;
    }
    if (!entries.some((entry) => entry.key === selectedKey)) {
      setSelectedKey(entries[0]?.key ?? "");
    }
  }, [entries, selectedKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payloadToPersist: StoredCatalogFocus = {
      selectedKey,
      gridMode
    };
    window.localStorage.setItem(buildStorageKey(preferenceScope), JSON.stringify(payloadToPersist));
  }, [gridMode, preferenceScope, selectedKey]);

  const selectedEntry = useMemo(() => entries.find((entry) => entry.key === selectedKey) ?? entries[0] ?? null, [entries, selectedKey]);

  const loadDefaults = (entry: CatalogEntry) => {
    const catalogType = parseCatalogType(entry.managerComponentId);
    if (!catalogType) return;

    setActiveLoadingKey(entry.key);
    startTransition(async () => {
      try {
        const result = await actionLoadClientCatalogDefaults({ type: catalogType });
        setFeedbackByKey((prev) => ({
          ...prev,
          [entry.key]: `Iniciales cargadas: ${result.created} nuevas, ${result.reactivated} reactivadas.`
        }));
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudieron cargar valores iniciales.");
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
          Selecciona un catálogo y enfócate en un solo manager. Activa modo grid solo cuando necesites una vista amplia.
        </p>
      </section>

      <section className="grid gap-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto]">
        <SearchableSelect
          value={selectedEntry?.key ?? ""}
          onChange={setSelectedKey}
          options={entries.map((entry) => ({
            id: entry.key,
            label: `${entry.label} (${entry.activeItems}/${entry.inactiveItems})`
          }))}
          placeholder="Selecciona catálogo"
          disabled={entries.length === 0}
        />
        <button
          type="button"
          onClick={() => setGridMode((prev) => !prev)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          {gridMode ? "Ver modo foco" : "Ver modo grid"}
        </button>
      </section>

      {!entries.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-800">No hay catálogos visibles.</p>
          <p className="mt-1">Revisa si fueron marcados como deprecados en Resumen.</p>
        </section>
      ) : null}

      {gridMode ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {entries.map((entry) => (
            <section key={entry.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{entry.label}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      SOURCE_BADGE_STYLES[entry.source]
                    )}
                  >
                    {entry.source}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.activeItems}/{entry.inactiveItems}
                  </span>
                </div>
              </div>

              {entry.activeItems + entry.inactiveItems === 0 ? (
                <CatalogEmptyState
                  loading={activeLoadingKey === entry.key && isPending}
                  onLoadDefaults={() => loadDefaults(entry)}
                  feedback={feedbackByKey[entry.key] ?? null}
                />
              ) : null}

              <ClientsConfigManagerRenderer managerComponentId={entry.managerComponentId} payload={payload} />
            </section>
          ))}
        </div>
      ) : selectedEntry ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">{selectedEntry.label}</p>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  SOURCE_BADGE_STYLES[selectedEntry.source]
                )}
              >
                {selectedEntry.source}
              </span>
              <span className="text-xs text-slate-500">
                {selectedEntry.activeItems}/{selectedEntry.inactiveItems}
              </span>
            </div>
          </div>

          {selectedEntry.activeItems + selectedEntry.inactiveItems === 0 ? (
            <CatalogEmptyState
              loading={activeLoadingKey === selectedEntry.key && isPending}
              onLoadDefaults={() => loadDefaults(selectedEntry)}
              feedback={feedbackByKey[selectedEntry.key] ?? null}
            />
          ) : null}

          <ClientsConfigManagerRenderer managerComponentId={selectedEntry.managerComponentId} payload={payload} />
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </div>
  );
}

function CatalogEmptyState({
  loading,
  onLoadDefaults,
  feedback
}: {
  loading: boolean;
  onLoadDefaults: () => void;
  feedback: string | null;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <p className="font-semibold">Catálogo vacío</p>
      <p>Impacto: formularios y reportes no tendrán opciones normalizadas hasta cargar iniciales.</p>
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
      {feedback ? <p className="text-emerald-700">{feedback}</p> : null}
    </section>
  );
}
