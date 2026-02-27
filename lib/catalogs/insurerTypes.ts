export const INSURER_TYPES = [
  { id: "salud", label: "Salud" },
  { id: "vida", label: "Vida" },
  { id: "auto", label: "Auto" },
  { id: "multirriesgo", label: "Multirriesgo" },
  { id: "reaseguro", label: "Reaseguro" },
  { id: "tpa", label: "TPA" },
  { id: "otra", label: "Otra" }
] as const;

export const INSURER_SCOPES = [
  { id: "local", label: "Local" },
  { id: "regional", label: "Regional" },
  { id: "internacional", label: "Internacional" }
] as const;

export const INSURER_BILLING_METHODS = [
  { id: "direct", label: "Directo" },
  { id: "reimbursement", label: "Reembolso" },
  { id: "mixed", label: "Mixto" }
] as const;

export type InsurerTypeId = (typeof INSURER_TYPES)[number]["id"];
export type InsurerScopeId = (typeof INSURER_SCOPES)[number]["id"];
export type InsurerBillingMethodId = (typeof INSURER_BILLING_METHODS)[number]["id"];
