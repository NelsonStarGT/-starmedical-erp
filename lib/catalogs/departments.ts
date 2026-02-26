export const COMPANY_CONTACT_DEPARTMENTS = [
  { id: "administracion", label: "Administración" },
  { id: "comercial_ventas", label: "Comercial / Ventas" },
  { id: "compras", label: "Compras" },
  { id: "finanzas", label: "Finanzas" },
  { id: "cobranza", label: "Cobranza" },
  { id: "facturacion", label: "Facturación" },
  { id: "rrhh", label: "RRHH" },
  { id: "sso", label: "SSO" },
  { id: "operaciones", label: "Operaciones" },
  { id: "gerencia", label: "Gerencia" },
  { id: "ti", label: "TI" },
  { id: "recepcion", label: "Recepción" },
  { id: "legal", label: "Legal" },
  { id: "servicio_cliente", label: "Servicio al cliente" },
  { id: "otro", label: "Otro" }
] as const;

export type CompanyContactDepartmentId = (typeof COMPANY_CONTACT_DEPARTMENTS)[number]["id"];
export const COMPANY_CONTACT_DEPARTMENT_OTHER_ID: CompanyContactDepartmentId = "otro";

const BY_ID = new Map<string, { id: CompanyContactDepartmentId; label: string }>(
  COMPANY_CONTACT_DEPARTMENTS.map((item) => [item.id, { id: item.id, label: item.label }])
);

export const COMPANY_CONTACT_DEPARTMENT_BY_ID = BY_ID as ReadonlyMap<string, { id: CompanyContactDepartmentId; label: string }>;

export function isCompanyContactDepartmentId(value?: string | null): value is CompanyContactDepartmentId {
  if (!value) return false;
  return BY_ID.has(value);
}
