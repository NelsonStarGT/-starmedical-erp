import "server-only";

import { prisma } from "@/lib/prisma";
import { recordSystemEvent } from "@/lib/ops/eventLog.server";
import { normalizeTenantId } from "@/lib/tenant";

export type DomainSchemaHealthStatus = "OK" | "Missing" | "Legacy";
export type DomainSchemaHealthDomain = "clients" | "reception" | "portals" | "ops" | "medical";

export type DomainSchemaHealthTable = {
  name: string;
  required: boolean;
  exists: boolean;
};

export type DomainSchemaHealthEntry = {
  domain: DomainSchemaHealthDomain;
  status: DomainSchemaHealthStatus;
  requiredMissing: string[];
  optionalMissing: string[];
  tables: DomainSchemaHealthTable[];
};

export type DomainSchemaHealthSnapshot = {
  generatedAt: string;
  schema: string;
  domains: DomainSchemaHealthEntry[];
};

const DEFAULT_SCHEMA = "public";
const DOMAIN_ALIASES: Record<string, DomainSchemaHealthDomain> = {
  clients: "clients",
  clientes: "clients",
  reception: "reception",
  recepcion: "reception",
  portals: "portals",
  portal: "portals",
  ops: "ops",
  operations: "ops",
  medical: "medical",
  medico: "medical"
};

const DOMAIN_TABLES: Record<DomainSchemaHealthDomain, { required: string[]; optional: string[] }> = {
  clients: {
    required: ["ClientProfile", "ClientCatalogItem", "ClientDocument"],
    optional: [
      "ClientContact",
      "ClientNote",
      "ClientRulesConfig",
      "ClientRequiredDocumentRule",
      "TenantClientsConfig",
      "ClientContactDepartmentDirectory",
      "ClientContactJobTitleDirectory",
      "ClientContactDepartmentJobTitle",
      "ClientPbxCategoryDirectory",
      "ClientInsurerLineDirectory",
      "ClientSequenceCounter",
      "ClientRegistrationInvite",
      "ClientSelfRegistration"
    ]
  },
  reception: {
    required: ["Visit", "Queue", "QueueItem", "Appointment"],
    optional: ["VisitEvent", "ReceptionSlaConfig", "ReceptionSlaAreaConfig", "ClientRegistrationInvite", "ClientSelfRegistration"]
  },
  portals: {
    required: ["PortalConfig", "PortalSession", "PortalOtpChallenge"],
    optional: ["PortalAuditLog", "PortalSessionRotationLog", "PortalRateLimitBucket"]
  },
  ops: {
    required: ["OperationalIncident", "ServiceRequest", "TicketSequence"],
    optional: ["ReceptionNote", "ReceptionSlaConfig", "ReceptionSlaAreaConfig"]
  },
  medical: {
    required: ["Encounter", "DiagnosticOrder", "DiagnosticOrderItem"],
    optional: ["EncounterDocument", "EncounterResult", "LabResult", "ImagingReport"]
  }
};

function safeSchemaName(schema: string | null | undefined): string {
  const value = (schema || "").trim();
  if (!value) return DEFAULT_SCHEMA;
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return DEFAULT_SCHEMA;
  return value;
}

function resolveDbSchemaFromUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return DEFAULT_SCHEMA;
  try {
    const schema = new URL(rawUrl).searchParams.get("schema");
    return safeSchemaName(schema);
  } catch {
    return DEFAULT_SCHEMA;
  }
}

async function readTablePresence(schema: string, tableNames: string[]): Promise<Record<string, boolean>> {
  if (!tableNames.length) return {};
  const select = tableNames.map((table) => `to_regclass('${schema}."${table}"')::text AS "${table}"`).join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, string | null>>>(`SELECT ${select};`);
  const row = rows[0] ?? {};
  return tableNames.reduce<Record<string, boolean>>((acc, table) => {
    acc[table] = Boolean(row[table]);
    return acc;
  }, {});
}

