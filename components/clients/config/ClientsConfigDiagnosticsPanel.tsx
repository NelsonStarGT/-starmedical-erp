"use client";

import { useMemo, useState } from "react";
import ClientsConfigManagerDrawer from "@/components/clients/config/ClientsConfigManagerDrawer";
import {
  buildDiagnosticsKpis,
  DIAGNOSTICS_DOMAINS,
  filterDiagnosticsEvents,
  findSchemaHealthEntry,
  groupDiagnosticsEventsByDigest,
  listTopMissingSchemaTables,
  resolveDiagnosticsRecommendedAction,
  schemaStatusLabel,
  type DiagnosticsDateWindow,
  type DiagnosticsDigestGroup,
  type DiagnosticsEventFilters,
  type DiagnosticsRecommendedAction
} from "@/lib/clients/configDiagnostics";
import type { DomainSchemaHealthDomain, DomainSchemaHealthSnapshot, DomainSchemaHealthStatus } from "@/lib/prisma/domainSchemaHealth";
import type { SystemEventLogItem, SystemEventSeverity } from "@/lib/ops/eventLog";
import { cn } from "@/lib/utils";

type EventSourceState = "db" | "fallback";
type DiagnosticsModule = "summary" | DomainSchemaHealthDomain;

type ResolutionState = {
  resolved: boolean;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
};

const MODULE_TABS: Array<{ value: DiagnosticsModule; label: string }> = [
  { value: "summary", label: "Resumen" },
  { value: "clients", label: "Clientes" },
  { value: "reception", label: "Recepción" },
  { value: "portals", label: "Portales" },
  { value: "ops", label: "Ops" },
  { value: "medical", label: "Medical" }
];

const DOMAIN_LABELS: Record<DomainSchemaHealthDomain, string> = {
  clients: "Clientes",
  reception: "Recepción",
  portals: "Portales",
  ops: "Ops",
  medical: "Medical"
};

const SEVERITY_OPTIONS: Array<{ value: DiagnosticsEventFilters["severity"]; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "INFO", label: "Info" },
  { value: "WARN", label: "Warn" },
  { value: "ERROR", label: "Error" },
  { value: "CRITICAL", label: "Critical" }
];

const DATE_OPTIONS: Array<{ value: DiagnosticsDateWindow; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "all", label: "Todo" }
];

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-GT");
}

function statusBadgeClasses(status: DomainSchemaHealthStatus) {
  if (status === "OK") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Missing") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function severityBadgeClasses(severity: SystemEventSeverity) {
  if (severity === "INFO") return "border-sky-200 bg-sky-50 text-sky-700";
  if (severity === "WARN") return "border-amber-200 bg-amber-50 text-amber-700";
  if (severity === "ERROR") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
}

