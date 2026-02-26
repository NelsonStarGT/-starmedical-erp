export const COMPANY_LEGAL_FORMS = [
  { id: "comerciante_individual", label: "Comerciante individual" },
  { id: "sa", label: "Sociedad Anónima (S.A.)" },
  { id: "limitada", label: "Sociedad de Responsabilidad Limitada (Ltda.)" },
  { id: "colectiva", label: "Sociedad colectiva" },
  { id: "comandita_simple", label: "Sociedad en comandita simple" },
  { id: "comandita_acciones", label: "Sociedad en comandita por acciones" },
  { id: "emprendimiento", label: "Emprendimiento" },
  { id: "otro", label: "Otro" }
] as const;

export type CompanyLegalFormId = (typeof COMPANY_LEGAL_FORMS)[number]["id"];
export const COMPANY_LEGAL_FORM_OTHER_ID: CompanyLegalFormId = "otro";

const BY_ID = new Map<string, { id: CompanyLegalFormId; label: string }>(
  COMPANY_LEGAL_FORMS.map((item) => [item.id, { id: item.id, label: item.label }])
);

export const COMPANY_LEGAL_FORM_BY_ID = BY_ID as ReadonlyMap<string, { id: CompanyLegalFormId; label: string }>;

export function isCompanyLegalFormId(value?: string | null): value is CompanyLegalFormId {
  if (!value) return false;
  return BY_ID.has(value);
}

export function requiresCompanyLegalFormOther(value?: string | null) {
  return value === COMPANY_LEGAL_FORM_OTHER_ID;
}
