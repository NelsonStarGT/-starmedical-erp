export const COMPANY_PBX_CATEGORY_SEED = [
  { id: "central", label: "Central" },
  { id: "ventas", label: "Ventas" },
  { id: "compras", label: "Compras" },
  { id: "soporte", label: "Soporte" },
  { id: "recepcion", label: "Recepción" }
] as const;

export const COMPANY_PBX_CATEGORY_FALLBACK = [
  ...COMPANY_PBX_CATEGORY_SEED,
  { id: "otro", label: "Otro" }
] as const;
