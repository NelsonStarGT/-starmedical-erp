import { ClientCatalogType } from "@prisma/client";
import { ECONOMIC_ACTIVITIES } from "@/lib/catalogs/economicActivities";
import { INSTITUTION_TYPES } from "@/lib/catalogs/institutionTypes";
import { INSTITUTIONAL_REGIMES } from "@/lib/catalogs/institutionalRegimes";

type DefaultCatalogItem = {
  id?: string;
  label: string;
};

const BASE_DOCUMENT_TYPES = [
  "PASSPORT",
  "DPI",
  "NIT",
  "RFC",
  "CURP",
  "DUI",
  "RTN",
  "RUC",
  "CEDULA",
  "SSN",
  "RTU",
  "Penales",
  "Policiacos",
  "Recibo de luz",
  "Recibo de agua",
  "Recibo de telefono",
  "Otros"
] as const;

const BASE_MARITAL_STATUS = ["Soltero", "Casado", "Divorciado", "Viudo", "Union libre"] as const;
const BASE_ACADEMIC_LEVELS = ["Primaria", "Secundaria", "Tecnico", "Universitario", "Maestria", "Doctorado"] as const;
const BASE_LOCATION_TYPES = ["Principal", "Sucursal", "Oficina", "Planta", "Tienda", "Fiscal", "Casa", "Trabajo", "Otro"] as const;
const BASE_PERSON_CATEGORIES = ["General", "Paciente", "Particular"] as const;
const BASE_COMPANY_CATEGORIES = ["Corporativo", "PyME", "Operador", "ONG", "Gobierno", "Educativa", "Otro"] as const;
const BASE_RELATION_TYPES = ["Cliente", "Proveedor", "Aliado", "Socio comercial", "Otro"] as const;
const BASE_RELATIONSHIP_TYPES = ["Padre", "Madre", "Tutor", "Encargado", "Conyuge", "Hermano", "Otro"] as const;
const BASE_SOCIAL_NETWORKS = ["Facebook", "Instagram", "TikTok", "LinkedIn", "X", "YouTube", "Otra red"] as const;
const BASE_PROFESSIONS = ["Medico", "Ingeniero", "Docente", "Abogado", "Contador", "Administrativo"] as const;
const BASE_CLIENT_STATUS = ["Activo"] as const;

const CATALOG_DEFAULTS: Partial<Record<ClientCatalogType, ReadonlyArray<DefaultCatalogItem>>> = {
  [ClientCatalogType.DOCUMENT_TYPE]: BASE_DOCUMENT_TYPES.map((label) => ({ label })),
  [ClientCatalogType.MARITAL_STATUS]: BASE_MARITAL_STATUS.map((label) => ({ label })),
  [ClientCatalogType.ACADEMIC_LEVEL]: BASE_ACADEMIC_LEVELS.map((label) => ({ label })),
  [ClientCatalogType.LOCATION_TYPE]: BASE_LOCATION_TYPES.map((label) => ({ label })),
  [ClientCatalogType.PERSON_CATEGORY]: BASE_PERSON_CATEGORIES.map((label) => ({ label })),
  [ClientCatalogType.COMPANY_CATEGORY]: BASE_COMPANY_CATEGORIES.map((label) => ({ label })),
  [ClientCatalogType.RELATION_TYPE]: BASE_RELATION_TYPES.map((label) => ({ label })),
  [ClientCatalogType.RELATIONSHIP_TYPE]: BASE_RELATIONSHIP_TYPES.map((label) => ({ label })),
  [ClientCatalogType.SOCIAL_NETWORK]: BASE_SOCIAL_NETWORKS.map((label) => ({ label })),
  [ClientCatalogType.SECTOR]: ECONOMIC_ACTIVITIES.map((item) => ({ id: item.id, label: item.label })),
  [ClientCatalogType.INSTITUTION_CATEGORY]: INSTITUTIONAL_REGIMES.map((item) => ({ id: item.id, label: item.label })),
  [ClientCatalogType.INSTITUTION_TYPE]: INSTITUTION_TYPES.map((item) => ({ id: item.id, label: item.label })),
  [ClientCatalogType.PERSON_PROFESSION]: BASE_PROFESSIONS.map((label) => ({ label })),
  [ClientCatalogType.CLIENT_STATUS]: BASE_CLIENT_STATUS.map((label) => ({ label }))
};

export function getClientCatalogDefaultsByType(type: ClientCatalogType): ReadonlyArray<DefaultCatalogItem> {
  return CATALOG_DEFAULTS[type] ?? [];
}
