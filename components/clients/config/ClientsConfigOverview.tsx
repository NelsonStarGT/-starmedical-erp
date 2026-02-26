"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSetClientsConfigRegistryDeprecated } from "@/app/admin/clientes/actions";
import ClientsConfigManagerDrawer from "@/components/clients/config/ClientsConfigManagerDrawer";
import ClientsConfigManagerRenderer, { type ClientsConfigManagerPayload } from "@/components/clients/config/ClientsConfigManagerRenderer";
import {
  canDeprecateClientsConfigEntry,
  type ClientsConfigScope,
  type ClientsConfigSection,
  type ClientsConfigSourceState
} from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

export type ClientsConfigOverviewRow = {
  key: string;
  label: string;
  summary?: string;
  section: Exclude<ClientsConfigSection, "resumen">;
  scope: ClientsConfigScope;
  usedBy: string[];
  dependsOn: string[];
  managerComponentId: string;
  canDeprecate: boolean;
  deprecated: boolean;
  source: ClientsConfigSourceState;
  activeItems: number;
  inactiveItems: number;
};

type OverviewSectionFilter = "all" | Exclude<ClientsConfigSection, "resumen">;
type OverviewScopeFilter = "all" | ClientsConfigScope;
type OverviewStatusFilter = "all" | ClientsConfigSourceState | "fallback_any";
type OverviewUseFilter = "all" | "used" | "unused";

const SECTION_LABELS: Record<Exclude<ClientsConfigSection, "resumen">, string> = {
  catalogos: "Catálogos",
  directorios: "Directorios",
  canales: "Canales",
  reglas: "Reglas",
  validaciones: "Validaciones",
  futuro: "Futuro"
};

const SOURCE_BADGE_STYLES: Record<ClientsConfigSourceState, string> = {
  db: "border-emerald-200 bg-emerald-50 text-emerald-700",
  fallback: "border-amber-200 bg-amber-50 text-amber-700",
  defaults: "border-amber-200 bg-amber-50 text-amber-700",
  "n/a": "border-slate-200 bg-slate-100 text-slate-600"
};

const SCOPE_LABELS: Record<ClientsConfigScope, string> = {
  tenant: "Tenant",
  shared: "Compartido",
  legacy: "Legacy",
  future: "Futuro"
};

const STORAGE_PREFIX = "star-clients-config:overview";
const SECTION_FILTER_VALUES = new Set<OverviewSectionFilter>(["all", "catalogos", "directorios", "canales", "reglas", "validaciones", "futuro"]);
const SCOPE_FILTER_VALUES = new Set<OverviewScopeFilter>(["all", "tenant", "shared", "legacy", "future"]);
const STATUS_FILTER_VALUES = new Set<OverviewStatusFilter>(["all", "db", "fallback", "defaults", "n/a", "fallback_any"]);
const USE_FILTER_VALUES = new Set<OverviewUseFilter>(["all", "used", "unused"]);

type StoredOverviewFilters = {
  query: string;
  sectionFilter: OverviewSectionFilter;
  scopeFilter: OverviewScopeFilter;
  statusFilter: OverviewStatusFilter;
  usedByFilter: OverviewUseFilter;
};

function buildStorageKey(preferenceScope: string) {
  return `${STORAGE_PREFIX}:${preferenceScope}`;
}

function isFallbackState(source: ClientsConfigSourceState) {
  return source === "fallback" || source === "defaults";
}

function parseStoredFilters(preferenceScope: string): StoredOverviewFilters | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(buildStorageKey(preferenceScope));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredOverviewFilters>;
    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      sectionFilter: SECTION_FILTER_VALUES.has(parsed.sectionFilter as OverviewSectionFilter)
        ? (parsed.sectionFilter as OverviewSectionFilter)
        : "all",
      scopeFilter: SCOPE_FILTER_VALUES.has(parsed.scopeFilter as OverviewScopeFilter)
        ? (parsed.scopeFilter as OverviewScopeFilter)
        : "all",
      statusFilter: STATUS_FILTER_VALUES.has(parsed.statusFilter as OverviewStatusFilter)
        ? (parsed.statusFilter as OverviewStatusFilter)
        : "all",
      usedByFilter: USE_FILTER_VALUES.has(parsed.usedByFilter as OverviewUseFilter)
        ? (parsed.usedByFilter as OverviewUseFilter)
        : "all"
    };
  } catch {
    return null;
  }
}

