import type { SessionUser } from "@/lib/auth";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";
import type {
  DomainSchemaHealthDomain,
  DomainSchemaHealthEntry,
  DomainSchemaHealthSnapshot,
  DomainSchemaHealthStatus
} from "@/lib/prisma/domainSchemaHealth";
import type { SystemEventLogItem, SystemEventSeverity } from "@/lib/ops/eventLog";

const DIAGNOSTIC_GLOBAL_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "OPS"]);
const DIAGNOSTIC_TENANT_ROLES = new Set(["TENANT_ADMIN", ...DIAGNOSTIC_GLOBAL_ROLES]);
const DIAGNOSTICS_DOMAIN_ALIASES: Record<string, DomainSchemaHealthDomain> = {
  clients: "clients",
  clientes: "clients",
  reception: "reception",
  recepcion: "reception",
  portals: "portals",
  portales: "portals",
  portal: "portals",
  ops: "ops",
  operations: "ops",
  medical: "medical",
  medico: "medical"
};

export const DIAGNOSTICS_DOMAINS: DomainSchemaHealthDomain[] = ["clients", "reception", "portals", "ops", "medical"];
export const ERROR_SYSTEMS_RUNBOOK_PATH = "/docs/ERROR_SYSTEMS_RUNBOOK.md";

export type DiagnosticsDateWindow = "24h" | "7d" | "30d" | "all";

export type DiagnosticsEventFilters = {
  domain: "all" | DomainSchemaHealthDomain;
  severity: "all" | SystemEventSeverity;
  dateWindow: DiagnosticsDateWindow;
  code?: "all" | string;
  search?: string;
};

export type DiagnosticsDigestGroup = {
  digest: string;
  messageShort: string;
  code: string | null;
  domain: DomainSchemaHealthDomain | "mixed" | "unknown";
  domains: DomainSchemaHealthDomain[];
  occurrences24h: number;
  occurrences7d: number;
  total: number;
  lastSeenAt: string;
  severity: SystemEventSeverity;
  classification: "REQUIRED" | "OPTIONAL" | null;
  actionHint: string | null;
  resource: string | null;
  sampleMeta: Record<string, unknown> | null;
  events: SystemEventLogItem[];
};

export type DiagnosticsRecommendedAction = {
  key: string;
  title: string;
  description: string;
  docsAnchor: string;
  docsHref: string;
};

function severityWeight(severity: SystemEventSeverity) {
  if (severity === "CRITICAL") return 4;
  if (severity === "ERROR") return 3;
  if (severity === "WARN") return 2;
  return 1;
}

