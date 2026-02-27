import { ClientCatalogType } from "@prisma/client";

export type ClientsConfigSection =
  | "resumen"
  | "catalogos"
  | "directorios"
  | "canales"
  | "reglas"
  | "validaciones"
  | "futuro";

export type ClientsConfigScope = "tenant" | "shared" | "legacy" | "future";

export type ClientsConfigSourceState = "db" | "fallback" | "defaults" | "n/a";

export type ClientsConfigRegistryEntry = {
  key: string;
  label: string;
  summary?: string;
  section: Exclude<ClientsConfigSection, "resumen">;
  scope: ClientsConfigScope;
  usedBy: string[];
  dependsOn: string[];
  managerComponentId: string;
  canDeprecate: boolean;
  deprecated?: boolean;
};

export const CLIENTS_CONFIG_DEPRECATED_COOKIE = "clients_config_deprecated_keys";

export const CLIENTS_CONFIG_SECTION_ORDER: ClientsConfigSection[] = [
  "resumen",
  "catalogos",
  "directorios",
  "canales",
  "reglas",
  "validaciones",
  "futuro"
];

export const CLIENTS_CONFIG_REGISTRY: ReadonlyArray<ClientsConfigRegistryEntry> = [
  {
    key: "catalog_person_category",
    label: "Categorías de persona",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/personas/nuevo", "/admin/clientes/personas/[id]"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.PERSON_CATEGORY}`,
    canDeprecate: false
  },
  {
    key: "catalog_person_profession",
    label: "Profesiones",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/personas/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.PERSON_PROFESSION}`,
    canDeprecate: false
  },
  {
    key: "catalog_marital_status",
    label: "Estados civiles",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/personas/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.MARITAL_STATUS}`,
    canDeprecate: false
  },
  {
    key: "catalog_academic_level",
    label: "Niveles académicos",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/personas/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.ACADEMIC_LEVEL}`,
    canDeprecate: false
  },
  {
    key: "catalog_company_category",
    label: "Categorías de empresa",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/empresas/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.COMPANY_CATEGORY}`,
    canDeprecate: false
  },
  {
    key: "catalog_sector",
    label: "Actividades económicas",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/empresas/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.SECTOR}`,
    canDeprecate: false
  },
  {
    key: "catalog_institution_category",
    label: "Régimen institucional",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/instituciones/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.INSTITUTION_CATEGORY}`,
    canDeprecate: false
  },
  {
    key: "catalog_institution_type",
    label: "Tipo de institución",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/instituciones/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.INSTITUTION_TYPE}`,
    canDeprecate: false
  },
  {
    key: "catalog_client_status",
    label: "Estados de cliente",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes", "/admin/clientes/[id]"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.CLIENT_STATUS}`,
    canDeprecate: false
  },
  {
    key: "catalog_document_type",
    label: "Tipos de documento",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/[id]", "/admin/clientes/configuracion?section=validaciones"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.DOCUMENT_TYPE}`,
    canDeprecate: false
  },
  {
    key: "catalog_location_type",
    label: "Tipos de ubicación",
    section: "catalogos",
    scope: "shared",
    usedBy: ["/admin/clientes/empresas/nuevo", "/admin/clientes/instituciones/nuevo"],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.LOCATION_TYPE}`,
    canDeprecate: false
  },
  {
    key: "directory_contact_departments",
    label: "Áreas / Departamentos",
    summary: "Directorio base para organizar responsables por área dentro de contactos empresariales.",
    section: "directorios",
    scope: "tenant",
    usedBy: ["/admin/clientes/empresas/nuevo (C2)"],
    dependsOn: [],
    managerComponentId: "directories:departments",
    canDeprecate: false
  },
  {
    key: "directory_contact_job_titles",
    label: "Cargos / Puestos",
    summary: "Catálogo de cargos operativos y ejecutivos para clasificar personas de contacto.",
    section: "directorios",
    scope: "tenant",
    usedBy: ["/admin/clientes/empresas/nuevo (C2)"],
    dependsOn: ["directory_contact_departments"],
    managerComponentId: "directories:job_titles",
    canDeprecate: false
  },
  {
    key: "directory_pbx_categories",
    label: "Categorías PBX",
    summary: "Clasifica líneas PBX por área (central, ventas, soporte) para telefonía empresarial.",
    section: "directorios",
    scope: "tenant",
    usedBy: ["/admin/clientes/empresas/nuevo (C0)"],
    dependsOn: [],
    managerComponentId: "directories:pbx_categories",
    canDeprecate: false
  },
  {
    key: "directory_insurer_lines",
    label: "Ramos de seguro",
    summary: "Clasifica aseguradoras por ramo (Médico, Vida, Auto, Funerario…).",
    section: "directorios",
    scope: "tenant",
    usedBy: ["Aseguradoras → Perfil"],
    dependsOn: [],
    managerComponentId: "directories:insurer_lines",
    canDeprecate: false
  },
  {
    key: "directory_department_job_matrix",
    label: "Correlación Área ↔ Cargo",
    summary: "Define qué cargos se permiten por área para filtrar C2 en el formulario Empresa.",
    section: "directorios",
    scope: "tenant",
    usedBy: ["/admin/clientes/empresas/nuevo (C2 filtro cargo)"],
    dependsOn: ["directory_contact_departments", "directory_contact_job_titles"],
    managerComponentId: "directories:correlation",
    canDeprecate: false
  },
  {
    key: "acquisition_sources",
    label: "Canales de adquisición",
    summary: "Normaliza cómo llegó el cliente (referido, social, web, alianza) para analítica comercial.",
    section: "canales",
    scope: "shared",
    usedBy: ["/admin/clientes/**/nuevo", "reportes clientes"],
    dependsOn: [],
    managerComponentId: "channels:acquisition_sources",
    canDeprecate: false
  },
  {
    key: "legacy_relation_type",
    label: "Tipo de relación comercial (legacy)",
    summary: "Catálogo heredado para clasificaciones comerciales antiguas todavía consultadas.",
    section: "canales",
    scope: "legacy",
    usedBy: [],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.RELATION_TYPE}`,
    canDeprecate: true
  },
  {
    key: "catalog_relationship_type",
    label: "Tipos de parentesco",
    summary: "Catálogo heredado para relaciones personales en flujos previos de CRM.",
    section: "canales",
    scope: "legacy",
    usedBy: [],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.RELATIONSHIP_TYPE}`,
    canDeprecate: true
  },
  {
    key: "catalog_social_network",
    label: "Redes sociales",
    summary: "Catálogo de origen social para leads y trazabilidad comercial en canales digitales.",
    section: "canales",
    scope: "legacy",
    usedBy: [],
    dependsOn: [],
    managerComponentId: `catalog:${ClientCatalogType.SOCIAL_NETWORK}`,
    canDeprecate: true
  },
  {
    key: "rules_operating_country",
    label: "País operativo",
    section: "reglas",
    scope: "tenant",
    usedBy: ["/admin/clientes/**/nuevo"],
    dependsOn: [],
    managerComponentId: "rules:operating_country",
    canDeprecate: false
  },
  {
    key: "rules_date_format",
    label: "Formato de fecha (Clientes)",
    section: "reglas",
    scope: "tenant",
    usedBy: ["/admin/clientes/**", "reportes clientes"],
    dependsOn: [],
    managerComponentId: "rules:date_format",
    canDeprecate: false
  },
  {
    key: "rules_health_score",
    label: "Reglas score y alertas",
    section: "reglas",
    scope: "shared",
    usedBy: ["/admin/clientes", "pipeline riesgo cliente"],
    dependsOn: [],
    managerComponentId: "rules:core",
    canDeprecate: false
  },
  {
    key: "rules_required_documents",
    label: "Reglas de documentos requeridos",
    section: "reglas",
    scope: "shared",
    usedBy: ["/admin/clientes/[id] (documentos)"],
    dependsOn: ["catalog_document_type"],
    managerComponentId: "rules:required_documents",
    canDeprecate: false
  },
  {
    key: "geo_country_validations",
    label: "Geo divisiones y cobertura por país",
    summary: "Consola de países y divisiones administrativas (Admin1/2/3) con cobertura operativa.",
    section: "validaciones",
    scope: "shared",
    usedBy: ["/admin/clientes/**/nuevo", "/admin/clientes/configuracion?section=validaciones"],
    dependsOn: ["rules_operating_country"],
    managerComponentId: "validations:geo",
    canDeprecate: false
  },
  {
    key: "geo_country_documents",
    label: "Validaciones y documentos por país",
    summary: "Vista de documentos activos que alimentan validaciones dinámicas en formularios de clientes.",
    section: "validaciones",
    scope: "shared",
    usedBy: ["/admin/clientes/[id] (documentos)", "/admin/clientes/configuracion?section=validaciones"],
    dependsOn: ["catalog_document_type"],
    managerComponentId: "validations:documents",
    canDeprecate: false
  },
  {
    key: "future_payment_terms",
    label: "Condiciones de pago (pendiente)",
    section: "futuro",
    scope: "future",
    usedBy: [],
    dependsOn: ["Facturación/Contabilidad"],
    managerComponentId: "future:payment_terms",
    canDeprecate: false
  }
] as const;

export function parseClientsConfigDeprecatedCookie(raw?: string | null) {
  const value = raw?.trim();
  if (!value) return [] as string[];

  const fromJson = (() => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return null;
      return parsed
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    } catch {
      return null;
    }
  })();

  const candidates = fromJson ?? value.split(",");
  return Array.from(new Set(candidates.map((item) => item.trim()).filter(Boolean)));
}

export function serializeClientsConfigDeprecatedCookie(keys: ReadonlyArray<string>) {
  const normalized = Array.from(new Set(keys.map((item) => item.trim()).filter(Boolean)));
  return JSON.stringify(normalized);
}

export function canDeprecateClientsConfigEntry(entry: Pick<ClientsConfigRegistryEntry, "canDeprecate" | "usedBy">) {
  return entry.canDeprecate && entry.usedBy.length === 0;
}

export function withResolvedRegistryDeprecation(
  entries: ReadonlyArray<ClientsConfigRegistryEntry>,
  deprecatedKeys: ReadonlyArray<string>
) {
  const deprecatedSet = new Set(deprecatedKeys.map((item) => item.trim()).filter(Boolean));
  return entries.map((entry) => ({
    ...entry,
    deprecated: Boolean(entry.deprecated) || deprecatedSet.has(entry.key)
  }));
}

export function getRegistryEntriesBySection(
  entries: ReadonlyArray<ClientsConfigRegistryEntry>,
  section: Exclude<ClientsConfigSection, "resumen">,
  includeDeprecated = false
) {
  return entries.filter((entry) => {
    if (entry.section !== section) return false;
    if (!includeDeprecated && entry.deprecated) return false;
    return true;
  });
}
