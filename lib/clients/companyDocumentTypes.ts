const COMPANY_DOCUMENT_TYPE_LABELS = [
  "Patente de comercio",
  "Patente de sociedad",
  "RTU",
  "Escritura pública",
  "DPI/Pasaporte representante",
  "Constancia NIT",
  "Recibo agua",
  "Recibo luz",
  "Licencia sanitaria",
  "Constancia SSO",
  "Monitor SSO asignado",
  "Otros SSO",
  "Otros"
] as const;

type CanonicalCompanyDocumentType = (typeof COMPANY_DOCUMENT_TYPE_LABELS)[number];

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MATCHERS: Array<{ match: (normalized: string) => boolean; label: CanonicalCompanyDocumentType }> = [
  { match: (value) => value.includes("patente") && value.includes("comercio"), label: "Patente de comercio" },
  { match: (value) => value.includes("patente") && value.includes("sociedad"), label: "Patente de sociedad" },
  { match: (value) => value === "rtu" || value.includes("registro tributario"), label: "RTU" },
  { match: (value) => value.includes("escritura"), label: "Escritura pública" },
  { match: (value) => value.includes("dpi") || value.includes("pasaporte"), label: "DPI/Pasaporte representante" },
  { match: (value) => value.includes("nit") && value.includes("constancia"), label: "Constancia NIT" },
  { match: (value) => value.includes("recibo") && value.includes("agua"), label: "Recibo agua" },
  { match: (value) => value.includes("recibo") && value.includes("luz"), label: "Recibo luz" },
  { match: (value) => value.includes("licencia") && value.includes("sanitaria"), label: "Licencia sanitaria" },
  { match: (value) => value.includes("constancia") && value.includes("sso"), label: "Constancia SSO" },
  { match: (value) => value.includes("monitor") && value.includes("sso"), label: "Monitor SSO asignado" },
  { match: (value) => value.includes("sso") && value.includes("otro"), label: "Otros SSO" },
  { match: (value) => value === "otros" || value === "otro", label: "Otros" }
];

export function mapCompanyDocumentTypeLabel(name: string | null | undefined): CanonicalCompanyDocumentType {
  const normalized = normalizeToken(name ?? "");
  if (!normalized) return "Otros";
  for (const matcher of MATCHERS) {
    if (matcher.match(normalized)) return matcher.label;
  }
  return "Otros";
}

export function isCompanySsoDocumentType(name: string | null | undefined) {
  const label = mapCompanyDocumentTypeLabel(name);
  return label === "Licencia sanitaria" || label === "Constancia SSO" || label === "Monitor SSO asignado" || label === "Otros SSO";
}

export function getCompanyDocumentTypeReferenceLabels() {
  return [...COMPANY_DOCUMENT_TYPE_LABELS];
}

