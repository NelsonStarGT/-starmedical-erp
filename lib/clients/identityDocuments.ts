type CatalogDocumentType = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type IdentityDocumentOption = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  source: "catalog" | "fallback";
  sensitive: boolean;
  optional: boolean;
};

export type IdentityValidationInput = {
  value?: string | null;
  documentCode?: string | null;
  documentName?: string | null;
  optional?: boolean;
};

export type IdentityValidationResult = {
  ok: boolean;
  value: string | null;
  normalized: string | null;
  error: string | null;
};

const TAX_DOCUMENT_TOKENS = new Set([
  "NIT",
  "RFC",
  "RUC",
  "CUIT",
  "TAX",
  "RTN",
  "IVA",
  "VAT"
]);

const IDENTITY_DOCUMENT_TOKENS = [
  "DPI",
  "CEDULA",
  "IDENTIDAD",
  "PASAPORTE",
  "PASSPORT",
  "CURP",
  "INE",
  "DNI",
  "SSN",
  "SOCIAL_SECURITY",
  "DRIVER_LICENSE",
  "LICENCIA"
] as const;

const FALLBACK_PASSPORT_ID = "__FALLBACK_PASSPORT__";
const FALLBACK_NATIONAL_ID_ID = "__FALLBACK_NATIONAL_ID__";
const FALLBACK_SSN_ID = "__FALLBACK_SSN__";

const COUNTRY_IDENTITY_PRIORITY: Record<string, string[]> = {
  GT: ["DPI", "PASAPORTE", "CEDULA", "IDENTIDAD"],
  US: ["PASSPORT", "DRIVER_LICENSE", "SSN", "IDENTIDAD"],
  MX: ["CURP", "INE", "PASAPORTE", "PASSPORT"],
  CO: ["CEDULA", "PASAPORTE", "PASSPORT"],
  EC: ["CEDULA", "PASAPORTE", "PASSPORT"],
  PE: ["DNI", "PASAPORTE", "PASSPORT"],
  AR: ["DNI", "PASAPORTE", "PASSPORT"],
  CL: ["CEDULA", "PASAPORTE", "PASSPORT"]
};

const GT_ALLOWED_CODES = new Set(["DPI", "PASSPORT"]);

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferDocumentCode(name: string, description?: string | null) {
  const token = normalizeToken(`${name} ${description ?? ""}`);
  if (token.includes("SOCIAL_SECURITY") || token.includes("SSN")) return "SSN";
  if (token.includes("DRIVER_LICENSE") || token.includes("LICENCIA")) return "DRIVER_LICENSE";
  if (token.includes("PASSPORT") || token.includes("PASAPORTE")) return "PASSPORT";
  if (token.includes("CURP")) return "CURP";
  if (token.includes("INE")) return "INE";
  if (token.includes("DNI")) return "DNI";
  if (token.includes("CEDULA")) return "CEDULA";
  if (token.includes("DPI")) return "DPI";
  if (token.includes("IDENTIDAD")) return "IDENTIDAD";
  if (token.includes("DOCUMENTO") && token.includes("NACIONAL")) return "NATIONAL_ID";
  return token;
}

export function isSensitiveIdentityDocument(input: { code?: string | null; name?: string | null }) {
  const code = normalizeToken(input.code);
  const name = normalizeToken(input.name);
  return code === "SSN" || name.includes("SSN") || name.includes("SOCIAL_SECURITY");
}

function isTaxDocument(code: string) {
  return [...TAX_DOCUMENT_TOKENS].some((token) => code.includes(token));
}

function isIdentityDocument(code: string) {
  if (!code) return false;
  if (isTaxDocument(code)) return false;
  return IDENTITY_DOCUMENT_TOKENS.some((token) => code.includes(token));
}

function buildFallbackOptions(iso2: string | null | undefined) {
  const normalizedIso2 = normalizeToken(iso2);
  const base: IdentityDocumentOption[] = [
    {
      id: FALLBACK_PASSPORT_ID,
      name: "Pasaporte",
      description: "Fallback cuando no hay catálogo por país.",
      code: "PASSPORT",
      source: "fallback",
      sensitive: false,
      optional: false
    },
    {
      id: FALLBACK_NATIONAL_ID_ID,
      name: "Documento nacional",
      description: "Fallback cuando no hay catálogo por país.",
      code: "NATIONAL_ID",
      source: "fallback",
      sensitive: false,
      optional: false
    }
  ];

  if (normalizedIso2 === "US") {
    base.push({
      id: FALLBACK_SSN_ID,
      name: "SSN (sensible, opcional)",
      description: "No obligatorio. Capturar solo si el paciente lo proporciona voluntariamente.",
      code: "SSN",
      source: "fallback",
      sensitive: true,
      optional: true
    });
  }

  return base;
}