function buildDomainStatus(input: { requiredMissingCount: number; optionalMissingCount: number }): DomainSchemaHealthStatus {
  if (input.requiredMissingCount > 0) return "Missing";
  if (input.optionalMissingCount > 0) return "Legacy";
  return "OK";
}

export function normalizeDomainSchemaHealthDomain(value: string | null | undefined): DomainSchemaHealthDomain | null {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return null;
  return DOMAIN_ALIASES[normalized] ?? null;
}

export async function getDomainSchemaHealthSnapshot(): Promise<DomainSchemaHealthSnapshot> {
  const schema = resolveDbSchemaFromUrl();
  const domains = Object.keys(DOMAIN_TABLES) as DomainSchemaHealthDomain[];
  const allTables = Array.from(
    new Set(domains.flatMap((domain) => [...DOMAIN_TABLES[domain].required, ...DOMAIN_TABLES[domain].optional]))
  );
  const presence = await readTablePresence(schema, allTables);

  const entries = domains.map<DomainSchemaHealthEntry>((domain) => {
    const requiredSet = new Set(DOMAIN_TABLES[domain].required);
    const optionalSet = new Set(DOMAIN_TABLES[domain].optional);
    const tables = [...requiredSet, ...optionalSet].map((name) => ({
      name,
      required: requiredSet.has(name),
      exists: Boolean(presence[name])
    }));
    const requiredMissing = tables.filter((row) => row.required && !row.exists).map((row) => row.name);
    const optionalMissing = tables.filter((row) => !row.required && !row.exists).map((row) => row.name);

    return {
      domain,
      status: buildDomainStatus({
        requiredMissingCount: requiredMissing.length,
        optionalMissingCount: optionalMissing.length
      }),
      requiredMissing,
      optionalMissing,
      tables
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    schema,
    domains: entries
  };
}

export async function recordSchemaHealthSnapshotEvents(
  snapshot: DomainSchemaHealthSnapshot,
  input?: {
    tenantId?: string | null;
  }
) {
  const tenantCandidate = normalizeTenantId(input?.tenantId ?? process.env.TENANT_ID ?? null);
  const tenantId = tenantCandidate === "global" ? null : tenantCandidate;

  for (const domain of snapshot.domains) {
    if (domain.status === "OK") continue;
    const classification = domain.status === "Missing" ? "REQUIRED" : "OPTIONAL";
    const leadingTable = domain.requiredMissing[0] ?? domain.optionalMissing[0] ?? null;
    const actionHint =
      classification === "REQUIRED"
        ? "Ejecuta migraciones pendientes; luego valida schema-health nuevamente."
        : "Actualiza migraciones/seed de tablas opcionales para salir de modo legacy.";
    await recordSystemEvent({
      tenantId,
      domain: domain.domain,
      eventType: classification === "REQUIRED" ? "SCHEMA_HEALTH_REQUIRED_MISSING" : "SCHEMA_HEALTH_LEGACY_OPTIONAL",
      severity: classification === "REQUIRED" ? "ERROR" : "WARN",
      code: classification === "REQUIRED" ? "P2021" : "P2022",
      resource: "schema-health",
      messageShort:
        classification === "REQUIRED"
          ? `Schema health detectó tablas requeridas faltantes en ${domain.domain}.`
          : `Schema health detectó tablas opcionales faltantes en ${domain.domain} (legacy).`,
      digestKey: `schema-health:${domain.domain}:${domain.status}:${[
        ...domain.requiredMissing,
        ...domain.optionalMissing
      ]
        .sort()
        .join(",")}`,
      metaJson: {
        classification,
        table: leadingTable,
        requiredMissing: domain.requiredMissing.slice(0, 15),
        optionalMissing: domain.optionalMissing.slice(0, 15),
        actionHint
      }
    });
  }
}

export function resolveDomainSchemaStatus(input: {
  requiredMissingCount: number;
  optionalMissingCount: number;
}): DomainSchemaHealthStatus {
  return buildDomainStatus(input);
}
