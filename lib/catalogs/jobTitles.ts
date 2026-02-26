export const COMPANY_CONTACT_JOB_TITLES = [
  { id: "gerente_general", label: "Gerente general" },
  { id: "director_operaciones", label: "Director de operaciones" },
  { id: "director_financiero", label: "Director financiero" },
  { id: "director_comercial", label: "Director comercial" },
  { id: "director_ti", label: "Director de TI" },
  { id: "jefe_rrhh", label: "Jefe de RRHH" },
  { id: "jefe_facturacion", label: "Jefe de facturación" },
  { id: "jefe_cobranza", label: "Jefe de cobranza" },
  { id: "jefe_compras", label: "Jefe de compras" },
  { id: "jefe_operaciones", label: "Jefe de operaciones" },
  { id: "jefe_sso", label: "Jefe de SSO" },
  { id: "jefe_recepcion", label: "Jefe de recepción" },
  { id: "coordinador_administrativo", label: "Coordinador administrativo" },
  { id: "coordinador_finanzas", label: "Coordinador de finanzas" },
  { id: "coordinador_compras", label: "Coordinador de compras" },
  { id: "coordinador_rrhh", label: "Coordinador de RRHH" },
  { id: "coordinador_operaciones", label: "Coordinador de operaciones" },
  { id: "analista_financiero", label: "Analista financiero" },
  { id: "analista_cobranza", label: "Analista de cobranza" },
  { id: "analista_facturacion", label: "Analista de facturación" },
  { id: "analista_ti", label: "Analista de TI" },
  { id: "especialista_sso", label: "Especialista de SSO" },
  { id: "asistente_administrativo", label: "Asistente administrativo" },
  { id: "asistente_comercial", label: "Asistente comercial" },
  { id: "asistente_rrhh", label: "Asistente de RRHH" },
  { id: "recepcionista", label: "Recepcionista" },
  { id: "ejecutivo_cuenta", label: "Ejecutivo de cuenta" },
  { id: "representante_ventas", label: "Representante de ventas" },
  { id: "encargado_logistica", label: "Encargado de logística" },
  { id: "otro", label: "Otro" }
] as const;

export type CompanyContactJobTitleId = (typeof COMPANY_CONTACT_JOB_TITLES)[number]["id"];
export const COMPANY_CONTACT_JOB_TITLE_OTHER_ID: CompanyContactJobTitleId = "otro";

const BY_ID = new Map<string, { id: CompanyContactJobTitleId; label: string }>(
  COMPANY_CONTACT_JOB_TITLES.map((item) => [item.id, { id: item.id, label: item.label }])
);

export const COMPANY_CONTACT_JOB_TITLE_BY_ID = BY_ID as ReadonlyMap<string, { id: CompanyContactJobTitleId; label: string }>;

export function isCompanyContactJobTitleId(value?: string | null): value is CompanyContactJobTitleId {
  if (!value) return false;
  return BY_ID.has(value);
}