export default function ClientsConfigOverview({
  rows,
  payload,
  preferenceScope
}: {
  rows: ClientsConfigOverviewRow[];
  payload: ClientsConfigManagerPayload;
  preferenceScope: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialFilters = useMemo(() => parseStoredFilters(preferenceScope), [preferenceScope]);

  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [sectionFilter, setSectionFilter] = useState<OverviewSectionFilter>(initialFilters?.sectionFilter ?? "all");
  const [scopeFilter, setScopeFilter] = useState<OverviewScopeFilter>(initialFilters?.scopeFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<OverviewStatusFilter>(initialFilters?.statusFilter ?? "all");
  const [usedByFilter, setUsedByFilter] = useState<OverviewUseFilter>(initialFilters?.usedByFilter ?? "all");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  const paletteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payloadToPersist: StoredOverviewFilters = {
      query,
      sectionFilter,
      scopeFilter,
      statusFilter,
      usedByFilter
    };
    window.localStorage.setItem(buildStorageKey(preferenceScope), JSON.stringify(payloadToPersist));
  }, [preferenceScope, query, scopeFilter, sectionFilter, statusFilter, usedByFilter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setPaletteOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const timer = window.setTimeout(() => {
      paletteInputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [paletteOpen]);

  const openRow = useMemo(() => rows.find((row) => row.key === openKey) ?? null, [openKey, rows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (sectionFilter !== "all" && row.section !== sectionFilter) return false;
      if (scopeFilter !== "all" && row.scope !== scopeFilter) return false;
      if (statusFilter === "fallback_any") {
        if (!isFallbackState(row.source)) return false;
      } else if (statusFilter !== "all" && row.source !== statusFilter) {
        return false;
      }
      if (usedByFilter === "used" && row.usedBy.length === 0) return false;
      if (usedByFilter === "unused" && row.usedBy.length > 0) return false;
      if (!needle) return true;
      const haystack = `${row.label} ${row.key} ${SECTION_LABELS[row.section]} ${row.usedBy.join(" ")} ${row.dependsOn.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows, scopeFilter, sectionFilter, statusFilter, usedByFilter]);

  const paletteRows = useMemo(() => {
    const needle = paletteQuery.trim().toLowerCase();
    const ranked = rows.filter((row) => {
      if (!needle) return true;
      const haystack = `${row.label} ${row.key} ${SECTION_LABELS[row.section]} ${row.usedBy.join(" ")} ${row.dependsOn.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
    return ranked.slice(0, 24);
  }, [paletteQuery, rows]);

  useEffect(() => {
    if (paletteRows.length === 0) {
      setPaletteIndex(0);
      return;
    }
    if (paletteIndex > paletteRows.length - 1) {
      setPaletteIndex(paletteRows.length - 1);
    }
  }, [paletteIndex, paletteRows.length]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      deprecated: rows.filter((row) => row.deprecated).length,
      fallback: rows.filter((row) => isFallbackState(row.source)).length
    };
  }, [rows]);

  const setDeprecated = (row: ClientsConfigOverviewRow, deprecated: boolean) => {
    startTransition(async () => {
      try {
        await actionSetClientsConfigRegistryDeprecated({ key: row.key, deprecated });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar estado deprecado.");
      }
    });
  };

  const openFromPalette = (row: ClientsConfigOverviewRow | null) => {
    if (!row) return;
    setOpenKey(row.key);
    setPaletteOpen(false);
    setPaletteQuery("");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-3 shadow-sm lg:p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Autoguía</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Cmd/Ctrl+K
                </button>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Ver más
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-600">Filtra por sección y uso, abre el manager correcto y depreca solo catálogos sin uso activo.</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              Total <span className="font-semibold text-slate-700">{summary.total}</span> · Deprecados{" "}
              <span className="font-semibold text-slate-700">{summary.deprecated}</span> · Fallback{" "}
              <span className="font-semibold text-slate-700">{summary.fallback}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                {summary.fallback} items en fallback
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter("fallback_any")}
                disabled={summary.fallback === 0}
                className={cn(
                  "inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                  summary.fallback === 0 && "cursor-not-allowed opacity-60"
                )}
              >
                Filtrar fallback
              </button>
              {statusFilter === "fallback_any" ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Limpiar filtro
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2 lg:col-span-6 lg:grid-cols-12">
            <div className="min-w-0 md:col-span-2 lg:col-span-6">
              <label className="block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Buscar</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, key, dependencia..."
                className="mt-1 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>

            <SelectFilter
              className="min-w-0 lg:col-span-3"
              label="Sección"
              value={sectionFilter}
              onChange={(value) => setSectionFilter(value as OverviewSectionFilter)}
              options={[
                { value: "all", label: "Todas" },
                { value: "catalogos", label: "Catálogos" },
                { value: "directorios", label: "Directorios" },
                { value: "canales", label: "Canales" },
                { value: "reglas", label: "Reglas" },
                { value: "validaciones", label: "Validaciones" },
                { value: "futuro", label: "Futuro" }
              ]}
            />
            <SelectFilter
              className="min-w-0 lg:col-span-3"
              label="Scope"
              value={scopeFilter}
              onChange={(value) => setScopeFilter(value as OverviewScopeFilter)}
              options={[
                { value: "all", label: "Todos" },
                { value: "tenant", label: "Tenant" },
                { value: "shared", label: "Compartido" },
                { value: "legacy", label: "Legacy" },
                { value: "future", label: "Futuro" }
              ]}
            />
            <SelectFilter
              className="min-w-0 lg:col-span-3"
              label="Estado"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as OverviewStatusFilter)}
              options={[
                { value: "all", label: "Todos" },
                { value: "fallback_any", label: "Fallback (todos)" },
                { value: "db", label: "DB" },
                { value: "fallback", label: "Fallback" },
                { value: "defaults", label: "Defaults" },
                { value: "n/a", label: "N/A" }
              ]}
            />
            <SelectFilter
              className="min-w-0 lg:col-span-3"
              label="Uso"
              value={usedByFilter}
              onChange={(value) => setUsedByFilter(value as OverviewUseFilter)}
              options={[
                { value: "all", label: "Todos" },
                { value: "used", label: "Con uso" },
                { value: "unused", label: "Sin uso" }
              ]}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[68vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-[#2e75ba]">
              <tr>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Nombre</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Sección</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Scope</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Usado en</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Estado</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">
                  Items (act/inact)
                </th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em]">Dependencias</th>
                <th className="sticky top-0 z-20 bg-[#f8fafc] px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.06em]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const canDeprecate = canDeprecateClientsConfigEntry(row);
                return (
                  <tr key={row.key} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{row.label}</p>
                      <p className="font-mono text-[11px] text-slate-500">{row.key}</p>
                      {row.deprecated ? (
                        <span className="mt-1 inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                          Deprecado
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{SECTION_LABELS[row.section]}</td>
                    <td className="px-3 py-2 text-slate-600">{SCOPE_LABELS[row.scope]}</td>
                    <td className="max-w-[320px] px-3 py-2 text-xs text-slate-600">
                      <p className="truncate" title={row.usedBy.join(" · ") || undefined}>
                        {row.usedBy.length ? row.usedBy.join(" · ") : "Sin uso"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                          SOURCE_BADGE_STYLES[row.source]
                        )}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.activeItems}/{row.inactiveItems}
                    </td>
                    <td className="max-w-[240px] px-3 py-2 text-xs text-slate-600">
                      <p className="truncate" title={row.dependsOn.join(" · ") || undefined}>
                        {row.dependsOn.length ? row.dependsOn.join(" · ") : "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOpenKey(row.key)}
                          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                        >
                          Abrir
                        </button>
                        <RowSecondaryActions row={row} isPending={isPending} canDeprecate={canDeprecate} onSetDeprecated={setDeprecated} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredRows.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-xs text-slate-500">
                    Sin resultados para los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <ClientsConfigManagerDrawer
        open={Boolean(openRow)}
        onClose={() => setOpenKey(null)}
        title={openRow?.label ?? "Manager"}
        subtitle={openRow ? `${SECTION_LABELS[openRow.section]} · ${SCOPE_LABELS[openRow.scope]}` : undefined}
      >
        {openRow ? <ClientsConfigManagerRenderer managerComponentId={openRow.managerComponentId} payload={payload} /> : null}
      </ClientsConfigManagerDrawer>

      <ClientsConfigManagerDrawer
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Autoguía · Resumen"
        subtitle="Lectura rápida de la consola de configuración"
      >
        <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p>1. Usa filtros por sección/scope/estado para acotar hallazgos.</p>
          <p>2. Abre managers con “Abrir” para editar sin salir de Resumen.</p>
          <p>3. Depreca solo entradas sin uso (acción secundaria en menú “…”).</p>
          <p>4. Revisa estado fallback para priorizar carga inicial tenant-scoped.</p>
          <p>5. Usa Cmd/Ctrl+K para abrir cualquier manager sin buscarlo manualmente.</p>
        </section>
      </ClientsConfigManagerDrawer>

      {paletteOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/30 p-4 pt-[10vh]"
          onClick={() => {
            setPaletteOpen(false);
            setPaletteQuery("");
          }}
        >
          <section
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#dce7f5] bg-white shadow-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-3">
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={(event) => {
                  setPaletteQuery(event.target.value);
                  setPaletteIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setPaletteOpen(false);
                    setPaletteQuery("");
                    return;
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setPaletteIndex((prev) => (paletteRows.length ? Math.min(prev + 1, paletteRows.length - 1) : 0));
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setPaletteIndex((prev) => (paletteRows.length ? Math.max(prev - 1, 0) : 0));
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    openFromPalette(paletteRows[paletteIndex] ?? null);
                  }
                }}
                placeholder="Buscar en registry (label, key, sección, dependencias)..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
              <p className="mt-2 text-xs text-slate-500">Atajo global: Cmd/Ctrl+K · Enter abre manager · Esc cierra</p>
            </div>
            <div className="max-h-[52vh] overflow-auto p-2">
              {paletteRows.map((row, index) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => openFromPalette(row)}
                  className={cn(
                    "flex w-full items-start justify-between rounded-xl border px-3 py-2 text-left",
                    index === paletteIndex
                      ? "border-[#4aa59c] bg-[#4aa59c]/10"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{row.label}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-500">{row.key}</span>
                  </span>
                  <span className="ml-3 inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {SECTION_LABELS[row.section]}
                  </span>
                </button>
              ))}
              {!paletteRows.length ? (
                <p className="px-3 py-4 text-center text-xs text-slate-500">Sin coincidencias en el registry.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
  className
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={cn("space-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", className)}>
      <span className="block truncate">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RowSecondaryActions({
  row,
  isPending,
  canDeprecate,
  onSetDeprecated
}: {
  row: ClientsConfigOverviewRow;
  isPending: boolean;
  canDeprecate: boolean;
  onSetDeprecated: (row: ClientsConfigOverviewRow, deprecated: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        aria-label="Acciones secundarias"
      >
        <MoreHorizontal size={15} />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 min-w-[170px] rounded-lg border border-slate-200 bg-white p-1 shadow-md">
          {row.deprecated ? (
            <button
              type="button"
              onClick={() => {
                onSetDeprecated(row, false);
                setOpen(false);
              }}
              disabled={isPending}
              className="flex h-9 w-full items-center rounded-md px-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rehabilitar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSetDeprecated(row, true);
                setOpen(false);
              }}
              disabled={isPending || !canDeprecate}
              className="flex h-9 w-full items-center rounded-md px-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={!canDeprecate ? "Solo aplica para entradas sin uso activo." : undefined}
            >
              Marcar deprecado
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