function parseDateWindowStart(window: DiagnosticsDateWindow) {
  const now = Date.now();
  if (window === "24h") return now - 24 * 60 * 60 * 1000;
  if (window === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (window === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function extractMetaValue(event: SystemEventLogItem, key: string) {
  const value = event.metaJson && typeof event.metaJson === "object" ? event.metaJson[key] : null;
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

function resolveClassification(event: SystemEventLogItem) {
  const fromMeta = extractMetaValue(event, "classification");
  if (fromMeta === "REQUIRED" || fromMeta === "OPTIONAL") return fromMeta;
  if (event.eventType.includes("REQUIRED")) return "REQUIRED";
  if (event.eventType.includes("OPTIONAL") || event.eventType.includes("FALLBACK")) return "OPTIONAL";
  return null;
}

function resolveActionHint(event: SystemEventLogItem) {
  const fromMeta = extractMetaValue(event, "actionHint");
  if (fromMeta) return fromMeta;
  if (event.code === "P2021") return "Ejecuta migraciones pendientes y vuelve a validar el módulo.";
  if (event.code === "P2022") return "Actualiza schema legacy y regenera Prisma Client.";
  return null;
}

function toDocsHref(anchor: string) {
  return `${ERROR_SYSTEMS_RUNBOOK_PATH}${anchor}`;
}

function buildRecommendedAction(input: {
  key: string;
  title: string;
  description: string;
  docsAnchor: string;
}): DiagnosticsRecommendedAction {
  return {
    key: input.key,
    title: input.title,
    description: input.description,
    docsAnchor: input.docsAnchor,
    docsHref: toDocsHref(input.docsAnchor)
  };
}

export function normalizeDiagnosticsDomain(value: string | null | undefined): DomainSchemaHealthDomain | null {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return null;
  return DIAGNOSTICS_DOMAIN_ALIASES[normalized] ?? null;
}

export function canViewClientsConfigDiagnostics(user: SessionUser | null | undefined) {
  if (!user) return false;
  if (hasPermission(user, "SYSTEM:ADMIN")) return true;
  if (hasPermission(user, "CLIENTS_CONFIG_VIEW")) return true;
  const roles = (user.roles || []).map(normalizeRoleName);
  return roles.some((role) => DIAGNOSTIC_TENANT_ROLES.has(role));
}

export function canViewGlobalClientsConfigDiagnostics(user: SessionUser | null | undefined) {
  if (!user) return false;
  if (hasPermission(user, "SYSTEM:ADMIN")) return true;
  if (hasPermission(user, "CLIENTS_CONFIG_VIEW_ALL")) return true;
  const roles = (user.roles || []).map(normalizeRoleName);
  return roles.some((role) => DIAGNOSTIC_GLOBAL_ROLES.has(role));
}

export function listTopMissingSchemaTables(snapshot: DomainSchemaHealthSnapshot, limit = 5) {
  const required = snapshot.domains.flatMap((domain) =>
    domain.requiredMissing.map((table) => ({ domain: domain.domain, table, required: true }))
  );
  const optional = snapshot.domains.flatMap((domain) =>
    domain.optionalMissing.map((table) => ({ domain: domain.domain, table, required: false }))
  );
  return [...required, ...optional].slice(0, Math.max(limit, 1));
}

export function hasMissingSchema(snapshot: DomainSchemaHealthSnapshot) {
  return snapshot.domains.some((domain) => domain.status === "Missing" || domain.status === "Legacy");
}

export function filterDiagnosticsEvents(events: SystemEventLogItem[], filters: DiagnosticsEventFilters) {
  const fromMs = parseDateWindowStart(filters.dateWindow);
  const codeNeedle = filters.code && filters.code !== "all" ? filters.code.trim().toUpperCase() : null;
  const searchNeedle = filters.search?.trim().toLowerCase() ?? "";

  return events.filter((event) => {
    const normalizedDomain = normalizeDiagnosticsDomain(event.domain);
    if (filters.domain !== "all" && normalizedDomain !== filters.domain) return false;
    if (filters.severity !== "all" && event.severity !== filters.severity) return false;
    if (codeNeedle) {
      if (!event.code || event.code.trim().toUpperCase() !== codeNeedle) return false;
    }
    if (fromMs) {
      const createdAt = new Date(event.createdAt).getTime();
      if (!Number.isFinite(createdAt) || createdAt < fromMs) return false;
    }
    if (searchNeedle) {
      const haystack = `${event.messageShort} ${event.code ?? ""} ${event.digest} ${event.resource ?? ""} ${event.domain}`.toLowerCase();
      if (!haystack.includes(searchNeedle)) return false;
    }
    return true;
  });
}

export function groupDiagnosticsEventsByDigest(events: SystemEventLogItem[]): DiagnosticsDigestGroup[] {
  const now = Date.now();
  const h24 = now - 24 * 60 * 60 * 1000;
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const map = new Map<string, DiagnosticsDigestGroup>();

  for (const event of events) {
    const createdAtMs = new Date(event.createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) continue;
    const normalizedDomain = normalizeDiagnosticsDomain(event.domain);
    const current = map.get(event.digest);
    if (!current) {
      map.set(event.digest, {
        digest: event.digest,
        messageShort: event.messageShort,
        code: event.code ?? null,
        domain: normalizedDomain ?? "unknown",
        domains: normalizedDomain ? [normalizedDomain] : [],
        occurrences24h: createdAtMs >= h24 ? 1 : 0,
        occurrences7d: createdAtMs >= d7 ? 1 : 0,
        total: 1,
        lastSeenAt: event.createdAt,
        severity: event.severity,
        classification: resolveClassification(event),
        actionHint: resolveActionHint(event),
        resource: event.resource ?? null,
        sampleMeta: event.metaJson,
        events: [event]
      });
      continue;
    }

    current.total += 1;
    if (createdAtMs >= h24) current.occurrences24h += 1;
    if (createdAtMs >= d7) current.occurrences7d += 1;
    if (createdAtMs > new Date(current.lastSeenAt).getTime()) {
      current.lastSeenAt = event.createdAt;
      current.messageShort = event.messageShort;
      current.code = event.code ?? current.code;
      current.resource = event.resource ?? current.resource;
      current.sampleMeta = event.metaJson;
      current.actionHint = resolveActionHint(event) ?? current.actionHint;
      current.classification = resolveClassification(event) ?? current.classification;
    }
    if (severityWeight(event.severity) > severityWeight(current.severity)) {
      current.severity = event.severity;
    }
    if (normalizedDomain && !current.domains.includes(normalizedDomain)) {
      current.domains.push(normalizedDomain);
    }
    if (current.domain !== "mixed") {
      if (normalizedDomain && current.domain !== normalizedDomain && current.domain !== "unknown") current.domain = "mixed";
      if (!normalizedDomain && current.domain !== "unknown") current.domain = "mixed";
    }
    current.events.push(event);
  }

  return Array.from(map.values()).sort((a, b) => {
    const by24h = b.occurrences24h - a.occurrences24h;
    if (by24h !== 0) return by24h;
    const bySeverity = severityWeight(b.severity) - severityWeight(a.severity);
    if (bySeverity !== 0) return bySeverity;
    const by7d = b.occurrences7d - a.occurrences7d;
    if (by7d !== 0) return by7d;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
}

export function buildDiagnosticsKpis(events: SystemEventLogItem[]) {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  let errorsLast24h = 0;
  let criticalErrors = 0;
  let schemaFallback = 0;

  for (const event of events) {
    const createdAtMs = new Date(event.createdAt).getTime();
    if (Number.isFinite(createdAtMs) && createdAtMs >= last24h && (event.severity === "ERROR" || event.severity === "CRITICAL")) {
      errorsLast24h += 1;
    }
    if (event.severity === "ERROR") criticalErrors += 1;
    const classification = resolveClassification(event);
    if (event.code === "P2021" || event.code === "P2022" || classification) schemaFallback += 1;
  }

  return {
    errorsLast24h,
    criticalErrors,
    schemaFallback
  };
}

export function resolveDiagnosticsRecommendedAction(group: DiagnosticsDigestGroup) {
  const firstEvent = group.events[0] ?? null;
  if (!firstEvent) {
    return buildRecommendedAction({
      key: "generic-review",
      title: "Revisar evento",
      description: "Revisa stack controlado y repite operación para confirmar corrección.",
      docsAnchor: "#generic-review"
    });
  }
  return getRecommendedAction(firstEvent);
}

export function getRecommendedAction(event: Pick<SystemEventLogItem, "code" | "eventType" | "metaJson" | "domain">): DiagnosticsRecommendedAction {
  const code = event.code?.trim().toUpperCase() ?? null;
  const eventType = event.eventType.trim().toUpperCase();
  const classification =
    event.metaJson && typeof event.metaJson === "object" && typeof event.metaJson.classification === "string"
      ? String(event.metaJson.classification).toUpperCase()
      : eventType.includes("REQUIRED")
        ? "REQUIRED"
        : eventType.includes("OPTIONAL") || eventType.includes("FALLBACK")
          ? "OPTIONAL"
          : null;

  if (code === "P2021" && classification === "REQUIRED") {
    return buildRecommendedAction({
      key: "schema-required-missing-table",
      title: "Migrar tabla requerida",
      description: "Ejecuta migraciones pendientes y vuelve a validar schema-health antes de reintentar la operación.",
      docsAnchor: "#schema-required-missing-table"
    });
  }

  if (code === "P2021" && classification === "OPTIONAL") {
    return buildRecommendedAction({
      key: "schema-optional-fallback",
      title: "Salir de fallback opcional",
      description: "Carga iniciales y aplica migraciones para que el módulo deje de usar fallback opcional.",
      docsAnchor: "#schema-optional-fallback"
    });
  }

  if (code === "P2022" || eventType.includes("LEGACY")) {
    return buildRecommendedAction({
      key: "schema-legacy-mismatch",
      title: "Corregir schema legacy",
      description: "Actualiza el schema a la versión actual y regenera Prisma Client.",
      docsAnchor: "#schema-legacy-mismatch"
    });
  }

  if (eventType.includes("SCHEMA_HEALTH_REQUIRED_MISSING")) {
    return buildRecommendedAction({
      key: "schema-health-required",
      title: "Resolver faltantes requeridos",
      description: "Revisa tablas requeridas faltantes del dominio y completa migración/bootstrapping.",
      docsAnchor: "#schema-health-required"
    });
  }

  if (eventType.includes("SCHEMA_HEALTH_LEGACY_OPTIONAL")) {
    return buildRecommendedAction({
      key: "schema-health-optional",
      title: "Resolver faltantes opcionales",
      description: "Normaliza tablas opcionales legacy para eliminar warnings de compatibilidad.",
      docsAnchor: "#schema-health-optional"
    });
  }

  if (eventType.includes("CLIENT_ACTION_CONTROLLED_ERROR")) {
    return buildRecommendedAction({
      key: "clients-action-controlled-error",
      title: "Validar acción de Clientes",
      description: "Revisa la acción controlada, corrige dependencia de schema y vuelve a probar el flujo.",
      docsAnchor: "#clients-action-controlled-error"
    });
  }

  if (eventType.includes("PRISMA_SCHEMA_REQUIRED_BLOCKED")) {
    return buildRecommendedAction({
      key: "prisma-required-blocked",
      title: "Desbloquear dependencia Prisma requerida",
      description: "Resuelve la dependencia requerida bloqueada y valida nuevamente la operación.",
      docsAnchor: "#prisma-required-blocked"
    });
  }

  if (eventType.includes("PRISMA_SCHEMA_FALLBACK_OPTIONAL")) {
    return buildRecommendedAction({
      key: "prisma-fallback-optional",
      title: "Eliminar fallback Prisma opcional",
      description: "Completa migración/seed opcional para migrar source=fallback a source=db.",
      docsAnchor: "#prisma-fallback-optional"
    });
  }

  return buildRecommendedAction({
    key: "generic-review",
    title: "Revisión operativa",
    description: "Revisa el error, valida permisos/tenant y repite la operación para confirmar corrección.",
    docsAnchor: "#generic-review"
  });
}

export function findSchemaHealthEntry(
  snapshot: DomainSchemaHealthSnapshot,
  domain: DomainSchemaHealthDomain
): DomainSchemaHealthEntry | null {
  return snapshot.domains.find((entry) => entry.domain === domain) ?? null;
}

export function schemaStatusLabel(status: DomainSchemaHealthStatus) {
  if (status === "OK") return "OK";
  if (status === "Missing") return "Missing";
  return "Legacy";
}
