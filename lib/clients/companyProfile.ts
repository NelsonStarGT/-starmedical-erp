import { ClientEmailCategory, ClientPhoneCategory } from "@prisma/client";
import {
  COMPANY_CONTACT_DEPARTMENTS,
  COMPANY_CONTACT_DEPARTMENT_BY_ID,
  COMPANY_CONTACT_DEPARTMENT_OTHER_ID
} from "@/lib/catalogs/departments";
import { ECONOMIC_ACTIVITY_OTHER_ID, requiresEconomicActivityOtherNote } from "@/lib/catalogs/economicActivities";
import {
  COMPANY_CONTACT_JOB_TITLES,
  COMPANY_CONTACT_JOB_TITLE_BY_ID,
  COMPANY_CONTACT_JOB_TITLE_OTHER_ID
} from "@/lib/catalogs/jobTitles";
import { COMPANY_PBX_CATEGORY_FALLBACK } from "@/lib/catalogs/pbxCategories";
import { sanitizeLocalNumber } from "@/lib/clients/phoneValidation";
import { isValidEmail } from "@/lib/utils";

export type CompanyTypeCode = "corporativo" | "pyme" | "operador" | "ong" | "gobierno" | "educativa" | "otro";

export const COMPANY_TYPE_OPTIONS: ReadonlyArray<{ code: CompanyTypeCode; label: string }> = [
  { code: "corporativo", label: "Corporativo" },
  { code: "pyme", label: "PyME" },
  { code: "operador", label: "Operador" },
  { code: "ong", label: "ONG" },
  { code: "gobierno", label: "Gobierno" },
  { code: "educativa", label: "Educativa" },
  { code: "otro", label: "Otro" }
] as const;

export const COMPANY_CONTACT_DEPARTMENT_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  COMPANY_CONTACT_DEPARTMENTS.map((item) => ({ value: item.id, label: item.label }));

export const COMPANY_CONTACT_JOB_TITLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  COMPANY_CONTACT_JOB_TITLES.map((item) => ({ value: item.id, label: item.label }));

export type CompanyGeneralChannelKind = "PHONE" | "EMAIL" | "WHATSAPP";
export type CompanyGeneralPhoneLineType = "movil" | "fijo";
export type CompanyGeneralChannelOwnerType = "COMPANY" | "PERSON";

export type CompanyGeneralChannelLabelPreset =
  | "pbx"
  | "recepcion"
  | "facturacion"
  | "rrhh"
  | "compras"
  | "cobranza"
  | "sso"
  | "gerencia"
  | "ti"
  | "otro";

export type CompanyPbxAreaPreset = string;
export type CompanyPbxCategoryOption = {
  value: string;
  label: string;
  isActive?: boolean;
};

export const COMPANY_GENERAL_CHANNEL_LABEL_PRESET_OPTIONS: ReadonlyArray<{
  value: CompanyGeneralChannelLabelPreset;
  label: string;
}> = [
  { value: "pbx", label: "PBX/Central" },
  { value: "recepcion", label: "Recepción" },
  { value: "facturacion", label: "Facturación" },
  { value: "rrhh", label: "RRHH" },
  { value: "compras", label: "Compras" },
  { value: "cobranza", label: "Cobranza" },
  { value: "sso", label: "SSO / Seguridad" },
  { value: "gerencia", label: "Gerencia" },
  { value: "ti", label: "Tecnología / TI" },
  { value: "otro", label: "Otro" }
] as const;

export const COMPANY_PBX_AREA_PRESET_OPTIONS: ReadonlyArray<CompanyPbxCategoryOption> = COMPANY_PBX_CATEGORY_FALLBACK.map((item) => ({
  value: item.id,
  label: item.label
}));

export type CompanyPersonPhoneType = "movil" | "fijo" | "whatsapp";
export type CompanyPersonPhoneMode = "DIRECTO" | "EXTENSION_PBX";

export type CompanyPersonPhoneLabelPreset = "personal" | "trabajo" | "whatsapp" | "pbx" | "otro";

export const COMPANY_PERSON_PHONE_TYPE_OPTIONS: ReadonlyArray<{
  value: CompanyPersonPhoneType;
  label: string;
}> = [
  { value: "movil", label: "Móvil" },
  { value: "fijo", label: "Fijo" },
  { value: "whatsapp", label: "WhatsApp" }
] as const;

export const COMPANY_PERSON_PHONE_MODE_OPTIONS: ReadonlyArray<{
  value: CompanyPersonPhoneMode;
  label: string;
}> = [
  { value: "DIRECTO", label: "Directo" },
  { value: "EXTENSION_PBX", label: "Extensión PBX" }
] as const;