export function isFallbackDocumentTypeId(value: string | null | undefined) {
  const id = (value ?? "").trim();
  return id === FALLBACK_PASSPORT_ID || id === FALLBACK_NATIONAL_ID_ID || id === FALLBACK_SSN_ID;
}

export function buildIdentityDocumentOptionsByCountry(
  catalogItems: CatalogDocumentType[],
  iso2?: string | null
): IdentityDocumentOption[] {
  const normalizedIso2 = normalizeToken(iso2);
  const rows = (catalogItems ?? []).filter((item) => item && item.id && item.name && item.isActive !== false);

  const catalogOptions: IdentityDocumentOption[] = rows
    .map((item) => {
      const code = inferDocumentCode(item.name, item.description);
      const sensitive = isSensitiveIdentityDocument({ code, name: item.name });
      return {
        id: item.id,
        name: sensitive && normalizedIso2 === "US" ? `${item.name} (sensible, opcional)` : item.name,
        description:
          item.description ??
          (sensitive && normalizedIso2 === "US"
            ? "No obligatorio. Capturar solo si el paciente lo proporciona voluntariamente."
            : null),
        code,
        source: "catalog" as const,
        sensitive,
        optional: sensitive && normalizedIso2 === "US"
      };
    })
    .filter((item) => isIdentityDocument(item.code));

  const preferredTokens = COUNTRY_IDENTITY_PRIORITY[normalizedIso2] ?? [];
  const preferredOptions =
    preferredTokens.length > 0
      ? catalogOptions.filter((item) => preferredTokens.some((token) => item.code.includes(token)))
      : catalogOptions;

  let selected = preferredOptions.length ? preferredOptions : catalogOptions;
  if (!selected.length) {
    selected = buildFallbackOptions(normalizedIso2);
  }

  const byId = new Map<string, IdentityDocumentOption>();
  for (const item of selected) byId.set(item.id, item);

  const hasPassport = [...byId.values()].some((item) => item.code === "PASSPORT");
  if (!hasPassport) {
    for (const fallback of buildFallbackOptions(normalizedIso2)) {
      if (fallback.code === "PASSPORT" || fallback.code === "NATIONAL_ID") {
        if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
      }
    }
  }

  if (normalizedIso2 === "US") {
    const hasSsn = [...byId.values()].some((item) => item.code === "SSN");
    if (!hasSsn) {
      const ssnFallback = buildFallbackOptions("US").find((item) => item.code === "SSN");
      if (ssnFallback) byId.set(ssnFallback.id, ssnFallback);
    }
  }

  let out = [...byId.values()];
  if (normalizedIso2 === "GT") {
    out = out.filter((item) => GT_ALLOWED_CODES.has(item.code));
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

function normalizeIdentifierValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function validateIdentityDocumentValue(input: IdentityValidationInput): IdentityValidationResult {
  const optional = Boolean(input.optional);
  const raw = (input.value ?? "").trim();
  const code = inferDocumentCode(input.documentCode ?? "", input.documentName ?? "");

  if (!raw) {
    return optional
      ? { ok: true, value: null, normalized: null, error: null }
      : { ok: false, value: null, normalized: null, error: "Documento de identidad requerido." };
  }

  if (code.includes("DPI") && !/^\d{13}$/.test(raw)) {
    return {
      ok: false,
      value: null,
      normalized: null,
      error: "DPI debe tener 13 dígitos."
    };
  }

  if (code === "SSN" && !/^\d{3}-?\d{2}-?\d{4}$/.test(raw)) {
    return {
      ok: false,
      value: null,
      normalized: null,
      error: "SSN inválido. Formato esperado: 123-45-6789."
    };
  }

  if (code === "CURP" && !/^[A-Z]{4}\d{6}[A-Z0-9]{8}$/i.test(raw)) {
    return {
      ok: false,
      value: null,
      normalized: null,
      error: "CURP inválido."
    };
  }

  const normalized = normalizeIdentifierValue(raw);
  if (normalized.length < 4 || normalized.length > 40) {
    return {
      ok: false,
      value: null,
      normalized: null,
      error: "Documento inválido. Longitud permitida entre 4 y 40 caracteres."
    };
  }

  return {
    ok: true,
    value: raw,
    normalized,
    error: null
  };
}