function extractMetaValue(event: SystemEventLogItem, key: string) {
  const value = event.metaJson && typeof event.metaJson === "object" ? event.metaJson[key] : null;
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function resolveEventClassification(event: SystemEventLogItem) {
  const fromMeta = extractMetaValue(event, "classification");
  if (fromMeta === "REQUIRED" || fromMeta === "OPTIONAL") return fromMeta;
  if (event.eventType.includes("REQUIRED")) return "REQUIRED";
  if (event.eventType.includes("OPTIONAL") || event.eventType.includes("FALLBACK")) return "OPTIONAL";
  return null;
}

function resolveEventSchemaTable(event: SystemEventLogItem) {
  return extractMetaValue(event, "table") ?? "—";
}

function isFallbackOperationalEvent(event: SystemEventLogItem) {
  const classification = resolveEventClassification(event);
  if (classification) return true;
  if (event.code === "P2021" || event.code === "P2022") return true;
  return event.eventType.includes("SCHEMA") || event.eventType.includes("FALLBACK");
}

function resolveGroupDomainLabel(group: DiagnosticsDigestGroup) {
  if (group.domain === "mixed") return "Múltiple";
  if (group.domain === "unknown") return "No clasificado";
  return DOMAIN_LABELS[group.domain];
}

function renderMissingTables(entry: {
  requiredMissing: string[];
  optionalMissing: string[];
} | null) {
  if (!entry) return "No hay señal de schema para este módulo.";
  if (!entry.requiredMissing.length && !entry.optionalMissing.length) return "Sin faltantes detectadas.";
  return [...entry.requiredMissing.map((item) => `Req · ${item}`), ...entry.optionalMissing.map((item) => `Opt · ${item}`)].join(" · ");
}

function sortByLatestDate(events: SystemEventLogItem[]) {
  return [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function deriveResolutionState(group: DiagnosticsDigestGroup): ResolutionState {
  const latestResolved = sortByLatestDate(group.events).find((item) => item.resolvedAt) ?? null;
  if (!latestResolved) {
    return {
      resolved: false,
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    };
  }
  return {
    resolved: true,
    resolvedAt: latestResolved.resolvedAt ?? null,
    resolvedByUserId: latestResolved.resolvedByUserId ?? null,
    resolutionNote: latestResolved.resolutionNote ?? null
  };
}

function buildExportUrl(params: {
  module: DiagnosticsModule;
  domain: DiagnosticsEventFilters["domain"];
  severity: DiagnosticsEventFilters["severity"];
  dateWindow: DiagnosticsDateWindow;
  code: string;
  search: string;
  format: "csv" | "json";
}) {
  const qs = new URLSearchParams();
  qs.set("module", params.module);
  qs.set("domain", params.domain);
  qs.set("severity", params.severity);
  qs.set("dateWindow", params.dateWindow);
  qs.set("code", params.code || "all");
  if (params.search.trim()) qs.set("search", params.search.trim());
  qs.set("format", params.format);
  return `/api/admin/clientes/diagnostics/export?${qs.toString()}`;
}

export default function ClientsConfigDiagnosticsPanel({
  schemaSnapshot,
  schemaHealthSource,
  events,
  eventsSource,
  eventsNotice
}: {
  schemaSnapshot: DomainSchemaHealthSnapshot;
  schemaHealthSource: EventSourceState;
  events: SystemEventLogItem[];
  eventsSource: EventSourceState;
  eventsNotice?: string | null;
}) {
  const [activeModule, setActiveModule] = useState<DiagnosticsModule>("summary");
  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false);
  const [detailDigest, setDetailDigest] = useState<string | null>(null);
  const [resolutionBusyDigest, setResolutionBusyDigest] = useState<string | null>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [resolutionOverrides, setResolutionOverrides] = useState<Record<string, ResolutionState>>({});
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  const [filters, setFilters] = useState<DiagnosticsEventFilters>({
    domain: "all",
    severity: "all",
    dateWindow: "7d",
    code: "all",
    search: ""
  });

  const codeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const event of events) {
      if (event.code?.trim()) set.add(event.code.trim().toUpperCase());
    }
    return ["all", ...Array.from(set).sort()];
  }, [events]);

  const effectiveDomainFilter = activeModule === "summary" ? filters.domain : activeModule;
  const filteredEvents = useMemo(
    () =>
      filterDiagnosticsEvents(events, {
        ...filters,
        domain: effectiveDomainFilter
      }),
    [effectiveDomainFilter, events, filters]
  );

  const groupedErrors = useMemo(() => groupDiagnosticsEventsByDigest(filteredEvents), [filteredEvents]);
  const topGroups = useMemo(() => groupedErrors.slice(0, 50), [groupedErrors]);
  const fallbackRows = useMemo(() => filteredEvents.filter(isFallbackOperationalEvent).slice(0, 40), [filteredEvents]);
  const recentErrorRows = useMemo(
    () => filteredEvents.filter((event) => event.severity === "ERROR" || event.severity === "CRITICAL").slice(0, 40),
    [filteredEvents]
  );
  const kpis = useMemo(() => buildDiagnosticsKpis(filteredEvents), [filteredEvents]);
  const topMissingSchemaTables = useMemo(() => listTopMissingSchemaTables(schemaSnapshot, 5), [schemaSnapshot]);
  const selectedGroup = useMemo(() => groupedErrors.find((group) => group.digest === detailDigest) ?? null, [detailDigest, groupedErrors]);
  const selectedGroupAction = useMemo(() => (selectedGroup ? resolveDiagnosticsRecommendedAction(selectedGroup) : null), [selectedGroup]);

  const activeModuleSchema = useMemo(() => {
    if (activeModule === "summary") return null;
    return findSchemaHealthEntry(schemaSnapshot, activeModule);
  }, [activeModule, schemaSnapshot]);

  const groupResolutionState = (group: DiagnosticsDigestGroup): ResolutionState => {
    const override = resolutionOverrides[group.digest];
    if (override) return override;
    return deriveResolutionState(group);
  };

  const copyGroupDetail = async (group: DiagnosticsDigestGroup) => {
    const action = resolveDiagnosticsRecommendedAction(group);
    const payload = {
      digest: group.digest,
      code: group.code,
      domain: group.domain,
      severity: group.severity,
      occurrences24h: group.occurrences24h,
      occurrences7d: group.occurrences7d,
      total: group.total,
      lastSeenAt: group.lastSeenAt,
      classification: group.classification,
      recommendedAction: action.description,
      docsAnchor: action.docsAnchor,
      sampleMeta: group.sampleMeta
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedDigest(group.digest);
      window.setTimeout(() => setCopiedDigest((current) => (current === group.digest ? null : current)), 1500);
    } catch {
      setCopiedDigest(null);
    }
  };

  const applyResolution = async (group: DiagnosticsDigestGroup, resolved: boolean) => {
    setResolutionError(null);
    setResolutionBusyDigest(group.digest);
    try {
      const noteInput = resolved ? window.prompt("Nota de resolución (opcional, máximo 500 chars):", "") : null;
      const payload = {
        digest: group.digest,
        resolved,
        resolutionNote: resolved ? noteInput : null,
        domain: group.domain === "mixed" || group.domain === "unknown" ? null : group.domain
      };
      const response = await fetch("/api/admin/clientes/diagnostics/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          resolved: boolean;
          resolvedAt: string | null;
          resolvedByUserId: string | null;
          resolutionNote: string | null;
        };
      };
      if (!response.ok || !result.ok || !result.data) {
        throw new Error(result.error || "No se pudo actualizar estado de resolución.");
      }
      setResolutionOverrides((prev) => ({
        ...prev,
        [group.digest]: {
          resolved: result.data?.resolved ?? false,
          resolvedAt: result.data?.resolvedAt ?? null,
          resolvedByUserId: result.data?.resolvedByUserId ?? null,
          resolutionNote: result.data?.resolutionNote ?? null
        }
      }));
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : "No se pudo actualizar estado de resolución.");
    } finally {
      setResolutionBusyDigest(null);
    }
  };

  const exportData = (format: "csv" | "json") => {
    const url = buildExportUrl({
      module: activeModule,
      domain: effectiveDomainFilter,
      severity: filters.severity,
      dateWindow: filters.dateWindow,
      code: filters.code ?? "all",
      search: filters.search ?? "",
      format
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openContextGuide = (action: DiagnosticsRecommendedAction | null) => {
    if (!action) return;
    window.open(action.docsHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Autoguía</p>
        <p className="mt-1 text-sm text-slate-600">
          ERROR SYSTEMS agrupa eventos operativos (schema, fallback y action errors controlados) por módulo. No almacena trazas de render ni PII.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveModule(tab.value)}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition",
                activeModule === tab.value
                  ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-12">
          <SelectFilter
            className="lg:col-span-2"
            label="Rango"
            value={filters.dateWindow}
            onChange={(value) => setFilters((prev) => ({ ...prev, dateWindow: value as DiagnosticsDateWindow }))}
            options={DATE_OPTIONS}
          />
          <SelectFilter
            className="lg:col-span-2"
            label="Severidad"
            value={filters.severity}
            onChange={(value) => setFilters((prev) => ({ ...prev, severity: value as DiagnosticsEventFilters["severity"] }))}
            options={SEVERITY_OPTIONS}
          />
          <SelectFilter
            className="lg:col-span-2"
            label="Módulo"
            value={effectiveDomainFilter}
            onChange={(value) => setFilters((prev) => ({ ...prev, domain: value as DiagnosticsEventFilters["domain"] }))}
            disabled={activeModule !== "summary"}
            options={[
              { value: "all", label: "Todos" },
              { value: "clients", label: "Clientes" },
              { value: "reception", label: "Recepción" },
              { value: "portals", label: "Portales" },
              { value: "ops", label: "Ops" },
              { value: "medical", label: "Medical" }
            ]}
          />
          <SelectFilter
            className="lg:col-span-2"
            label="Código"
            value={filters.code ?? "all"}
            onChange={(value) => setFilters((prev) => ({ ...prev, code: value }))}
            options={codeOptions.map((code) => ({ value: code, label: code === "all" ? "Todos" : code }))}
          />
          <label className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:col-span-4">
            Buscar
            <input
              value={filters.search ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="error, digest, recurso..."
              className="mt-1 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              schemaHealthSource === "db" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            Schema-health: {schemaHealthSource}
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
              eventsSource === "db" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            Event-log: {eventsSource}
          </span>
          <button
            type="button"
            onClick={() => setSchemaDrawerOpen(true)}
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Ver schema health
          </button>
          <button
            type="button"
            onClick={() => exportData("csv")}
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportData("json")}
            className="inline-flex h-9 items-center rounded-xl border border-[#4aa59c]/40 bg-[#4aa59c]/10 px-3 text-xs font-semibold text-[#1f6a63] hover:border-[#4aa59c]"
          >
            Export JSON
          </button>
        </div>

        {eventsNotice ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{eventsNotice}</div> : null}
        {resolutionError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{resolutionError}</div> : null}
      </section>

      {activeModule === "summary" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <KpiCard label="Errores últimas 24h" value={kpis.errorsLast24h} tone="rose" />
          <KpiCard label="Críticos (severity=ERROR)" value={kpis.criticalErrors} tone="fuchsia" />
          <KpiCard label="Schema / Fallback" value={kpis.schemaFallback} tone="amber" />
        </div>
      ) : (
        <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Tablas faltantes detectadas</p>
              <p className="text-xs text-slate-500">{DOMAIN_LABELS[activeModule]} · schema-health</p>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                statusBadgeClasses(activeModuleSchema?.status ?? "Missing")
              )}
            >
              {schemaStatusLabel(activeModuleSchema?.status ?? "Missing")}
            </span>
          </div>
          <p className="text-xs text-slate-600">{renderMissingTables(activeModuleSchema)}</p>
        </section>
      )}

      {activeModule === "summary" ? (
        <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Estado de esquema por dominio</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {DIAGNOSTICS_DOMAINS.map((domain) => {
              const entry = findSchemaHealthEntry(schemaSnapshot, domain);
              return (
                <div key={domain} className="rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{DOMAIN_LABELS[domain]}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        statusBadgeClasses(entry?.status ?? "Missing")
                      )}
                    >
                      {schemaStatusLabel(entry?.status ?? "Missing")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{renderMissingTables(entry)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2">
            <p className="text-xs font-semibold text-slate-700">Top tablas faltantes</p>
            {topMissingSchemaTables.length ? (
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {topMissingSchemaTables.map((item) => (
                  <li key={`${item.domain}:${item.table}`} className="truncate" title={`${item.domain} · ${item.table}`}>
                    {item.required ? "Req" : "Opt"} · {DOMAIN_LABELS[item.domain] ?? item.domain} · {item.table}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-emerald-700">Sin faltantes detectadas.</p>
            )}
          </div>
        </section>
      ) : null}

      {activeModule === "summary" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Eventos de fallback</p>
                <p className="text-xs text-slate-500">Schema/fallback clasificados por módulo.</p>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                {fallbackRows.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-[#f8fafc] text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold">Módulo</th>
                    <th className="px-3 py-2 text-left font-semibold">Tabla</th>
                    <th className="px-3 py-2 text-left font-semibold">Clasificación</th>
                    <th className="px-3 py-2 text-left font-semibold">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {fallbackRows.map((event, index) => (
                    <tr key={event.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="px-3 py-2 text-slate-600">{formatDate(event.createdAt)}</td>
                      <td className="px-3 py-2 text-slate-700">{event.domain}</td>
                      <td className="px-3 py-2 text-slate-600">{resolveEventSchemaTable(event)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            resolveEventClassification(event) === "REQUIRED"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {resolveEventClassification(event) ?? "OPTIONAL"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{event.messageShort}</td>
                    </tr>
                  ))}
                  {!fallbackRows.length ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        Sin eventos de fallback para los filtros activos.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Errores recientes</p>
                <p className="text-xs text-slate-500">Errores controlados por código/dominio/recurso.</p>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                {recentErrorRows.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-[#f8fafc] text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold">Código</th>
                    <th className="px-3 py-2 text-left font-semibold">Módulo</th>
                    <th className="px-3 py-2 text-left font-semibold">Recurso</th>
                    <th className="px-3 py-2 text-left font-semibold">Digest</th>
                    <th className="px-3 py-2 text-left font-semibold">Severidad</th>
                  </tr>
                </thead>
                <tbody>
                  {recentErrorRows.map((event, index) => (
                    <tr key={event.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="px-3 py-2 text-slate-600">{formatDate(event.createdAt)}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{event.code || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{event.domain}</td>
                      <td className="px-3 py-2 text-slate-600">{event.resource || "—"}</td>
                      <td className="px-3 py-2 text-slate-600" title={event.digest}>
                        {event.digest.slice(0, 12)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            severityBadgeClasses(event.severity)
                          )}
                        >
                          {event.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!recentErrorRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                        Sin errores recientes para los filtros activos.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Top errores</p>
            <p className="text-xs text-slate-500">Agrupado por digest · {topGroups.length} resultado(s)</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-[#f8fafc] text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Error</th>
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Módulo</th>
                <th className="px-3 py-2 text-left font-semibold">Ocurrencias (24h/7d)</th>
                <th className="px-3 py-2 text-left font-semibold">Última vez</th>
                <th className="px-3 py-2 text-left font-semibold">Acción recomendada</th>
                <th className="px-3 py-2 text-right font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {topGroups.map((group, index) => {
                const resolution = groupResolutionState(group);
                const action = resolveDiagnosticsRecommendedAction(group);
                return (
                  <tr key={group.digest} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2 text-slate-700">
                      <p className="max-w-[260px] truncate" title={group.messageShort}>
                        {group.messageShort}
                      </p>
                      {resolution.resolved ? (
                        <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                          Resuelto · {resolution.resolvedAt ? formatDate(resolution.resolvedAt) : "—"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700">{group.code || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{resolveGroupDomainLabel(group)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {group.occurrences24h}/{group.occurrences7d}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatDate(group.lastSeenAt)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <p className="max-w-[320px] truncate" title={action.description}>
                        {action.description}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailDigest(group.digest)}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!topGroups.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    Sin errores para los filtros activos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ClientsConfigManagerDrawer
        open={Boolean(selectedGroup)}
        onClose={() => setDetailDigest(null)}
        title={`Detalle de error · ${selectedGroup ? selectedGroup.digest.slice(0, 12) : ""}`}
        subtitle={selectedGroup ? `${selectedGroup.total} ocurrencia(s) · último ${formatDate(selectedGroup.lastSeenAt)}` : undefined}
      >
        {selectedGroup ? (
          <div className="space-y-3">
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {resolveGroupDomainLabel(selectedGroup)}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    severityBadgeClasses(selectedGroup.severity)
                  )}
                >
                  {selectedGroup.severity}
                </span>
                {selectedGroup.classification ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      selectedGroup.classification === "REQUIRED"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    )}
                  >
                    {selectedGroup.classification}
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">Código: {selectedGroup.code || "—"}</span>
                <span className="text-xs text-slate-500">24h/7d: {selectedGroup.occurrences24h}/{selectedGroup.occurrences7d}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{selectedGroup.messageShort}</p>
              {selectedGroupAction ? (
                <>
                  <p className="mt-1 text-xs text-slate-600">
                    Acción recomendada: <span className="font-semibold text-slate-700">{selectedGroupAction.description}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Guía contextual: <code>{selectedGroupAction.docsHref}</code>
                  </p>
                </>
              ) : null}
              {groupResolutionState(selectedGroup).resolved ? (
                <p className="mt-1 text-xs text-emerald-700">
                  Resuelto: {groupResolutionState(selectedGroup).resolvedAt ? formatDate(groupResolutionState(selectedGroup).resolvedAt!) : "—"}
                  {groupResolutionState(selectedGroup).resolvedByUserId ? ` · por ${groupResolutionState(selectedGroup).resolvedByUserId}` : ""}
                  {groupResolutionState(selectedGroup).resolutionNote ? ` · nota: ${groupResolutionState(selectedGroup).resolutionNote}` : ""}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyGroupDetail(selectedGroup)}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  {copiedDigest === selectedGroup.digest ? "Copiado" : "Copiar detalle"}
                </button>
                <button
                  type="button"
                  onClick={() => openContextGuide(selectedGroupAction)}
                  className="inline-flex h-9 items-center rounded-lg border border-[#4aa59c]/40 bg-[#4aa59c]/10 px-3 text-xs font-semibold text-[#1f6a63] hover:border-[#4aa59c]"
                >
                  Abrir guía contextual
                </button>
                <button
                  type="button"
                  disabled={resolutionBusyDigest === selectedGroup.digest}
                  onClick={() => applyResolution(selectedGroup, !groupResolutionState(selectedGroup).resolved)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold",
                    groupResolutionState(selectedGroup).resolved
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300",
                    resolutionBusyDigest === selectedGroup.digest && "cursor-not-allowed opacity-60"
                  )}
                >
                  {resolutionBusyDigest === selectedGroup.digest
                    ? "Guardando..."
                    : groupResolutionState(selectedGroup).resolved
                      ? "Marcar pendiente"
                      : "Marcar resuelto"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-xs">
                <thead className="bg-[#f8fafc] text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-3 py-2 text-left font-semibold">Dominio</th>
                    <th className="px-3 py-2 text-left font-semibold">Código</th>
                    <th className="px-3 py-2 text-left font-semibold">Recurso</th>
                    <th className="px-3 py-2 text-left font-semibold">Severidad</th>
                    <th className="px-3 py-2 text-left font-semibold">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {sortByLatestDate(selectedGroup.events)
                    .slice(0, 40)
                    .map((event, index) => (
                      <tr key={`${event.id}:${index}`} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="px-3 py-2 text-slate-600">{formatDate(event.createdAt)}</td>
                        <td className="px-3 py-2 text-slate-700">{event.domain}</td>
                        <td className="px-3 py-2 text-slate-700">{event.code || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{event.resource || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                              severityBadgeClasses(event.severity)
                            )}
                          >
                            {event.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {event.resolvedAt ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                              Resuelto
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{event.messageShort}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Meta JSON (sanitizado)</p>
              <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-[#f8fafc] p-2 text-[11px] text-slate-700">
                {JSON.stringify(selectedGroup.sampleMeta ?? {}, null, 2)}
              </pre>
            </section>
          </div>
        ) : null}
      </ClientsConfigManagerDrawer>

      <ClientsConfigManagerDrawer
        open={schemaDrawerOpen}
        onClose={() => setSchemaDrawerOpen(false)}
        title="Schema health · payload"
        subtitle={`Generado ${formatDate(schemaSnapshot.generatedAt)} · schema ${schemaSnapshot.schema}`}
      >
        <pre className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm">
          {JSON.stringify(schemaSnapshot, null, 2)}
        </pre>
      </ClientsConfigManagerDrawer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "rose" | "fuchsia" | "amber";
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "fuchsia"
        ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", toneClass)}>
        KPI
      </span>
    </section>
  );
}

function SelectFilter({
  className,
  label,
  value,
  onChange,
  options,
  disabled = false
}: {
  className?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className={cn("min-w-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500", className)}>
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
        )}
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