export const COMPANY_PERSON_PHONE_LABEL_PRESET_OPTIONS: ReadonlyArray<{
  value: CompanyPersonPhoneLabelPreset;
  label: string;
}> = [
  { value: "personal", label: "Personal" },
  { value: "trabajo", label: "Trabajo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "pbx", label: "PBX/Central" },
  { value: "otro", label: "Otro" }
] as const;

export type CompanyPersonEmailLabelPreset = "personal" | "trabajo" | "facturacion" | "rrhh" | "otro";

export const COMPANY_PERSON_EMAIL_LABEL_PRESET_OPTIONS: ReadonlyArray<{
  value: CompanyPersonEmailLabelPreset;
  label: string;
}> = [
  { value: "personal", label: "Personal" },
  { value: "trabajo", label: "Trabajo" },
  { value: "facturacion", label: "Facturación" },
  { value: "rrhh", label: "RRHH" },
  { value: "otro", label: "Otro" }
] as const;

export type CompanyGeneralChannelInput = {
  id?: string | null;
  kind?: CompanyGeneralChannelKind | string | null;
  ownerType?: CompanyGeneralChannelOwnerType | string | null;
  ownerPersonId?: string | null;
  phoneLineType?: CompanyGeneralPhoneLineType | string | null;
  label?: string | null;
  labelPreset?: CompanyGeneralChannelLabelPreset | string | null;
  labelOther?: string | null;
  pbxAreaPreset?: CompanyPbxAreaPreset | string | null;
  pbxAreaOther?: string | null;
  value?: string | null;
  extension?: string | null;
  countryCode?: string | null;
  countryIso2?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type NormalizedCompanyGeneralChannel = {
  id: string | null;
  kind: CompanyGeneralChannelKind;
  ownerType: CompanyGeneralChannelOwnerType;
  ownerPersonId: string | null;
  labelPreset: CompanyGeneralChannelLabelPreset | null;
  pbxAreaPreset: CompanyPbxAreaPreset | null;
  pbxAreaOther: string | null;
  label: string | null;
  value: string;
  extension: string | null;
  countryCode: string | null;
  countryIso2: string | null;
  isPrimary: boolean;
};

export type CompanyPersonPhoneInput = {
  mode?: CompanyPersonPhoneMode | string | null;
  phoneType?: CompanyPersonPhoneType | string | null;
  labelPreset?: CompanyPersonPhoneLabelPreset | string | null;
  labelOther?: string | null;
  label?: string | null;
  value?: string | null;
  extension?: string | null;
  pbxChannelId?: string | null;
  countryCode?: string | null;
  countryIso2?: string | null;
  canCall?: boolean;
  canWhatsApp?: boolean;
  canSms?: boolean;
  isWhatsApp?: boolean;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type CompanyPersonEmailInput = {
  labelPreset?: CompanyPersonEmailLabelPreset | string | null;
  labelOther?: string | null;
  label?: string | null;
  value?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type CompanyEmploymentStatus = "ACTIVE" | "INACTIVE";

export type CompanyPersonContactInput = {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  departmentId?: string | null;
  departmentOther?: string | null;
  jobTitleId?: string | null;
  jobTitleOther?: string | null;
  employmentStatus?: CompanyEmploymentStatus | string | null;
  linkedUserId?: string | null;
  linkedUserName?: string | null;
  linkedUserEmail?: string | null;
  department?: string | null;
  role?: string | null;
  isAreaPrimary?: boolean;
  notes?: string | null;
  phones?: CompanyPersonPhoneInput[] | null;
  emails?: CompanyPersonEmailInput[] | null;
};

export type NormalizedCompanyPersonPhone = {
  mode: CompanyPersonPhoneMode;
  phoneType: CompanyPersonPhoneType;
  label: string | null;
  value: string;
  extension: string | null;
  pbxChannelId: string | null;
  countryCode: string | null;
  countryIso2: string | null;
  canCall: boolean;
  canWhatsApp: boolean;
  canSms: boolean;
  isWhatsApp: boolean;
  isPrimary: boolean;
};

export type NormalizedCompanyPersonEmail = {
  label: string | null;
  value: string;
  isPrimary: boolean;
};

export type NormalizedCompanyPersonContact = {
  firstName: string;
  lastName: string;
  departmentId: string | null;
  departmentOther: string | null;
  jobTitleId: string | null;
  jobTitleOther: string | null;
  employmentStatus: CompanyEmploymentStatus;
  linkedUserId: string | null;
  linkedUserName: string | null;
  linkedUserEmail: string | null;
  department: string;
  role: string;
  isAreaPrimary: boolean;
  notes: string | null;
  phones: NormalizedCompanyPersonPhone[];
  emails: NormalizedCompanyPersonEmail[];
};

const GENERAL_CHANNEL_KINDS = new Set<CompanyGeneralChannelKind>(["PHONE", "EMAIL", "WHATSAPP"]);
const GENERAL_CHANNEL_OWNER_TYPES = new Set<CompanyGeneralChannelOwnerType>(["COMPANY", "PERSON"]);
const OTHER_TOKENS = new Set(["OTRO", "OTRA", "OTROS", "OTHER"]);
const COMPANY_GENERAL_LABEL_PRESET_SET = new Set<CompanyGeneralChannelLabelPreset>(
  COMPANY_GENERAL_CHANNEL_LABEL_PRESET_OPTIONS.map((option) => option.value)
);
const COMPANY_GENERAL_LABEL_PRESET_CANONICAL: Record<CompanyGeneralChannelLabelPreset, string> = {
  pbx: "PBX/Central",
  recepcion: "Recepción",
  facturacion: "Facturación",
  rrhh: "RRHH",
  compras: "Compras",
  cobranza: "Cobranza",
  sso: "SSO / Seguridad",
  gerencia: "Gerencia",
  ti: "Tecnología / TI",
  otro: "Otro"
};
const COMPANY_GENERAL_LABEL_PRESET_ALIASES = new Map<string, CompanyGeneralChannelLabelPreset>([
  ["PBX", "pbx"],
  ["PBX_CENTRAL", "pbx"],
  ["CENTRAL", "pbx"],
  ["RECEPCION", "recepcion"],
  ["FACTURACION", "facturacion"],
  ["RRHH", "rrhh"],
  ["RECURSOS_HUMANOS", "rrhh"],
  ["COMPRAS", "compras"],
  ["COBRANZA", "cobranza"],
  ["SSO", "sso"],
  ["SALUD_OCUPACIONAL", "sso"],
  ["SEGURIDAD_OCUPACIONAL", "sso"],
  ["GERENCIA", "gerencia"],
  ["DIRECCION", "gerencia"],
  ["TI", "ti"],
  ["IT", "ti"],
  ["TECNOLOGIA", "ti"],
  ["TECNOLOGIA_TI", "ti"],
  ["OTRO", "otro"]
]);
const COMPANY_PBX_AREA_PRESET_ALIASES = new Map<string, string>([
  ["CENTRAL", "central"],
  ["VENTAS", "ventas"],
  ["COMPRAS", "compras"],
  ["SOPORTE", "soporte"],
  ["SOPORTE_TECNICO", "soporte"],
  ["HELPDESK", "soporte"],
  ["RECEPCION", "recepcion"],
  ["PBX", "central"],
  ["PBX_CENTRAL", "central"],
  ["OTRO", "otro"]
]);
const COMPANY_PERSON_PHONE_TYPE_SET = new Set<CompanyPersonPhoneType>(
  COMPANY_PERSON_PHONE_TYPE_OPTIONS.map((option) => option.value)
);
const COMPANY_PERSON_PHONE_LABEL_PRESET_SET = new Set<CompanyPersonPhoneLabelPreset>(
  COMPANY_PERSON_PHONE_LABEL_PRESET_OPTIONS.map((option) => option.value)
);
const COMPANY_PERSON_EMAIL_LABEL_PRESET_SET = new Set<CompanyPersonEmailLabelPreset>(
  COMPANY_PERSON_EMAIL_LABEL_PRESET_OPTIONS.map((option) => option.value)
);
const COMPANY_PERSON_PHONE_LABEL_CANONICAL: Record<CompanyPersonPhoneLabelPreset, string> = {
  personal: "Personal",
  trabajo: "Trabajo",
  whatsapp: "WhatsApp",
  pbx: "PBX/Central",
  otro: "Otro"
};
const COMPANY_PERSON_EMAIL_LABEL_CANONICAL: Record<CompanyPersonEmailLabelPreset, string> = {
  personal: "Personal",
  trabajo: "Trabajo",
  facturacion: "Facturación",
  rrhh: "RRHH",
  otro: "Otro"
};
const COMPANY_PERSON_PHONE_LABEL_PRESET_ALIASES = new Map<string, CompanyPersonPhoneLabelPreset>([
  ["PERSONAL", "personal"],
  ["TRABAJO", "trabajo"],
  ["LABORAL", "trabajo"],
  ["WHATSAPP", "whatsapp"],
  ["PBX", "pbx"],
  ["PBX_CENTRAL", "pbx"],
  ["CENTRAL", "pbx"],
  ["OTRO", "otro"]
]);
const COMPANY_PERSON_EMAIL_LABEL_PRESET_ALIASES = new Map<string, CompanyPersonEmailLabelPreset>([
  ["PERSONAL", "personal"],
  ["TRABAJO", "trabajo"],
  ["LABORAL", "trabajo"],
  ["FACTURACION", "facturacion"],
  ["RRHH", "rrhh"],
  ["RECURSOS_HUMANOS", "rrhh"],
  ["OTRO", "otro"]
]);
const COUNTRY_CODE_TO_ISO2 = new Map<string, string>([
  ["502", "GT"],
  ["506", "CR"],
  ["503", "SV"],
  ["504", "HN"],
  ["507", "PA"],
  ["52", "MX"],
  ["57", "CO"],
  ["1", "US"]
]);
const ISO2_TO_COUNTRY_CODE = new Map<string, string>(
  Array.from(COUNTRY_CODE_TO_ISO2.entries()).map(([code, iso2]) => [iso2, `+${code}`])
);

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDraftId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeToken(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeDirectoryCode(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolvePbxCategoryOptions(options?: ReadonlyArray<CompanyPbxCategoryOption>): CompanyPbxCategoryOption[] {
  const source = Array.isArray(options) && options.length > 0 ? options : COMPANY_PBX_AREA_PRESET_OPTIONS;
  const deduped = new Map<string, CompanyPbxCategoryOption>();

  for (const row of source) {
    const value = normalizeDirectoryCode(row.value);
    if (!value) continue;
    if (!deduped.has(value)) {
      deduped.set(value, {
        value,
        label: normalizeOptional(row.label) ?? value,
        isActive: row.isActive !== false
      });
    }
  }

  if (deduped.size > 0) {
    return Array.from(deduped.values());
  }

  return COMPANY_PBX_AREA_PRESET_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
    isActive: item.isActive !== false
  }));
}

function buildPbxCategoryIndexes(options?: ReadonlyArray<CompanyPbxCategoryOption>) {
  const resolvedOptions = resolvePbxCategoryOptions(options);
  const byValue = new Map(resolvedOptions.map((row) => [row.value, row] as const));
  const byToken = new Map<string, string>();

  for (const row of resolvedOptions) {
    const valueToken = normalizeToken(row.value);
    if (valueToken && !byToken.has(valueToken)) byToken.set(valueToken, row.value);
    const labelToken = normalizeToken(row.label);
    if (labelToken && !byToken.has(labelToken)) byToken.set(labelToken, row.value);
  }

  for (const [alias, value] of COMPANY_PBX_AREA_PRESET_ALIASES.entries()) {
    if (!byToken.has(alias)) {
      byToken.set(alias, value);
    }
  }

  return {
    resolvedOptions,
    byValue,
    byToken
  };
}

function toFallbackPbxAreaLabel(value?: string | null) {
  const normalized = normalizeDirectoryCode(value);
  if (!normalized) return "Otro";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function getDefaultPbxAreaPreset(options?: ReadonlyArray<CompanyPbxCategoryOption>): CompanyPbxAreaPreset {
  const resolvedOptions = resolvePbxCategoryOptions(options);
  const firstActive = resolvedOptions.find((item) => item.isActive !== false);
  return firstActive?.value ?? resolvedOptions[0]?.value ?? "central";
}

function getPbxAreaLabel(areaPreset?: string | null, options?: ReadonlyArray<CompanyPbxCategoryOption>) {
  const normalizedPreset = normalizeDirectoryCode(areaPreset);
  if (!normalizedPreset) return "Otro";
  const { byValue } = buildPbxCategoryIndexes(options);
  const option = byValue.get(normalizedPreset);
  return option?.label ?? toFallbackPbxAreaLabel(normalizedPreset);
}

function toGeneralChannelKind(value?: string | null): CompanyGeneralChannelKind {
  const normalized = normalizeToken(value);
  if (GENERAL_CHANNEL_KINDS.has(normalized as CompanyGeneralChannelKind)) {
    return normalized as CompanyGeneralChannelKind;
  }
  return "PHONE";
}

function toGeneralChannelOwnerType(value?: string | null): CompanyGeneralChannelOwnerType {
  const normalized = normalizeToken(value);
  if (GENERAL_CHANNEL_OWNER_TYPES.has(normalized as CompanyGeneralChannelOwnerType)) {
    return normalized as CompanyGeneralChannelOwnerType;
  }
  return "COMPANY";
}

function toGeneralLabelPreset(value?: string | null): CompanyGeneralChannelLabelPreset | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  if (COMPANY_GENERAL_LABEL_PRESET_SET.has(normalized.toLowerCase() as CompanyGeneralChannelLabelPreset)) {
    return normalized.toLowerCase() as CompanyGeneralChannelLabelPreset;
  }
  return COMPANY_GENERAL_LABEL_PRESET_ALIASES.get(normalized) ?? null;
}

function toPersonPhoneType(value?: string | null): CompanyPersonPhoneType | null {
  const normalized = normalizeToken(value).toLowerCase();
  if (!normalized) return null;
  if (COMPANY_PERSON_PHONE_TYPE_SET.has(normalized as CompanyPersonPhoneType)) {
    return normalized as CompanyPersonPhoneType;
  }
  if (normalized.includes("WHATSAPP")) return "whatsapp";
  if (normalized.includes("FIJO")) return "fijo";
  if (normalized.includes("MOVIL") || normalized.includes("CELULAR")) return "movil";
  return null;
}

function toPersonPhoneMode(value?: string | null): CompanyPersonPhoneMode {
  const normalized = normalizeToken(value);
  if (!normalized) return "DIRECTO";
  if (
    normalized === "EXTENSION_PBX" ||
    normalized === "PBX_EXTENSION" ||
    normalized === "EXTENSION" ||
    normalized === "INTERNO"
  ) {
    return "EXTENSION_PBX";
  }
  return "DIRECTO";
}

function toGeneralPhoneLineType(value?: string | null): CompanyGeneralPhoneLineType {
  const normalized = normalizeToken(value).toLowerCase();
  if (normalized === "fijo") return "fijo";
  return "movil";
}

function toPersonPhoneLabelPreset(value?: string | null): CompanyPersonPhoneLabelPreset | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  if (COMPANY_PERSON_PHONE_LABEL_PRESET_SET.has(normalized.toLowerCase() as CompanyPersonPhoneLabelPreset)) {
    return normalized.toLowerCase() as CompanyPersonPhoneLabelPreset;
  }
  return COMPANY_PERSON_PHONE_LABEL_PRESET_ALIASES.get(normalized) ?? null;
}

function toPersonEmailLabelPreset(value?: string | null): CompanyPersonEmailLabelPreset | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  if (COMPANY_PERSON_EMAIL_LABEL_PRESET_SET.has(normalized.toLowerCase() as CompanyPersonEmailLabelPreset)) {
    return normalized.toLowerCase() as CompanyPersonEmailLabelPreset;
  }
  return COMPANY_PERSON_EMAIL_LABEL_PRESET_ALIASES.get(normalized) ?? null;
}

function normalizeCountryIso2Input(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const codeDigits = trimmed.replace(/[^\d]/g, "");
  if (codeDigits) {
    const mapped = COUNTRY_CODE_TO_ISO2.get(codeDigits);
    if (mapped) return mapped;
  }
  return normalizeToken(trimmed).slice(0, 2);
}

function normalizeCallingCodeInput(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

function toCallingCodeFromIso2(value?: string | null) {
  const iso2 = normalizeCountryIso2Input(value);
  if (!iso2) return null;
  return ISO2_TO_COUNTRY_CODE.get(iso2) ?? null;
}

function toPbxAreaPreset(value?: string | null, options?: ReadonlyArray<CompanyPbxCategoryOption>): CompanyPbxAreaPreset | null {
  const normalizedCode = normalizeDirectoryCode(value);
  const { byValue, byToken } = buildPbxCategoryIndexes(options);
  if (normalizedCode && byValue.has(normalizedCode)) {
    return normalizedCode;
  }
  const token = normalizeToken(value);
  if (token) {
    const matchedValue = byToken.get(token);
    if (matchedValue) {
      return matchedValue;
    }
  }
  if (normalizedCode) {
    return normalizedCode;
  }
  return null;
}

function inferPbxAreaFromLegacyLabel(
  label?: string | null,
  options?: ReadonlyArray<CompanyPbxCategoryOption>
): CompanyPbxAreaPreset | null {
  const token = normalizeToken(label);
  if (!token) return null;
  const inferred =
    token.includes("VENTA") ? "ventas" :
    token.includes("COMPRA") ? "compras" :
    token.includes("SOPORTE") || token.includes("HELPDESK") ? "soporte" :
    token.includes("RECEPCION") ? "recepcion" :
    token.includes("CENTRAL") || token.includes("PBX") ? "central" :
    null;
  if (!inferred) return null;
  return toPbxAreaPreset(inferred, options) ?? inferred;
}

export function resolveCompanyGeneralChannelLabel(
  input: {
    label?: string | null;
    labelPreset?: CompanyGeneralChannelLabelPreset | string | null;
    labelOther?: string | null;
    pbxAreaPreset?: CompanyPbxAreaPreset | string | null;
    pbxAreaOther?: string | null;
  },
  context?: {
    pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>;
  }
) {
  const pbxCategoryOptions = context?.pbxCategoryOptions;
  const defaultPbxPreset = getDefaultPbxAreaPreset(pbxCategoryOptions);
  const legacyLabel = normalizeOptional(input.label);
  const presetFromInput = toGeneralLabelPreset(input.labelPreset);
  const presetFromLegacy = toGeneralLabelPreset(legacyLabel);
  const resolvedPreset = presetFromInput ?? presetFromLegacy;

  if (resolvedPreset === "pbx") {
    const areaPreset =
      toPbxAreaPreset(input.pbxAreaPreset, pbxCategoryOptions) ??
      inferPbxAreaFromLegacyLabel(legacyLabel, pbxCategoryOptions) ??
      defaultPbxPreset;
    const explicitOther = normalizeOptional(input.pbxAreaOther);
    const areaOther = areaPreset === "otro" ? explicitOther ?? normalizeOptional(input.labelOther) : null;
    const areaLabel = areaPreset === "otro"
      ? areaOther ?? getPbxAreaLabel(areaPreset, pbxCategoryOptions)
      : getPbxAreaLabel(areaPreset, pbxCategoryOptions);
    return {
      labelPreset: "pbx" as const,
      labelOther: null as string | null,
      pbxAreaPreset: areaPreset,
      pbxAreaOther: areaOther,
      label: `PBX ${areaLabel}`
    };
  }

  if (resolvedPreset && resolvedPreset !== "otro") {
    return {
      labelPreset: resolvedPreset,
      labelOther: null as string | null,
      pbxAreaPreset: null as CompanyPbxAreaPreset | null,
      pbxAreaOther: null as string | null,
      label: COMPANY_GENERAL_LABEL_PRESET_CANONICAL[resolvedPreset]
    };
  }

  const explicitOther = normalizeOptional(input.labelOther);
  const fallbackOther = resolvedPreset === "otro" ? explicitOther ?? legacyLabel : null;
  if (resolvedPreset === "otro") {
    return {
      labelPreset: "otro" as const,
      labelOther: fallbackOther,
      pbxAreaPreset: null as CompanyPbxAreaPreset | null,
      pbxAreaOther: null as string | null,
      label: fallbackOther
    };
  }

  if (legacyLabel) {
    return {
      labelPreset: "otro" as const,
      labelOther: legacyLabel,
      pbxAreaPreset: null as CompanyPbxAreaPreset | null,
      pbxAreaOther: null as string | null,
      label: legacyLabel
    };
  }

  return {
    labelPreset: null as CompanyGeneralChannelLabelPreset | null,
    labelOther: null as string | null,
    pbxAreaPreset: null as CompanyPbxAreaPreset | null,
    pbxAreaOther: null as string | null,
    label: null as string | null
  };
}

export function resolveCompanyPersonPhoneLabel(input: {
  label?: string | null;
  labelPreset?: CompanyPersonPhoneLabelPreset | string | null;
  labelOther?: string | null;
  phoneType?: CompanyPersonPhoneType | string | null;
}) {
  const legacyLabel = normalizeOptional(input.label);
  const presetFromInput = toPersonPhoneLabelPreset(input.labelPreset);
  const presetFromLegacy = toPersonPhoneLabelPreset(legacyLabel);
  const inferredFromType = toPersonPhoneType(input.phoneType) === "whatsapp" ? "whatsapp" : null;
  const resolvedPreset = presetFromInput ?? presetFromLegacy ?? inferredFromType;

  if (resolvedPreset && resolvedPreset !== "otro") {
    return {
      labelPreset: resolvedPreset,
      labelOther: null as string | null,
      label: COMPANY_PERSON_PHONE_LABEL_CANONICAL[resolvedPreset]
    };
  }

  const explicitOther = normalizeOptional(input.labelOther);
  const fallbackOther = resolvedPreset === "otro" ? explicitOther ?? legacyLabel : null;
  if (resolvedPreset === "otro") {
    return {
      labelPreset: "otro" as const,
      labelOther: fallbackOther,
      label: fallbackOther
    };
  }

  if (legacyLabel) {
    return {
      labelPreset: "otro" as const,
      labelOther: legacyLabel,
      label: legacyLabel
    };
  }

  return {
    labelPreset: null as CompanyPersonPhoneLabelPreset | null,
    labelOther: null as string | null,
    label: null as string | null
  };
}

export function resolveCompanyPersonEmailLabel(input: {
  label?: string | null;
  labelPreset?: CompanyPersonEmailLabelPreset | string | null;
  labelOther?: string | null;
}) {
  const legacyLabel = normalizeOptional(input.label);
  const presetFromInput = toPersonEmailLabelPreset(input.labelPreset);
  const presetFromLegacy = toPersonEmailLabelPreset(legacyLabel);
  const resolvedPreset = presetFromInput ?? presetFromLegacy;

  if (resolvedPreset && resolvedPreset !== "otro") {
    return {
      labelPreset: resolvedPreset,
      labelOther: null as string | null,
      label: COMPANY_PERSON_EMAIL_LABEL_CANONICAL[resolvedPreset]
    };
  }

  const explicitOther = normalizeOptional(input.labelOther);
  const fallbackOther = resolvedPreset === "otro" ? explicitOther ?? legacyLabel : null;
  if (resolvedPreset === "otro") {
    return {
      labelPreset: "otro" as const,
      labelOther: fallbackOther,
      label: fallbackOther
    };
  }

  if (legacyLabel) {
    return {
      labelPreset: "otro" as const,
      labelOther: legacyLabel,
      label: legacyLabel
    };
  }

  return {
    labelPreset: null as CompanyPersonEmailLabelPreset | null,
    labelOther: null as string | null,
    label: null as string | null
  };
}

export function resolveCompanyContactDepartment(input: {
  departmentId?: string | null;
  departmentOther?: string | null;
  department?: string | null;
}) {
  const sourceId = input.departmentId?.trim();
  const sourceOther = normalizeOptional(input.departmentOther);
  const legacy = normalizeOptional(input.department);
  const hasCanonicalIdShape = (value: string) => /^[A-Za-z0-9_:-]+$/.test(value);

  if (sourceId && sourceId !== COMPANY_CONTACT_DEPARTMENT_OTHER_ID && hasCanonicalIdShape(sourceId)) {
    const match = COMPANY_CONTACT_DEPARTMENT_BY_ID.get(sourceId);
    return {
      departmentId: sourceId,
      departmentOther: null as string | null,
      departmentLabel: match?.label ?? legacy ?? sourceId
    };
  }

  const normalizedOther = sourceOther ?? legacy ?? (sourceId && sourceId !== COMPANY_CONTACT_DEPARTMENT_OTHER_ID ? sourceId : null);
  if (sourceId === COMPANY_CONTACT_DEPARTMENT_OTHER_ID || normalizedOther) {
    return {
      departmentId: COMPANY_CONTACT_DEPARTMENT_OTHER_ID,
      departmentOther: normalizedOther,
      departmentLabel: normalizedOther
    };
  }

  return {
    departmentId: null as string | null,
    departmentOther: null as string | null,
    departmentLabel: null as string | null
  };
}

export function resolveCompanyContactJobTitle(input: {
  jobTitleId?: string | null;
  jobTitleOther?: string | null;
  role?: string | null;
}) {
  const sourceId = input.jobTitleId?.trim();
  const sourceOther = normalizeOptional(input.jobTitleOther);
  const legacy = normalizeOptional(input.role);
  const hasCanonicalIdShape = (value: string) => /^[A-Za-z0-9_:-]+$/.test(value);

  if (sourceId && sourceId !== COMPANY_CONTACT_JOB_TITLE_OTHER_ID && hasCanonicalIdShape(sourceId)) {
    const match = COMPANY_CONTACT_JOB_TITLE_BY_ID.get(sourceId);
    return {
      jobTitleId: sourceId,
      jobTitleOther: null as string | null,
      jobTitleLabel: match?.label ?? legacy ?? sourceId
    };
  }

  const normalizedOther = sourceOther ?? legacy ?? (sourceId && sourceId !== COMPANY_CONTACT_JOB_TITLE_OTHER_ID ? sourceId : null);
  if (sourceId === COMPANY_CONTACT_JOB_TITLE_OTHER_ID || normalizedOther) {
    return {
      jobTitleId: COMPANY_CONTACT_JOB_TITLE_OTHER_ID,
      jobTitleOther: normalizedOther,
      jobTitleLabel: normalizedOther
    };
  }

  return {
    jobTitleId: null as string | null,
    jobTitleOther: null as string | null,
    jobTitleLabel: null as string | null
  };
}

export function resolveCompanyEmploymentStatus(value?: string | null): CompanyEmploymentStatus {
  return value === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

export function applyCompanyPersonLinkedUser<T extends {
  linkedUserId?: string | null;
  linkedUserName?: string | null;
  linkedUserEmail?: string | null;
}>(input: T, user: { id: string; name?: string | null; email?: string | null } | null): T {
  if (!user) {
    return {
      ...input,
      linkedUserId: null,
      linkedUserName: null,
      linkedUserEmail: null
    };
  }
  return {
    ...input,
    linkedUserId: user.id,
    linkedUserName: normalizeOptional(user.name) ?? null,
    linkedUserEmail: normalizeOptional(user.email) ?? null
  };
}

export function ensureSinglePrimaryByType<T extends { isPrimary: boolean }>(
  rows: T[],
  getType: (row: T) => string
): T[] {
  const groupedIndexes = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const type = getType(row);
    const indexes = groupedIndexes.get(type) ?? [];
    indexes.push(index);
    groupedIndexes.set(type, indexes);
  });

  const next = rows.map((row) => ({ ...row }));
  for (const indexes of groupedIndexes.values()) {
    const selected = indexes.find((index) => next[index]?.isPrimary) ?? indexes[0];
    indexes.forEach((index) => {
      if (!next[index]) return;
      next[index].isPrimary = index === selected;
    });
  }
  return next;
}

export function reassignCompanyChannelOwnersOnPersonRemoval<T extends {
  ownerType?: CompanyGeneralChannelOwnerType | string | null;
  ownerPersonId?: string | null;
}>(channels: T[], removedPersonIds: string[]) {
  const removed = new Set(removedPersonIds.map((id) => id.trim()).filter(Boolean));
  if (!removed.size) return channels.map((row) => ({ ...row }));
  return channels.map((row) => {
    const ownerType = toGeneralChannelOwnerType(row.ownerType);
    const ownerPersonId = normalizeDraftId(row.ownerPersonId);
    if (ownerType === "PERSON" && ownerPersonId && removed.has(ownerPersonId)) {
      return {
        ...row,
        ownerType: "COMPANY" as CompanyGeneralChannelOwnerType,
        ownerPersonId: null
      };
    }
    return { ...row };
  });
}

function hasAnyNonChannelData(contact: CompanyPersonContactInput) {
  const department = resolveCompanyContactDepartment(contact);
  const jobTitle = resolveCompanyContactJobTitle(contact);
  return Boolean(
    normalizeOptional(contact.firstName) ||
      normalizeOptional(contact.lastName) ||
      department.departmentId ||
      department.departmentOther ||
      jobTitle.jobTitleId ||
      jobTitle.jobTitleOther ||
      normalizeOptional(contact.linkedUserId) ||
      Boolean(contact.isAreaPrimary) ||
      normalizeOptional(contact.notes)
  );
}

export function summarizeCompanyPbxDraft(
  channels?: CompanyGeneralChannelInput[] | null,
  context?: { pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption> }
) {
  const source = Array.isArray(channels) ? channels : [];
  let phoneRowsWithValue = 0;
  let pbxRows = 0;
  let pbxPrimaryRows = 0;
  let pbxValue: string | null = null;
  let pbxCountryIso2: string | null = null;
  const pbxRowsMap = new Map<string, { id: string; hasValue: boolean; value: string | null }>();

  for (const row of source) {
    if (row?.isActive === false) continue;
    const kind = toGeneralChannelKind(row?.kind);
    if (kind !== "PHONE") continue;

    const resolvedLabel = resolveCompanyGeneralChannelLabel(row ?? {}, {
      pbxCategoryOptions: context?.pbxCategoryOptions
    });
    const normalizedValue = sanitizeLocalNumber(normalizeOptional(row?.value) ?? "");
    if (normalizedValue) phoneRowsWithValue += 1;

    if (resolvedLabel.labelPreset === "pbx") {
      pbxRows += 1;
      if (row?.isPrimary) pbxPrimaryRows += 1;
      const id = normalizeDraftId(row?.id);
      if (id) {
        pbxRowsMap.set(id, {
          id,
          hasValue: Boolean(normalizedValue),
          value: normalizedValue || null
        });
      }
      if (!pbxValue && normalizedValue) {
        pbxValue = normalizedValue;
        pbxCountryIso2 = normalizeCountryIso2Input(row?.countryCode ?? row?.countryIso2) || null;
      }
    }
  }

  return {
    phoneRowsWithValue,
    pbxRows,
    pbxPrimaryRows,
    pbxValue,
    pbxCountryIso2,
    pbxRowsMap
  };
}

export function getPrimaryPbxChannel(channels?: NormalizedCompanyGeneralChannel[] | null) {
  const source = Array.isArray(channels) ? channels : [];
  return (
    source.find((row) => row.kind === "PHONE" && row.labelPreset === "pbx" && row.isPrimary) ??
    source.find((row) => row.kind === "PHONE" && row.labelPreset === "pbx") ??
    null
  );
}

export function getCompanyPbxChannels(channels?: NormalizedCompanyGeneralChannel[] | null) {
  const source = Array.isArray(channels) ? channels : [];
  return source.filter((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
}

export function buildCompanyPbxExtensionPreview(input: {
  pbxLabel?: string | null;
  pbxCountryCode?: string | null;
  pbxValue?: string | null;
  extension?: string | null;
}) {
  const pbxValue = sanitizeLocalNumber(normalizeOptional(input.pbxValue) ?? "");
  const pbxLabel = normalizeOptional(input.pbxLabel);
  const pbxCountryCode = normalizeCallingCodeInput(input.pbxCountryCode) || toCallingCodeFromIso2(input.pbxCountryCode) || "";
  const extension = normalizeOptional(input.extension);
  if (!pbxValue || !extension) return "";
  const numberWithPrefix = pbxCountryCode ? `${pbxCountryCode} ${pbxValue}` : pbxValue;
  const labelSegment = pbxLabel ? ` ${pbxLabel}` : "";
  return `PBX${labelSegment} ${numberWithPrefix} + ext ${extension}`.trim();
}

export function canUsePbxExtensionMode(input?: { generalChannels?: CompanyGeneralChannelInput[] | null }) {
  const pbxSummary = summarizeCompanyPbxDraft(input?.generalChannels);
  return pbxSummary.pbxRows > 0 && Boolean(pbxSummary.pbxValue);
}

export function collectLegacyPbxExtensions(input?: {
  generalChannels?: CompanyGeneralChannelInput[] | null;
  pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>;
}) {
  const source = Array.isArray(input?.generalChannels) ? input?.generalChannels : [];
  const notes: string[] = [];
  for (const row of source) {
    if (row?.isActive === false) continue;
    const kind = toGeneralChannelKind(row?.kind);
    const label = resolveCompanyGeneralChannelLabel(row ?? {}, {
      pbxCategoryOptions: input?.pbxCategoryOptions
    });
    if (kind !== "PHONE" || label.labelPreset !== "pbx") continue;
    const extension = normalizeOptional(row?.extension);
    if (!extension) continue;
    const pbxValue = sanitizeLocalNumber(normalizeOptional(row?.value) ?? "");
    if (!pbxValue) continue;
    notes.push(`PBX ${label.label ?? "sin área"} ext ${extension} (legacy C0)`);
  }
  return notes;
}

export function buildCompanyContactPersonSummary(
  person: Pick<NormalizedCompanyPersonContact, "firstName" | "lastName" | "department" | "role" | "phones" | "emails">,
  context?: { pbxChannels?: NormalizedCompanyGeneralChannel[] | null }
) {
  const pbxById = new Map(
    getCompanyPbxChannels(context?.pbxChannels)
      .filter((row) => Boolean(row.id))
      .map((row) => [row.id as string, row] as const)
  );
  const fullName = `${person.firstName} ${person.lastName}`.trim();
  const headlineParts = [fullName || "Sin nombre", person.department || "Sin área", person.role || "Sin cargo"];

  const primaryPhone = person.phones.find((row) => row.isPrimary) ?? person.phones[0] ?? null;
  const primaryEmail = person.emails.find((row) => row.isPrimary) ?? person.emails[0] ?? null;
  const pbxPhone = person.phones.find((row) => row.mode === "EXTENSION_PBX" && row.isPrimary) ??
    person.phones.find((row) => row.mode === "EXTENSION_PBX") ??
    null;

  const chips: string[] = [];
  if (primaryPhone) {
    if (primaryPhone.mode === "EXTENSION_PBX") {
      const pbx = primaryPhone.pbxChannelId ? pbxById.get(primaryPhone.pbxChannelId) ?? null : null;
      chips.push(
        buildCompanyPbxExtensionPreview({
          pbxLabel: pbx?.label,
          pbxCountryCode: pbx?.countryCode ?? pbx?.countryIso2 ?? null,
          pbxValue: pbx?.value ?? primaryPhone.value,
          extension: primaryPhone.extension
        }) || "Tel principal (PBX)"
      );
    } else {
      const code = normalizeOptional(primaryPhone.countryCode);
      chips.push(code ? `${code} ${primaryPhone.value}` : primaryPhone.value);
    }
  }
  if (primaryEmail?.value) chips.push(primaryEmail.value);
  if (pbxPhone && pbxPhone !== primaryPhone) {
    const pbx = pbxPhone.pbxChannelId ? pbxById.get(pbxPhone.pbxChannelId) ?? null : null;
    const pbxPreview = buildCompanyPbxExtensionPreview({
      pbxLabel: pbx?.label,
      pbxCountryCode: pbx?.countryCode ?? pbx?.countryIso2 ?? null,
      pbxValue: pbx?.value ?? pbxPhone.value,
      extension: pbxPhone.extension
    });
    if (pbxPreview) chips.push(pbxPreview);
  }

  return {
    headline: headlineParts.filter(Boolean).join(" • "),
    chips
  };
}

export function normalizeCompanyGeneralChannels(
  channels?: CompanyGeneralChannelInput[] | null,
  context?: { pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption> }
): NormalizedCompanyGeneralChannel[] {
  const source = Array.isArray(channels) ? channels : [];
  const rows: NormalizedCompanyGeneralChannel[] = [];

  for (const row of source) {
    if (row.isActive === false) continue;
    const kind = toGeneralChannelKind(row.kind);
    const resolvedLabel = resolveCompanyGeneralChannelLabel(row, {
      pbxCategoryOptions: context?.pbxCategoryOptions
    });
    const label = resolvedLabel.label;
    const labelPreset = resolvedLabel.labelPreset;
    const ownerType = toGeneralChannelOwnerType(row.ownerType);
    const ownerPersonId = ownerType === "PERSON" ? normalizeDraftId(row.ownerPersonId) : null;
    const channelId = normalizeDraftId(row.id);
    const pbxAreaPreset = resolvedLabel.pbxAreaPreset;
    const pbxAreaOther = resolvedLabel.pbxAreaOther;
    const rawValue = normalizeOptional(row.value);
    if (!rawValue) continue;

    if (kind === "EMAIL") {
      const normalizedEmail = rawValue.toLowerCase();
      if (!isValidEmail(normalizedEmail)) continue;
      rows.push({
        id: channelId,
        kind,
        ownerType,
        ownerPersonId,
        labelPreset,
        pbxAreaPreset,
        pbxAreaOther,
        label,
        value: normalizedEmail,
        extension: null,
        countryCode: null,
        countryIso2: null,
        isPrimary: Boolean(row.isPrimary)
      });
      continue;
    }

    const number = sanitizeLocalNumber(rawValue);
    if (!number) continue;
    const phoneLineType = toGeneralPhoneLineType(row.phoneLineType);
    const extensionAllowed = resolvedLabel.labelPreset !== "pbx" && phoneLineType === "fijo";
    const countryIso2 = normalizeCountryIso2Input(row.countryCode ?? row.countryIso2) || null;
    const countryCode = normalizeCallingCodeInput(row.countryCode) || toCallingCodeFromIso2(countryIso2) || null;
    rows.push({
      id: channelId,
      kind,
      ownerType,
      ownerPersonId,
      labelPreset,
      pbxAreaPreset,
      pbxAreaOther,
      label,
      value: number,
      extension: kind === "PHONE" && extensionAllowed ? normalizeOptional(row.extension) : null,
      countryCode,
      countryIso2,
      isPrimary: Boolean(row.isPrimary)
    });
  }
  const normalized = ensureSinglePrimaryByType(rows, (row) => row.kind);
  const primaryPbxIndex = normalized.findIndex((row) => row.kind === "PHONE" && row.labelPreset === "pbx");
  if (primaryPbxIndex >= 0) {
    for (let index = 0; index < normalized.length; index += 1) {
      if (normalized[index]?.kind !== "PHONE") continue;
      normalized[index].isPrimary = index === primaryPbxIndex;
    }
  }
  return normalized;
}

function normalizePersonPhones(
  input?: CompanyPersonPhoneInput[] | null,
  context?: {
    pbxById?: ReadonlyMap<string, Pick<NormalizedCompanyGeneralChannel, "id" | "value" | "countryIso2" | "countryCode" | "label">>;
    defaultPbx?: Pick<NormalizedCompanyGeneralChannel, "id" | "value" | "countryIso2" | "countryCode" | "label"> | null;
  }
): NormalizedCompanyPersonPhone[] {
  const rows: NormalizedCompanyPersonPhone[] = [];
  const source = Array.isArray(input) ? input : [];

  for (const row of source) {
    if (row.isActive === false) continue;
    const mode = toPersonPhoneMode(row.mode);
    const phoneType = mode === "EXTENSION_PBX" ? "fijo" : toPersonPhoneType(row.phoneType) ?? (row.isWhatsApp ? "whatsapp" : "movil");
    const resolvedLabel = resolveCompanyPersonPhoneLabel({
      label: row.label,
      labelPreset: mode === "EXTENSION_PBX" ? "pbx" : row.labelPreset,
      labelOther: mode === "EXTENSION_PBX" ? null : row.labelOther,
      phoneType
    });

    if (mode === "EXTENSION_PBX") {
      const extension = normalizeOptional(row.extension);
      const requestedPbxId = normalizeDraftId(row.pbxChannelId);
      const selectedPbx =
        (requestedPbxId ? context?.pbxById?.get(requestedPbxId) : null) ??
        context?.defaultPbx ??
        null;
      const pbxValue = sanitizeLocalNumber(normalizeOptional(selectedPbx?.value) ?? "") || "";
      const pbxCountryIso2 = normalizeCountryIso2Input(selectedPbx?.countryIso2) || null;
      const pbxCountryCode = normalizeCallingCodeInput(selectedPbx?.countryCode) || toCallingCodeFromIso2(pbxCountryIso2) || null;
      if (!extension && !Boolean(row.isPrimary)) continue;
      rows.push({
        mode,
        phoneType: "fijo",
        label: resolvedLabel.label,
        value: pbxValue,
        extension: extension ?? null,
        pbxChannelId: normalizeDraftId(selectedPbx?.id ?? requestedPbxId),
        countryCode: pbxCountryCode,
        countryIso2: pbxCountryIso2,
        canCall: row.canCall !== false,
        canWhatsApp: false,
        canSms: false,
        isWhatsApp: false,
        isPrimary: Boolean(row.isPrimary)
      });
      continue;
    }

    const raw = normalizeOptional(row.value);
    if (!raw) continue;
    const value = sanitizeLocalNumber(raw);
    if (!value) continue;
    const extensionAllowed = resolvedLabel.labelPreset === "pbx" || phoneType === "fijo";
    const canWhatsApp = phoneType === "whatsapp" ? true : Boolean(row.canWhatsApp);
    const canCall = phoneType === "whatsapp" ? Boolean(row.canCall) : row.canCall !== false;
    const canSms = phoneType === "whatsapp" ? false : Boolean(row.canSms);
    const countryIso2 = normalizeCountryIso2Input(row.countryCode ?? row.countryIso2) || null;
    rows.push({
      mode,
      phoneType,
      label: resolvedLabel.label,
      value,
      extension: phoneType === "whatsapp" || !extensionAllowed ? null : normalizeOptional(row.extension),
      pbxChannelId: null,
      countryCode: normalizeCallingCodeInput(row.countryCode) || toCallingCodeFromIso2(countryIso2) || null,
      countryIso2,
      canCall,
      canWhatsApp,
      canSms,
      isWhatsApp: phoneType === "whatsapp",
      isPrimary: Boolean(row.isPrimary)
    });
  }

  return ensureSinglePrimaryByType(rows, () => "PHONE");
}

function normalizePersonEmails(input?: CompanyPersonEmailInput[] | null): NormalizedCompanyPersonEmail[] {
  const rows: NormalizedCompanyPersonEmail[] = [];
  const source = Array.isArray(input) ? input : [];

  for (const row of source) {
    if (row.isActive === false) continue;
    const raw = normalizeOptional(row.value);
    if (!raw) continue;
    const value = raw.toLowerCase();
    if (!isValidEmail(value)) continue;
    const resolvedLabel = resolveCompanyPersonEmailLabel({
      label: row.label,
      labelPreset: row.labelPreset,
      labelOther: row.labelOther
    });
    rows.push({
      label: resolvedLabel.label,
      value,
      isPrimary: Boolean(row.isPrimary)
    });
  }

  return ensureSinglePrimaryByType(rows, () => "EMAIL");
}

export function ensureSinglePrimaryForPersonPhones(rows: NormalizedCompanyPersonPhone[]) {
  return ensureSinglePrimaryByType(rows, () => "PHONE");
}

export function ensureSinglePrimaryForPersonEmails(rows: NormalizedCompanyPersonEmail[]) {
  return ensureSinglePrimaryByType(rows, () => "EMAIL");
}

export function normalizeCompanyPersonContacts(
  contacts?: CompanyPersonContactInput[] | null,
  context?: { pbxChannels?: NormalizedCompanyGeneralChannel[] | null }
): NormalizedCompanyPersonContact[] {
  const source = Array.isArray(contacts) ? contacts : [];
  const rows: NormalizedCompanyPersonContact[] = [];
  const pbxChannels = getCompanyPbxChannels(context?.pbxChannels);
  const pbxById = new Map(
    pbxChannels
      .filter((row) => Boolean(row.id))
      .map((row) => [row.id as string, row] as const)
  );
  const defaultPbx = getPrimaryPbxChannel(context?.pbxChannels);
  const pbxContext = {
    pbxById,
    defaultPbx
  };

  for (const contact of source) {
    const department = resolveCompanyContactDepartment(contact);
    const jobTitle = resolveCompanyContactJobTitle(contact);
    const linkedUserId = normalizeOptional(contact.linkedUserId);
    const linkedUserName = normalizeOptional(contact.linkedUserName);
    const linkedUserEmailRaw = normalizeOptional(contact.linkedUserEmail);
    const linkedUserEmail = linkedUserEmailRaw && isValidEmail(linkedUserEmailRaw.toLowerCase()) ? linkedUserEmailRaw.toLowerCase() : null;
    const phones = normalizePersonPhones(contact.phones, pbxContext);
    const emails = normalizePersonEmails(contact.emails);
    const hasChannels = phones.length > 0 || emails.length > 0;
    if (!hasChannels && !hasAnyNonChannelData(contact)) continue;

    rows.push({
      firstName: normalizeOptional(contact.firstName) ?? "",
      lastName: normalizeOptional(contact.lastName) ?? "",
      departmentId: department.departmentId,
      departmentOther: department.departmentOther,
      jobTitleId: jobTitle.jobTitleId,
      jobTitleOther: jobTitle.jobTitleOther,
      employmentStatus: resolveCompanyEmploymentStatus(contact.employmentStatus),
      linkedUserId,
      linkedUserName,
      linkedUserEmail,
      department: department.departmentLabel ?? "",
      role: jobTitle.jobTitleLabel ?? "",
      isAreaPrimary: Boolean(contact.isAreaPrimary),
      notes: normalizeOptional(contact.notes),
      phones,
      emails
    });
  }

  return rows;
}

export function hasSinglePrimaryPerType<T>(rows: T[], getType: (row: T) => string, isPrimary: (row: T) => boolean) {
  const groupedCounts = new Map<string, { total: number; primary: number }>();
  for (const row of rows) {
    const key = getType(row);
    const bucket = groupedCounts.get(key) ?? { total: 0, primary: 0 };
    bucket.total += 1;
    bucket.primary += isPrimary(row) ? 1 : 0;
    groupedCounts.set(key, bucket);
  }

  for (const bucket of groupedCounts.values()) {
    if (bucket.total > 0 && bucket.primary !== 1) return false;
  }
  return true;
}

export function hasAtLeastOneCompanyChannel(input: {
  generalChannels?: NormalizedCompanyGeneralChannel[] | null;
  contactPeople?: NormalizedCompanyPersonContact[] | null;
}) {
  const generalCount = (input.generalChannels ?? []).length;
  const personCount = (input.contactPeople ?? []).reduce((sum, row) => sum + row.phones.length + row.emails.length, 0);
  return generalCount + personCount > 0;
}

export function validateCompanyContactPeople(
  contacts: NormalizedCompanyPersonContact[],
  context?: { generalChannels?: NormalizedCompanyGeneralChannel[] | null }
): string | null {
  const pbxChannels = getCompanyPbxChannels(context?.generalChannels);
  const pbxIdSet = new Set<string>(pbxChannels.map((row) => row.id).filter(Boolean) as string[]);
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index];
    const label = `Contacto #${index + 1}`;
    if (!contact.firstName) return `${label}: nombre requerido.`;
    if (!contact.lastName) return `${label}: apellido requerido.`;
    if (!contact.departmentId) return `${label}: área/departamento requerido.`;
    if (contact.departmentId === COMPANY_CONTACT_DEPARTMENT_OTHER_ID && !contact.departmentOther) {
      return `${label}: especifica el área/departamento.`;
    }
    if (!contact.jobTitleId) return `${label}: cargo/puesto requerido.`;
    if (contact.jobTitleId === COMPANY_CONTACT_JOB_TITLE_OTHER_ID && !contact.jobTitleOther) {
      return `${label}: especifica el cargo/puesto.`;
    }

    for (let phoneIndex = 0; phoneIndex < contact.phones.length; phoneIndex += 1) {
      const phone = contact.phones[phoneIndex];
      if (phone.mode !== "EXTENSION_PBX") continue;
      if (!phone.pbxChannelId) {
        return `${label}: teléfono #${phoneIndex + 1} requiere PBX seleccionado.`;
      }
      if (pbxIdSet.size > 0 && !pbxIdSet.has(phone.pbxChannelId)) {
        return `${label}: teléfono #${phoneIndex + 1} referencia un PBX inválido.`;
      }
      if (!phone.extension) {
        return `${label}: teléfono #${phoneIndex + 1} requiere extensión PBX.`;
      }
      if (!phone.value) {
        return `${label}: teléfono #${phoneIndex + 1} requiere PBX principal para usar extensión.`;
      }
    }

    if (!hasSinglePrimaryPerType(contact.phones, () => "PHONE", (row) => row.isPrimary)) {
      return `${label}: define un teléfono principal.`;
    }
    if (!hasSinglePrimaryPerType(contact.emails, () => "EMAIL", (row) => row.isPrimary)) {
      return `${label}: define un correo principal.`;
    }
  }
  return null;
}

export function validateCompanyGeneralChannelDrafts(
  channels?: CompanyGeneralChannelInput[] | null,
  context?: {
    contactPeople?: CompanyPersonContactInput[] | null;
    pbxCategoryOptions?: ReadonlyArray<CompanyPbxCategoryOption>;
  }
): string | null {
  const source = Array.isArray(channels) ? channels : [];
  const personIdSet = new Set(
    (Array.isArray(context?.contactPeople) ? context?.contactPeople : [])
      .map((row) => normalizeDraftId(row?.id))
      .filter(Boolean) as string[]
  );
  let phoneRowsWithValue = 0;
  let pbxRowsWithValue = 0;
  let pbxPrimaryRows = 0;
  for (let index = 0; index < source.length; index += 1) {
    const row = source[index];
    if (row?.isActive === false) continue;
    const kind = toGeneralChannelKind(row?.kind);
    const resolvedLabel = resolveCompanyGeneralChannelLabel(row ?? {}, {
      pbxCategoryOptions: context?.pbxCategoryOptions
    });
    if (kind === "PHONE") {
      const hasValue = Boolean(sanitizeLocalNumber(normalizeOptional(row?.value) ?? ""));
      if (hasValue) {
        phoneRowsWithValue += 1;
      }
      if (resolvedLabel.labelPreset === "pbx" && hasValue) {
        pbxRowsWithValue += 1;
      }
      if (resolvedLabel.labelPreset === "pbx" && row?.isPrimary) {
        pbxPrimaryRows += 1;
      }
      if (resolvedLabel.labelPreset === "pbx" && resolvedLabel.pbxAreaPreset === "otro" && !resolvedLabel.pbxAreaOther) {
        return `Canal general #${index + 1}: especifica el área PBX cuando seleccionas "Otro".`;
      }
      if (resolvedLabel.labelPreset === "pbx" && resolvedLabel.pbxAreaOther && resolvedLabel.pbxAreaOther.length > 60) {
        return `Canal general #${index + 1}: el detalle de área PBX no puede exceder 60 caracteres.`;
      }
    }
    if (resolvedLabel.labelPreset === "pbx" && kind !== "PHONE") {
      return `Canal general #${index + 1}: la etiqueta PBX solo aplica a teléfonos.`;
    }
    const ownerType = toGeneralChannelOwnerType(row?.ownerType);
    const ownerPersonId = normalizeDraftId(row?.ownerPersonId);
    if (ownerType === "PERSON") {
      if (!ownerPersonId) {
        return `Canal general #${index + 1}: selecciona la persona propietaria del canal.`;
      }
      if (personIdSet.size > 0 && !personIdSet.has(ownerPersonId)) {
        return `Canal general #${index + 1}: la persona asignada no existe o fue eliminada.`;
      }
    }
    const inputUsesPresetPayload = Boolean(row?.labelPreset || row?.labelOther);
    if (!inputUsesPresetPayload) continue;
    if (resolvedLabel.labelPreset !== "otro") continue;
    if (!resolvedLabel.labelOther) {
      return `Canal general #${index + 1}: al seleccionar etiqueta "Otro" debes especificar el detalle.`;
    }
    if (resolvedLabel.labelOther.length > 60) {
      return `Canal general #${index + 1}: la especificación de etiqueta no puede exceder 60 caracteres.`;
    }
  }
  if (phoneRowsWithValue > 0 && (pbxRowsWithValue === 0 || pbxPrimaryRows !== 1)) {
    return "PBX de la empresa: debe existir un único PBX por defecto.";
  }
  return null;
}

export function validateCompanyContactPeopleDrafts(
  contacts?: CompanyPersonContactInput[] | null,
  context?: { generalChannels?: CompanyGeneralChannelInput[] | null }
): string | null {
  const source = Array.isArray(contacts) ? contacts : [];
  const pbxSummary = summarizeCompanyPbxDraft(context?.generalChannels);
  const pbxRowsById = pbxSummary.pbxRowsMap;
  const hasDefinedPbxValue = Boolean(pbxSummary.pbxValue);
  for (let personIndex = 0; personIndex < source.length; personIndex += 1) {
    const contact = source[personIndex];
    const personLabel = `Contacto #${personIndex + 1}`;
    const hasPersonData = Boolean(
      normalizeOptional(contact?.firstName) ||
        normalizeOptional(contact?.lastName) ||
        normalizeOptional(contact?.departmentId) ||
        normalizeOptional(contact?.jobTitleId) ||
        normalizeOptional(contact?.notes) ||
        normalizeOptional(contact?.linkedUserId)
    );
    if (hasPersonData) {
      if (!normalizeOptional(contact?.firstName)) return `${personLabel}: nombre requerido.`;
      if (!normalizeOptional(contact?.lastName)) return `${personLabel}: apellido requerido.`;
      const resolvedDepartment = resolveCompanyContactDepartment(contact ?? {});
      if (!resolvedDepartment.departmentId) return `${personLabel}: área/departamento requerido.`;
      if (resolvedDepartment.departmentId === COMPANY_CONTACT_DEPARTMENT_OTHER_ID && !resolvedDepartment.departmentOther) {
        return `${personLabel}: especifica el área/departamento (Otro).`;
      }
      const resolvedJobTitle = resolveCompanyContactJobTitle(contact ?? {});
      if (!resolvedJobTitle.jobTitleId) return `${personLabel}: cargo/puesto requerido.`;
      if (resolvedJobTitle.jobTitleId === COMPANY_CONTACT_JOB_TITLE_OTHER_ID && !resolvedJobTitle.jobTitleOther) {
        return `${personLabel}: especifica el cargo/puesto (Otro).`;
      }
    }

    const phones = Array.isArray(contact?.phones) ? contact.phones : [];
    for (let phoneIndex = 0; phoneIndex < phones.length; phoneIndex += 1) {
      const phone = phones[phoneIndex];
      if (phone?.isActive === false) continue;
      const mode = toPersonPhoneMode(phone?.mode);
      if (mode === "EXTENSION_PBX") {
        if (!normalizeOptional(phone?.extension)) {
          return `${personLabel}: teléfono #${phoneIndex + 1} requiere extensión PBX.`;
        }
        const pbxChannelId = normalizeDraftId(phone?.pbxChannelId);
        if (!pbxChannelId) {
          return `${personLabel}: teléfono #${phoneIndex + 1} requiere seleccionar PBX.`;
        }
        const referencedPbx = pbxRowsById.get(pbxChannelId) ?? null;
        if (!referencedPbx) {
          return `${personLabel}: teléfono #${phoneIndex + 1} referencia un PBX inexistente.`;
        }
        if (!hasDefinedPbxValue) {
          return `${personLabel}: define PBX principal para usar extensiones.`;
        }
        if (!referencedPbx.hasValue) {
          return `${personLabel}: teléfono #${phoneIndex + 1} requiere que el PBX seleccionado tenga número.`;
        }
      }
      const usesPresetPayload = Boolean(phone?.labelPreset || phone?.labelOther);
      if (!usesPresetPayload) continue;
      const resolvedLabel = resolveCompanyPersonPhoneLabel(phone);
      if (resolvedLabel.labelPreset !== "otro") continue;
      if (!resolvedLabel.labelOther) {
        return `${personLabel}: teléfono #${phoneIndex + 1} requiere detalle cuando etiqueta es "Otro".`;
      }
      if (resolvedLabel.labelOther.length > 60) {
        return `${personLabel}: teléfono #${phoneIndex + 1} no puede exceder 60 caracteres en etiqueta "Otro".`;
      }
    }

    const emails = Array.isArray(contact?.emails) ? contact.emails : [];
    for (let emailIndex = 0; emailIndex < emails.length; emailIndex += 1) {
      const email = emails[emailIndex];
      if (email?.isActive === false) continue;
      const usesPresetPayload = Boolean(email?.labelPreset || email?.labelOther);
      if (!usesPresetPayload) continue;
      const resolvedLabel = resolveCompanyPersonEmailLabel(email);
      if (resolvedLabel.labelPreset !== "otro") continue;
      if (!resolvedLabel.labelOther) {
        return `${personLabel}: correo #${emailIndex + 1} requiere detalle cuando etiqueta es "Otro".`;
      }
      if (resolvedLabel.labelOther.length > 60) {
        return `${personLabel}: correo #${emailIndex + 1} no puede exceder 60 caracteres en etiqueta "Otro".`;
      }
    }
  }
  return null;
}

export function validateCompanyGeneralChannels(channels: NormalizedCompanyGeneralChannel[]): string | null {
  for (let index = 0; index < channels.length; index += 1) {
    const row = channels[index];
    if (row?.ownerType === "PERSON" && !row.ownerPersonId) {
      return `Canal general #${index + 1}: la asignación a persona requiere seleccionar propietario.`;
    }
  }
  if (!hasSinglePrimaryPerType(channels, (row) => row.kind, (row) => row.isPrimary)) {
    return "Canales generales: define un principal por tipo (teléfono/email/whatsapp).";
  }
  return null;
}

export function isOtherCatalogName(value?: string | null) {
  const token = normalizeToken(value);
  if (!token) return false;
  if (OTHER_TOKENS.has(token)) return true;
  return token.includes("OTRO") || token.includes("OTHER");
}

export function validateEconomicActivityOtherNote(input: {
  activityId?: string | null;
  activityName?: string | null;
  otherNote?: string | null;
}) {
  const requiresNote =
    requiresEconomicActivityOtherNote(input.activityId) ||
    (!input.activityId && isOtherCatalogName(input.activityName));
  const note = normalizeOptional(input.otherNote);
  if (!requiresNote) return { ok: true as const, normalizedNote: null as string | null, requiresNote };
  if (!note) {
    return { ok: false as const, error: "Actividad económica: al seleccionar 'Otro' debes agregar una nota." };
  }
  if (note.length > 150) {
    return { ok: false as const, error: "Actividad económica: la nota no puede exceder 150 caracteres." };
  }
  return { ok: true as const, normalizedNote: note, requiresNote };
}

export { ECONOMIC_ACTIVITY_OTHER_ID };

export function inferPhoneCategoryFromLabel(label?: string | null, kind?: CompanyGeneralChannelKind): ClientPhoneCategory {
  const token = normalizeToken(label);
  if (kind === "WHATSAPP") return ClientPhoneCategory.WHATSAPP;
  if (token.includes("FACTUR")) return ClientPhoneCategory.BILLING;
  if (token.includes("RRHH") || token.includes("RECURSOS_HUMANOS") || token.includes("HUMAN")) return ClientPhoneCategory.HR;
  if (token.includes("CENTRAL") || token.includes("RECEPCION") || token.includes("OFICINA")) return ClientPhoneCategory.OFFICE;
  return ClientPhoneCategory.WORK;
}

export function inferEmailCategoryFromLabel(label?: string | null): ClientEmailCategory {
  const token = normalizeToken(label);
  if (token.includes("FACTUR")) return ClientEmailCategory.BILLING;
  if (token.includes("RRHH") || token.includes("RECURSOS_HUMANOS") || token.includes("HUMAN")) return ClientEmailCategory.HR;
  if (token.includes("LEGAL") || token.includes("JURID")) return ClientEmailCategory.LEGAL;
  if (token.includes("COMPRAS") || token.includes("ADQUISIC")) return ClientEmailCategory.PURCHASING;
  if (token.includes("SOPORTE") || token.includes("HELPDESK")) return ClientEmailCategory.SUPPORT;
  if (token.includes("IT") || token.includes("TI") || token.includes("SISTEMAS")) return ClientEmailCategory.IT;
  return ClientEmailCategory.WORK;
}
