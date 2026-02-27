import { cookies } from "next/headers";
import { ClientCatalogType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { tenantIdFromUser } from "@/lib/tenant";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import { getTenantClientsDateFormatConfig } from "@/lib/clients/dateFormatConfig";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { buildOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults";
import { CLIENTS_DATE_FORMAT_DEFAULT } from "@/lib/clients/dateFormat";
import {
  CLIENTS_CONFIG_DEPRECATED_COOKIE,
  CLIENTS_CONFIG_REGISTRY,
  CLIENTS_CONFIG_SECTION_ORDER,
  getRegistryEntriesBySection,
  parseClientsConfigDeprecatedCookie,
  type ClientsConfigRegistryEntry,
  type ClientsConfigSection,
  type ClientsConfigSourceState,
  withResolvedRegistryDeprecation
} from "@/lib/clients/clientsConfigRegistry";
import ClientRulesEditor from "@/components/clients/config/ClientRulesEditor";
import ClientRequiredDocumentsRulesEditor from "@/components/clients/config/ClientRequiredDocumentsRulesEditor";
import ClientDateFormatEditor from "@/components/clients/config/ClientDateFormatEditor";
import ClientOperatingCountryEditor from "@/components/clients/config/ClientOperatingCountryEditor";
import ClientsConfigOverview, { type ClientsConfigOverviewRow } from "@/components/clients/config/ClientsConfigOverview";
import ClientsConfigCatalogFocus from "@/components/clients/config/ClientsConfigCatalogFocus";
import ClientsConfigDirectoriesSummary from "@/components/clients/config/ClientsConfigDirectoriesSummary";
import ClientsConfigChannelsSummary from "@/components/clients/config/ClientsConfigChannelsSummary";
import ClientsConfigValidationsSummary from "@/components/clients/config/ClientsConfigValidationsSummary";
import ClientsConfigDiagnosticsPanel from "@/components/clients/config/ClientsConfigDiagnosticsPanel";
import ClientsConfigTabsNav from "@/components/clients/config/ClientsConfigTabsNav";
import ConfigAccessDeniedCard from "@/components/configuracion/ConfigAccessDeniedCard";
import type {
  ClientsConfigManagerPayload,
  ConfigCatalogItem,
  ConfigRequiredDocumentRule
} from "@/components/clients/config/ClientsConfigManagerRenderer";
import {
  canViewClientsConfigDiagnostics,
  canViewGlobalClientsConfigDiagnostics
} from "@/lib/clients/configDiagnostics";
import { getDomainSchemaHealthSnapshot, recordSchemaHealthSnapshotEvents } from "@/lib/prisma/domainSchemaHealth";
import { listSystemEventLogs } from "@/lib/ops/eventLog.server";
import { cn } from "@/lib/utils";

type Section = ClientsConfigSection;
type SourceState = ClientsConfigSourceState;

type SearchParams = {
  section?: string | string[];
};

type SectionSource = {
  id: string;
  label: string;
  source: SourceState;
};

type GeoCounts = {
  active: number;
  inactive: number;
};

const SECTION_LABELS: Record<Section, string> = {
  resumen: "Resumen",
  catalogos: "Catálogos",
  directorios: "Directorios",
  canales: "Canales y comercial",
  reglas: "Reglas",
  validaciones: "Validaciones por país",
  diagnostico: "ERROR SYSTEMS",
  futuro: "Futuro"
};

const FALLBACK_AUDIT_TTL_MS = 10 * 60 * 1000;
const fallbackAuditDedup = new Map<string, number>();

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toSection(value?: string | null): Section {
  const normalized = (value || "").toLowerCase();
  if (CLIENTS_CONFIG_SECTION_ORDER.includes(normalized as Section)) {
    return normalized as Section;
  }
  return "resumen";
}

function isFallbackSource(source: SourceState) {
  return source === "fallback" || source === "defaults";
}

function parseCatalogTypeFromManagerId(managerComponentId: string): ClientCatalogType | null {
  if (!managerComponentId.startsWith("catalog:")) return null;
  const token = managerComponentId.split(":")[1] ?? "";
  if (!token) return null;
  const maybe = token.trim().toUpperCase() as ClientCatalogType;
  return Object.values(ClientCatalogType).includes(maybe) ? maybe : null;
}

function createEmptyManagerPayload(): ClientsConfigManagerPayload {
  return {
    catalogsByType: {},
    acquisitionSources: [],
    acquisitionDetails: [],
    departments: [],
    departmentsSource: "db",
    jobTitles: [],
    jobTitlesSource: "db",
    pbxCategories: [],
    pbxCategoriesSource: "db",
    insurerLines: [],
    insurerLinesSource: "db",
    correlations: [],
    rulesConfig: {
      alertDays30: 30,
      alertDays15: 15,
      alertDays7: 7,
      healthProfileWeight: 70,
      healthDocsWeight: 30
    },
    requiredRules: [],
    requiredDocumentTypeOptions: [],
    validationDocumentTypes: [],
    clientsDateFormat: CLIENTS_DATE_FORMAT_DEFAULT,
    operatingCountryConfig: buildOperatingCountryDefaults("global"),
    operatingCountryOptions: []
  };
}

function mapCatalogRowsByType(rows: Array<ConfigCatalogItem & { type: ClientCatalogType }>) {
  const grouped: Partial<Record<ClientCatalogType, ConfigCatalogItem[]>> = {};
  for (const row of rows) {
    if (!grouped[row.type]) grouped[row.type] = [];
    grouped[row.type]?.push({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.isActive
    });
  }
  return grouped;
}

function computeManagerCounts(managerComponentId: string, payload: ClientsConfigManagerPayload, geoCounts: GeoCounts) {
  const catalogType = parseCatalogTypeFromManagerId(managerComponentId);
  if (catalogType) {
    const rows = payload.catalogsByType[catalogType] ?? [];
    return {
      activeItems: rows.filter((item) => item.isActive).length,
      inactiveItems: rows.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "directories:departments") {
    return {
      activeItems: payload.departments.filter((item) => item.isActive).length,
      inactiveItems: payload.departments.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "directories:job_titles") {
    return {
      activeItems: payload.jobTitles.filter((item) => item.isActive).length,
      inactiveItems: payload.jobTitles.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "directories:pbx_categories") {
    return {
      activeItems: payload.pbxCategories.filter((item) => item.isActive).length,
      inactiveItems: payload.pbxCategories.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "directories:insurer_lines") {
    return {
      activeItems: payload.insurerLines.filter((item) => item.isActive).length,
      inactiveItems: payload.insurerLines.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "directories:correlation") {
    return {
      activeItems: payload.correlations.length,
      inactiveItems: 0
    };
  }

  if (managerComponentId === "channels:acquisition_sources") {
    return {
      activeItems: payload.acquisitionSources.filter((item) => item.isActive).length,
      inactiveItems: payload.acquisitionSources.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "rules:required_documents") {
    return {
      activeItems: payload.requiredRules.filter((item) => item.isActive).length,
      inactiveItems: payload.requiredRules.filter((item) => !item.isActive).length
    };
  }

  if (managerComponentId === "rules:operating_country") {
    return {
      activeItems: payload.operatingCountryConfig.operatingCountryId ? 1 : 0,
      inactiveItems: payload.operatingCountryConfig.operatingCountryId ? 0 : 1
    };
  }

  if (managerComponentId === "rules:date_format") {
    return {
      activeItems: 1,
      inactiveItems: 0
    };
  }

  if (managerComponentId === "rules:core") {
    return {
      activeItems: 5,
      inactiveItems: 0
    };
  }

  if (managerComponentId === "validations:geo") {
    return {
      activeItems: geoCounts.active,
      inactiveItems: geoCounts.inactive
    };
  }

  if (managerComponentId === "validations:documents") {
    return {
      activeItems: payload.validationDocumentTypes.filter((item) => item.isActive).length,
      inactiveItems: payload.validationDocumentTypes.filter((item) => !item.isActive).length
    };
  }

  return {
    activeItems: 0,
    inactiveItems: 0
  };
}

function computeManagerSource(managerComponentId: string, payload: ClientsConfigManagerPayload, input: {
  clientsDateFormatSource: SourceState;
  operatingCountrySource: SourceState;
}): SourceState {
  const catalogType = parseCatalogTypeFromManagerId(managerComponentId);
  if (catalogType) return "db";

  if (managerComponentId === "directories:departments") return payload.departmentsSource;
  if (managerComponentId === "directories:job_titles") return payload.jobTitlesSource;
  if (managerComponentId === "directories:pbx_categories") return payload.pbxCategoriesSource;
  if (managerComponentId === "directories:insurer_lines") return payload.insurerLinesSource;
  if (managerComponentId === "directories:correlation") {
    return payload.departmentsSource === "db" && payload.jobTitlesSource === "db" ? "db" : "fallback";
  }
  if (managerComponentId === "rules:date_format") return input.clientsDateFormatSource;
  if (managerComponentId === "rules:operating_country") return input.operatingCountrySource;
  if (managerComponentId === "future:payment_terms") return "n/a";
  return "db";
}

async function logFallbackUsage(input: {
  tenantId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  section: Section;
  sources: SectionSource[];
}) {
  const fallbackSources = input.sources.filter((item) => isFallbackSource(item.source));
  if (!fallbackSources.length) return;
  const key = `${input.tenantId}:${input.section}:${fallbackSources.map((item) => `${item.id}:${item.source}`).sort().join("|")}`;
  const now = Date.now();
  const last = fallbackAuditDedup.get(key) ?? 0;
  if (last > 0 && now - last < FALLBACK_AUDIT_TTL_MS) return;
  fallbackAuditDedup.set(key, now);

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        action: "CLIENT_CONFIG_FALLBACK_USED",
        entityType: "ClientsConfigSection",
        entityId: `${input.tenantId}:${input.section}`,
        metadata: {
          section: input.section,
          sources: fallbackSources.map((item) => ({
            id: item.id,
            label: item.label,
            source: item.source
          }))
        }
      }
    });
  } catch {
    // non-blocking telemetry
  }
}

function SourceBadge({ source }: { source: SourceState }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        isFallbackSource(source)
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : source === "n/a"
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      Source: {source}
    </span>
  );
}

function FallbackBanner({ sources }: { sources: SectionSource[] }) {
  const fallbackSources = sources.filter((item) => isFallbackSource(item.source));
  if (!fallbackSources.length) return null;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Modo fallback activo</p>
      <p className="mt-1 text-xs">
        Este tab está usando datos por defecto para: {fallbackSources.map((item) => item.label).join(", ")}.
      </p>
      <p className="mt-1 text-xs">Recomendación: carga inicial y/o configuración explícita para persistir en DB tenant-scoped.</p>
    </section>
  );
}

function buildSectionDescription(section: Section, entries: ReadonlyArray<ClientsConfigRegistryEntry>) {
  if (section === "resumen") {
    return "Vista maestra de todos los catálogos/directorios con filtros, uso, dependencias y acceso rápido a managers.";
  }
  if (section === "diagnostico") {
    return "Observabilidad operativa por módulo: schema-health, fallbacks clasificados y errores controlados.";
  }
  if (section === "futuro") {
    return "Funcionalidades reservadas para activar cuando estén disponibles módulos dependientes.";
  }

  const activeEntries = entries.filter((entry) => entry.section === section && !entry.deprecated);
  const fallback = {
    catalogos: "Catálogos maestros usados por formularios de Clientes.",
    directorios: "Directorios tenant-scoped para contactos empresariales.",
    canales: "Canales de adquisición y catálogos comerciales legacy.",
    reglas: "Reglas operativas de score, documentos y defaults.",
    validaciones: "Consola técnica de geografía y validaciones por país.",
    diagnostico: "Consola ERROR SYSTEMS por dominio (Clientes/Recepción/Portales/Ops/Medical)."
  } as const;

  if (!activeEntries.length) {
    return "No hay entradas visibles en esta sección. Revisa Resumen para rehabilitar elementos deprecados.";
  }

  return `${fallback[section]} (${activeEntries.length} elemento${activeEntries.length === 1 ? "" : "s"} visible${activeEntries.length === 1 ? "" : "s"}).`;
}

export default async function ClientesConfiguracionPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedSection = firstParam(resolvedSearchParams?.section);
  const section = toSection(requestedSection);
  const hasExplicitSectionParam = Boolean(requestedSection?.trim());
  const cookieStore = await cookies();
  const currentUser = await getSessionUserFromCookies(cookieStore);
  const tenantId = tenantIdFromUser(currentUser);
  const canViewDiagnostics = canViewClientsConfigDiagnostics(currentUser);
  const canViewGlobalDiagnostics = canViewGlobalClientsConfigDiagnostics(currentUser);
  const preferenceScope = `${tenantId}:${currentUser?.id ?? "anon"}`;

  const deprecatedKeys = parseClientsConfigDeprecatedCookie(cookieStore.get(CLIENTS_CONFIG_DEPRECATED_COOKIE)?.value ?? null);
  const registryEntries = withResolvedRegistryDeprecation(CLIENTS_CONFIG_REGISTRY, deprecatedKeys);

  const visibleTabs = CLIENTS_CONFIG_SECTION_ORDER.filter((key) => {
    if (key === "resumen") return true;
    if (key === "diagnostico") return true;
    if (key === "futuro") return true;
    return getRegistryEntriesBySection(registryEntries, key, false).length > 0;
  });

  let sectionSources: SectionSource[] = [];
  let sectionContent: React.ReactNode = null;

  if (section === "resumen") {
    const catalogTypes = Array.from(
      new Set(
        registryEntries
          .map((entry) => parseCatalogTypeFromManagerId(entry.managerComponentId))
          .filter((item): item is ClientCatalogType => Boolean(item))
      )
    );

    const [
      catalogRows,
      contactDirectories,
      acquisitionSources,
      acquisitionDetails,
      clientsDateFormatConfig,
      operatingCountryDefaults,
      operatingCountryOptions,
      rulesConfig,
      requiredRules,
      requiredDocumentTypes,
      geoActiveCount,
      geoInactiveCount
    ] = await Promise.all([
      catalogTypes.length
        ? prisma.clientCatalogItem.findMany({
            where: { type: { in: catalogTypes } },
            orderBy: [{ type: "asc" }, { name: "asc" }],
            select: {
              id: true,
              type: true,
              name: true,
              description: true,
              isActive: true
            }
          })
        : Promise.resolve([]),
      getClientContactDirectories(tenantId, { includeInactive: true }),
      prisma.clientAcquisitionSource.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, code: true, category: true, isActive: true }
      }),
      prisma.clientAcquisitionDetailOption.findMany({
        orderBy: [{ source: { name: "asc" } }, { name: "asc" }],
        select: { id: true, sourceId: true, code: true, name: true, isActive: true }
      }),
      getTenantClientsDateFormatConfig(tenantId),
      getOperatingCountryDefaults(tenantId),
      prisma.geoCountry.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, iso2: true, iso3: true, name: true, isActive: true }
      }),
      safeGetClientRulesConfig("clients.config"),
      prisma.clientRequiredDocumentRule.findMany({
        orderBy: [{ clientType: "asc" }, { documentType: { name: "asc" } }],
        select: {
          id: true,
          clientType: true,
          documentTypeId: true,
          isRequired: true,
          requiresApproval: true,
          requiresExpiry: true,
          weight: true,
          isActive: true,
          documentType: { select: { name: true } }
        }
      }),
      prisma.clientCatalogItem.findMany({
        where: { type: ClientCatalogType.DOCUMENT_TYPE },
        orderBy: { name: "asc" },
        select: { id: true, name: true, isActive: true }
      }),
      prisma.geoCountry.count({ where: { isActive: true } }),
      prisma.geoCountry.count({ where: { isActive: false } })
    ]);

    const payload: ClientsConfigManagerPayload = {
      ...createEmptyManagerPayload(),
      catalogsByType: mapCatalogRowsByType(catalogRows as Array<ConfigCatalogItem & { type: ClientCatalogType }>),
      acquisitionSources,
      acquisitionDetails,
      departments: contactDirectories.departments,
      departmentsSource: contactDirectories.departmentsSource,
      jobTitles: contactDirectories.jobTitles,
      jobTitlesSource: contactDirectories.jobTitlesSource,
      pbxCategories: contactDirectories.pbxCategories,
      pbxCategoriesSource: contactDirectories.pbxCategoriesSource,
      insurerLines: contactDirectories.insurerLines,
      insurerLinesSource: contactDirectories.insurerLinesSource,
      correlations: contactDirectories.correlations,
      rulesConfig,
      requiredRules: requiredRules.map((rule) => ({
        id: rule.id,
        clientType: rule.clientType,
        documentTypeId: rule.documentTypeId,
        documentTypeName: rule.documentType.name,
        isRequired: rule.isRequired,
        requiresApproval: rule.requiresApproval,
        requiresExpiry: rule.requiresExpiry,
        weight: rule.weight,
        isActive: rule.isActive
      })) as ConfigRequiredDocumentRule[],
      requiredDocumentTypeOptions: requiredDocumentTypes,
      clientsDateFormat: clientsDateFormatConfig.clientsDateFormat,
      operatingCountryConfig: operatingCountryDefaults,
      operatingCountryOptions: operatingCountryOptions.map((country) => ({
        id: country.id,
        code: country.iso2,
        iso3: country.iso3 ?? null,
        name: country.name,
        isActive: country.isActive
      }))
    };

    const geoCounts = {
      active: geoActiveCount,
      inactive: geoInactiveCount
    };

    const rows: ClientsConfigOverviewRow[] = registryEntries.map((entry) => {
      const source = computeManagerSource(entry.managerComponentId, payload, {
        clientsDateFormatSource: clientsDateFormatConfig.source,
        operatingCountrySource: operatingCountryDefaults.source
      });
      const { activeItems, inactiveItems } = computeManagerCounts(entry.managerComponentId, payload, geoCounts);
      return {
        key: entry.key,
        label: entry.label,
        summary: entry.summary,
        section: entry.section,
        scope: entry.scope,
        usedBy: entry.usedBy,
        dependsOn: entry.dependsOn,
        managerComponentId: entry.managerComponentId,
        canDeprecate: entry.canDeprecate,
        deprecated: Boolean(entry.deprecated),
        source,
        activeItems,
        inactiveItems
      };
    });

    sectionSources = rows
      .filter((row) => isFallbackSource(row.source))
      .map((row) => ({
        id: row.key,
        label: row.label,
        source: row.source
      }));

    sectionContent = <ClientsConfigOverview rows={rows} payload={payload} preferenceScope={preferenceScope} />;
  }

  if (section === "catalogos") {
    const visibleEntries = getRegistryEntriesBySection(registryEntries, "catalogos", false);
    const catalogTypes = Array.from(
      new Set(
        visibleEntries
          .map((entry) => parseCatalogTypeFromManagerId(entry.managerComponentId))
          .filter((item): item is ClientCatalogType => Boolean(item))
      )
    );

    const catalogRows = catalogTypes.length
      ? await prisma.clientCatalogItem.findMany({
          where: { type: { in: catalogTypes } },
          orderBy: [{ type: "asc" }, { name: "asc" }],
          select: {
            id: true,
            type: true,
            name: true,
            description: true,
            isActive: true
          }
        })
      : [];

    const payload: ClientsConfigManagerPayload = {
      ...createEmptyManagerPayload(),
      catalogsByType: mapCatalogRowsByType(catalogRows as Array<ConfigCatalogItem & { type: ClientCatalogType }>)
    };

    const entries = visibleEntries.map((entry) => {
      const { activeItems, inactiveItems } = computeManagerCounts(entry.managerComponentId, payload, { active: 0, inactive: 0 });
      return {
        key: entry.key,
        label: entry.label,
        managerComponentId: entry.managerComponentId,
        source: "db" as SourceState,
        activeItems,
        inactiveItems
      };
    });

    sectionContent = <ClientsConfigCatalogFocus entries={entries} payload={payload} preferenceScope={preferenceScope} />;
  }

  if (section === "directorios") {
    const visibleEntries = getRegistryEntriesBySection(registryEntries, "directorios", false);
    const contactDirectories = await getClientContactDirectories(tenantId, { includeInactive: true });

    const payload: ClientsConfigManagerPayload = {
      ...createEmptyManagerPayload(),
      departments: contactDirectories.departments,
      departmentsSource: contactDirectories.departmentsSource,
      jobTitles: contactDirectories.jobTitles,
      jobTitlesSource: contactDirectories.jobTitlesSource,
      pbxCategories: contactDirectories.pbxCategories,
      pbxCategoriesSource: contactDirectories.pbxCategoriesSource,
      insurerLines: contactDirectories.insurerLines,
      insurerLinesSource: contactDirectories.insurerLinesSource,
      correlations: contactDirectories.correlations
    };

    sectionSources = [
      { id: "departments", label: "Áreas", source: contactDirectories.departmentsSource },
      { id: "jobTitles", label: "Cargos", source: contactDirectories.jobTitlesSource },
      { id: "pbxCategories", label: "Categorías PBX", source: contactDirectories.pbxCategoriesSource },
      { id: "insurerLines", label: "Ramos de seguro", source: contactDirectories.insurerLinesSource }
    ];

    const entries = visibleEntries.map((entry) => {
      const source = computeManagerSource(entry.managerComponentId, payload, {
        clientsDateFormatSource: "db",
        operatingCountrySource: "db"
      });
      const { activeItems, inactiveItems } = computeManagerCounts(entry.managerComponentId, payload, { active: 0, inactive: 0 });
      return {
        key: entry.key,
        label: entry.label,
        summary: entry.summary,
        managerComponentId: entry.managerComponentId,
        source,
        scope: entry.scope,
        activeItems,
        inactiveItems,
        usedBy: entry.usedBy,
        dependsOn: entry.dependsOn
      };
    });

    sectionContent = (
      <div className="space-y-4">
        <FallbackBanner sources={sectionSources} />
        <ClientsConfigDirectoriesSummary entries={entries} payload={payload} />
      </div>
    );
  }

  if (section === "canales") {
    const visibleEntries = getRegistryEntriesBySection(registryEntries, "canales", false);
    const showAcquisition = visibleEntries.some((entry) => entry.managerComponentId === "channels:acquisition_sources");
    const catalogTypes = Array.from(
      new Set(
        visibleEntries
          .map((entry) => parseCatalogTypeFromManagerId(entry.managerComponentId))
          .filter((item): item is ClientCatalogType => Boolean(item))
      )
    );

    const [acquisitionSources, acquisitionDetails, catalogRows] = await Promise.all([
      showAcquisition
        ? prisma.clientAcquisitionSource.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: { id: true, name: true, code: true, category: true, isActive: true }
          })
        : Promise.resolve([]),
      showAcquisition
        ? prisma.clientAcquisitionDetailOption.findMany({
            orderBy: [{ source: { name: "asc" } }, { name: "asc" }],
            select: { id: true, sourceId: true, code: true, name: true, isActive: true }
          })
        : Promise.resolve([]),
      catalogTypes.length
        ? prisma.clientCatalogItem.findMany({
            where: { type: { in: catalogTypes } },
            orderBy: [{ type: "asc" }, { name: "asc" }],
            select: { id: true, type: true, name: true, description: true, isActive: true }
          })
        : Promise.resolve([])
    ]);

    const payload: ClientsConfigManagerPayload = {
      ...createEmptyManagerPayload(),
      acquisitionSources,
      acquisitionDetails,
      catalogsByType: mapCatalogRowsByType(catalogRows as Array<ConfigCatalogItem & { type: ClientCatalogType }>)
    };

    const entries = visibleEntries.map((entry) => {
      const { activeItems, inactiveItems } = computeManagerCounts(entry.managerComponentId, payload, { active: 0, inactive: 0 });
      return {
        key: entry.key,
        label: entry.label,
        summary: entry.summary,
        managerComponentId: entry.managerComponentId,
        source: "db" as SourceState,
        scope: entry.scope,
        activeItems,
        inactiveItems,
        usedBy: entry.usedBy,
        dependsOn: entry.dependsOn
      };
    });

    sectionContent = <ClientsConfigChannelsSummary entries={entries} payload={payload} />;
  }

  if (section === "reglas") {
    const showDateFormat = registryEntries.some((entry) => entry.key === "rules_date_format" && !entry.deprecated);
    const showOperatingCountry = registryEntries.some((entry) => entry.key === "rules_operating_country" && !entry.deprecated);
    const showRulesCore = registryEntries.some((entry) => entry.key === "rules_health_score" && !entry.deprecated);
    const showRequiredDocs = registryEntries.some((entry) => entry.key === "rules_required_documents" && !entry.deprecated);

    const [clientsDateFormatConfig, operatingCountryDefaults, operatingCountryOptions, rulesConfig, requiredRules, requiredDocumentTypes] =
      await Promise.all([
        showDateFormat ? getTenantClientsDateFormatConfig(tenantId) : Promise.resolve(null),
        showOperatingCountry ? getOperatingCountryDefaults(tenantId) : Promise.resolve(null),
        showOperatingCountry
          ? prisma.geoCountry.findMany({
              where: { isActive: true },
              orderBy: { name: "asc" },
              select: { id: true, iso2: true, iso3: true, name: true, isActive: true }
            })
          : Promise.resolve([]),
        showRulesCore ? safeGetClientRulesConfig("clients.config") : Promise.resolve(null),
        showRequiredDocs
          ? prisma.clientRequiredDocumentRule.findMany({
              orderBy: [{ clientType: "asc" }, { documentType: { name: "asc" } }],
              select: {
                id: true,
                clientType: true,
                documentTypeId: true,
                isRequired: true,
                requiresApproval: true,
                requiresExpiry: true,
                weight: true,
                isActive: true,
                documentType: { select: { name: true } }
              }
            })
          : Promise.resolve([]),
        showRequiredDocs
          ? prisma.clientCatalogItem.findMany({
              where: { type: ClientCatalogType.DOCUMENT_TYPE },
              orderBy: { name: "asc" },
              select: { id: true, name: true, isActive: true }
            })
          : Promise.resolve([])
      ]);

    sectionSources = [
      ...(clientsDateFormatConfig ? [{ id: "clientsDateFormat", label: "Formato de fecha", source: clientsDateFormatConfig.source as SourceState }] : []),
      ...(operatingCountryDefaults ? [{ id: "operatingCountry", label: "País operativo", source: operatingCountryDefaults.source as SourceState }] : [])
    ];

    sectionContent = (
      <div className="space-y-4">
        <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Autoguía</p>
          <p className="mt-1 text-sm text-slate-600">
            Aplica defaults por tenant, luego define pesos de score y cierra con las reglas de documentos requeridos.
          </p>
        </section>

        <FallbackBanner sources={sectionSources} />

        {showOperatingCountry && operatingCountryDefaults ? (
          <ClientOperatingCountryEditor
            initialConfig={operatingCountryDefaults}
            countryOptions={operatingCountryOptions.map((country) => ({
              id: country.id,
              code: country.iso2,
              iso3: country.iso3 ?? null,
              name: country.name,
              isActive: country.isActive
            }))}
          />
        ) : null}

        {showDateFormat && clientsDateFormatConfig ? <ClientDateFormatEditor initialDateFormat={clientsDateFormatConfig.clientsDateFormat} /> : null}

        {showRulesCore && rulesConfig ? (
          <ClientRulesEditor
            initialAlertDays30={rulesConfig.alertDays30}
            initialAlertDays15={rulesConfig.alertDays15}
            initialAlertDays7={rulesConfig.alertDays7}
            initialHealthProfileWeight={rulesConfig.healthProfileWeight}
            initialHealthDocsWeight={rulesConfig.healthDocsWeight}
          />
        ) : null}

        {showRequiredDocs ? (
          <ClientRequiredDocumentsRulesEditor
            rules={requiredRules.map((rule) => ({
              id: rule.id,
              clientType: rule.clientType,
              documentTypeId: rule.documentTypeId,
              documentTypeName: rule.documentType.name,
              isRequired: rule.isRequired,
              requiresApproval: rule.requiresApproval,
              requiresExpiry: rule.requiresExpiry,
              weight: rule.weight,
              isActive: rule.isActive
            }))}
            documentTypeOptions={requiredDocumentTypes}
          />
        ) : null}

        {!showDateFormat && !showOperatingCountry && !showRulesCore && !showRequiredDocs ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            No hay reglas visibles en esta sección.
          </section>
        ) : null}
      </div>
    );
  }

  if (section === "validaciones") {
    const visibleEntries = getRegistryEntriesBySection(registryEntries, "validaciones", false);
    const [documentTypes, geoActiveCount, geoInactiveCount] = await Promise.all([
      prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.DOCUMENT_TYPE },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true }
    }),
      prisma.geoCountry.count({ where: { isActive: true } }),
      prisma.geoCountry.count({ where: { isActive: false } })
    ]);

    const payload: ClientsConfigManagerPayload = {
      ...createEmptyManagerPayload(),
      validationDocumentTypes: documentTypes
    };

    const geoCounts = {
      active: geoActiveCount,
      inactive: geoInactiveCount
    };

    const entries = visibleEntries.map((entry) => {
      const { activeItems, inactiveItems } = computeManagerCounts(entry.managerComponentId, payload, geoCounts);
      return {
        key: entry.key,
        label: entry.label,
        summary: entry.summary,
        managerComponentId: entry.managerComponentId,
        source: "db" as SourceState,
        scope: entry.scope,
        activeItems,
        inactiveItems,
        usedBy: entry.usedBy,
        dependsOn: entry.dependsOn
      };
    });

    sectionContent = <ClientsConfigValidationsSummary entries={entries} payload={payload} />;
  }

  if (section === "diagnostico") {
    if (!canViewDiagnostics) {
      sectionContent = (
        <ConfigAccessDeniedCard
          sectionLabel="ERROR SYSTEMS"
          requirementLabel="rol SUPER_ADMIN/ADMIN/OPS/TENANT_ADMIN o permiso CLIENTS_CONFIG_VIEW"
          backHref="/admin/clientes/configuracion?section=resumen"
          backLabel="Volver a Clientes · Configuración"
        />
      );
    } else {
      const schemaHealthResult = await (async () => {
        try {
          return {
            source: "db" as const,
            snapshot: await getDomainSchemaHealthSnapshot()
          };
        } catch {
          return {
            source: "fallback" as const,
            snapshot: {
              generatedAt: new Date().toISOString(),
              schema: "unknown",
              domains: [
                {
                  domain: "clients" as const,
                  status: "Missing" as const,
                  requiredMissing: ["schema_health_unavailable"],
                  optionalMissing: [],
                  tables: []
                },
                {
                  domain: "reception" as const,
                  status: "Missing" as const,
                  requiredMissing: ["schema_health_unavailable"],
                  optionalMissing: [],
                  tables: []
                },
                {
                  domain: "portals" as const,
                  status: "Missing" as const,
                  requiredMissing: ["schema_health_unavailable"],
                  optionalMissing: [],
                  tables: []
                },
                {
                  domain: "ops" as const,
                  status: "Missing" as const,
                  requiredMissing: ["schema_health_unavailable"],
                  optionalMissing: [],
                  tables: []
                },
                {
                  domain: "medical" as const,
                  status: "Missing" as const,
                  requiredMissing: ["schema_health_unavailable"],
                  optionalMissing: [],
                  tables: []
                }
              ]
            }
          };
        }
      })();
      const schemaHealthSource = schemaHealthResult.source;
      const schemaSnapshot = schemaHealthResult.snapshot;
      const schemaHealthIsFallback = schemaHealthSource === "fallback";
      if (!schemaHealthIsFallback) {
        await recordSchemaHealthSnapshotEvents(schemaSnapshot, { tenantId });
      }
      const diagnosticsEvents = await listSystemEventLogs({
        tenantId: canViewGlobalDiagnostics ? undefined : tenantId,
        domains: ["clients", "reception", "portal", "portals", "ops", "medical"],
        limit: 600
      });

      sectionSources = [
        ...(schemaHealthIsFallback ? [{ id: "schemaHealth", label: "Schema health", source: "fallback" as SourceState }] : []),
        ...(diagnosticsEvents.source === "fallback"
          ? [{ id: "eventLog", label: "Eventos operativos", source: "fallback" as SourceState }]
          : [])
      ];

      sectionContent = (
        <ClientsConfigDiagnosticsPanel
          schemaSnapshot={schemaSnapshot}
          schemaHealthSource={schemaHealthIsFallback ? "fallback" : schemaHealthSource}
          events={diagnosticsEvents.items}
          eventsSource={diagnosticsEvents.source}
          eventsNotice={diagnosticsEvents.notice}
        />
      );
    }
  }

  if (section === "futuro") {
    sectionContent = (
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Futuro</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Funcionalidades deshabilitadas
        </h3>
        <p className="mt-1 text-sm text-slate-600">Módulos pendientes de activación por dependencia con Facturación/Contabilidad.</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Función</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
                <th className="px-3 py-2 text-left font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="px-3 py-2 font-semibold text-slate-900">Condiciones de pago</td>
                <td className="px-3 py-2 text-amber-700">Pendiente</td>
                <td className="px-3 py-2 text-slate-600">Se habilita al activar Facturación/Contabilidad.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (sectionSources.length > 0) {
    await logFallbackUsage({
      tenantId,
      actorUserId: currentUser?.id ?? null,
      actorRole: currentUser?.roles?.[0] ?? null,
      section,
      sources: sectionSources
    });
  }

  const fallbackCount = sectionSources.filter((item) => isFallbackSource(item.source)).length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Clientes · Configuración
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Data Console para gobierno de datos, reglas y validaciones de Clientes. Enfocada en lectura rápida y administración por contexto.
        </p>
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <ClientsConfigTabsNav
          tabs={visibleTabs.map((tabKey) => ({ key: tabKey, label: SECTION_LABELS[tabKey] }))}
          section={section}
          hasExplicitSectionParam={hasExplicitSectionParam}
          preferenceScope={preferenceScope}
          fallbackCount={fallbackCount}
        />
        <p className="mt-2 text-xs text-slate-500">{buildSectionDescription(section, registryEntries)}</p>
        {sectionSources.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {sectionSources.map((item) => (
              <span key={`${item.id}:${item.source}`} className="inline-flex items-center gap-1 text-xs text-slate-600">
                {item.label} <SourceBadge source={item.source} />
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {sectionContent}
    </div>
  );
}
