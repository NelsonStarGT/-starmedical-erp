import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import { sanitizeLocalNumber } from "@/lib/clients/phoneValidation";
import { INSTITUTIONAL_REGIMES } from "@/lib/catalogs/institutionalRegimes";
import { INSTITUTION_TYPES } from "@/lib/catalogs/institutionTypes";
import { INSURER_LINE_FALLBACK } from "@/lib/catalogs/insurerLines";
import { INSURER_SCOPES, INSURER_TYPES } from "@/lib/catalogs/insurerTypes";
import { prisma } from "@/lib/prisma";
import { normalizeTenantId } from "@/lib/tenant";
import { isValidEmail } from "@/lib/utils";

export type DirectoryOption = {
  id: string;
  label: string;
  isActive?: boolean;
};

export type PublicRegistrationFormOptions = {
  institutionTypeOptions: DirectoryOption[];
  institutionRegimeOptions: DirectoryOption[];
  insurerTypeOptions: DirectoryOption[];
  insurerScopeOptions: DirectoryOption[];
  insurerLineOptions: DirectoryOption[];
};

type SelfRegistrationClientType = "PERSON" | "COMPANY" | "INSTITUTION" | "INSURER";

export type PersonSelfRegistrationPayload = {
  clientType: "PERSON";
  firstName: string;
  lastName: string;
  idValue: string;
  phone: string;
  email: string | null;
  address: string;
  country: string;
  department: string;
  city: string;
};

export type CompanySelfRegistrationPayload = {
  clientType: "COMPANY";
  nit: string;
  legalName: string;
  tradeName: string;
  contactName: string | null;
  phone: string;
  email: string | null;
  address: string;
  country: string;
  department: string;
  city: string;
};

export type InstitutionSelfRegistrationPayload = {
  clientType: "INSTITUTION";
  nit: string | null;
  legalName: string;
  publicName: string;
  institutionTypeId: string;
  institutionRegimeId: string | null;
  phone: string;
  email: string | null;
  address: string;
  country: string;
  department: string;
  city: string;
};

export type InsurerSelfRegistrationPayload = {
  clientType: "INSURER";
  nit: string;
  legalName: string;
  tradeName: string | null;
  insurerTypeId: string;
  insurerScope: "local" | "regional" | "internacional" | null;
  insurerLinePrimaryCode: string;
  phone: string;
  email: string | null;
  address: string;
  country: string;
  department: string;
  city: string;
};

export type ClientSelfRegistrationPayload =
  | PersonSelfRegistrationPayload
  | CompanySelfRegistrationPayload
  | InstitutionSelfRegistrationPayload
  | InsurerSelfRegistrationPayload;

function asRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Formulario inválido.");
  }
  return input as Record<string, unknown>;
}

function normalizeText(value: unknown, label: string, options?: { required?: boolean; max?: number }) {
  const required = options?.required !== false;
  const max = options?.max ?? 180;
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    if (!required) return null;
    throw new Error(`${label} requerido.`);
  }
  if (normalized.length > max) {
    throw new Error(`${label} excede ${max} caracteres.`);
  }
  return normalized;
}

function normalizeEmail(value: unknown, label: string, options?: { required?: boolean }) {
  const required = Boolean(options?.required);
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    if (required) throw new Error(`${label} requerido.`);
    return null;
  }
  if (!isValidEmail(normalized)) {
    throw new Error(`${label} inválido.`);
  }
  return normalized;
}

function normalizePhone(value: unknown, label: string, options?: { required?: boolean }) {
  const required = options?.required !== false;
  const digits = sanitizeLocalNumber(String(value ?? ""));
  if (!digits) {
    if (!required) return null;
    throw new Error(`${label} requerido.`);
  }
  if (digits.length < 8 || digits.length > 18) {
    throw new Error(`${label} inválido.`);
  }
  return digits;
}

function normalizeClientType(value: unknown): SelfRegistrationClientType {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "PERSON") return "PERSON";
  if (normalized === "COMPANY") return "COMPANY";
  if (normalized === "INSTITUTION") return "INSTITUTION";
  if (normalized === "INSURER") return "INSURER";
  throw new Error("Tipo de cliente inválido.");
}

function normalizeInsurerScope(value: unknown): "local" | "regional" | "internacional" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "local" || normalized === "regional" || normalized === "internacional") {
    return normalized;
  }
  throw new Error("Alcance de aseguradora inválido.");
}

export function validateClientSelfRegistrationPayload(input: {
  clientType: ClientProfileType | string;
  payload: unknown;
}): ClientSelfRegistrationPayload {
  const clientType = normalizeClientType(input.clientType);
  const payload = asRecord(input.payload);

  if (clientType === "PERSON") {
    return {
      clientType,
      firstName: normalizeText(payload.firstName, "Nombre", { max: 90 }) as string,
      lastName: normalizeText(payload.lastName, "Apellido", { max: 90 }) as string,
      idValue: normalizeText(payload.idValue, "Documento de identidad", { max: 40 }) as string,
      phone: normalizePhone(payload.phone, "Teléfono") as string,
      email: normalizeEmail(payload.email, "Correo"),
      address: normalizeText(payload.address, "Dirección", { max: 240 }) as string,
      country: normalizeText(payload.country, "País", { max: 80 }) as string,
      department: normalizeText(payload.department, "Departamento", { max: 80 }) as string,
      city: normalizeText(payload.city, "Municipio", { max: 80 }) as string
    };
  }

  if (clientType === "COMPANY") {
    return {
      clientType,
      nit: normalizeText(payload.nit, "NIT", { max: 40 }) as string,
      legalName: normalizeText(payload.legalName, "Razón social", { max: 140 }) as string,
      tradeName: normalizeText(payload.tradeName, "Nombre comercial", { max: 140 }) as string,
      contactName: normalizeText(payload.contactName, "Persona de contacto", { required: false, max: 120 }),
      phone: normalizePhone(payload.phone, "Teléfono") as string,
      email: normalizeEmail(payload.email, "Correo"),
      address: normalizeText(payload.address, "Dirección", { max: 240 }) as string,
      country: normalizeText(payload.country, "País", { max: 80 }) as string,
      department: normalizeText(payload.department, "Departamento", { max: 80 }) as string,
      city: normalizeText(payload.city, "Municipio", { max: 80 }) as string
    };
  }

  if (clientType === "INSTITUTION") {
    return {
      clientType,
      nit: normalizeText(payload.nit, "NIT", { required: false, max: 40 }),
      legalName: normalizeText(payload.legalName, "Nombre legal", { max: 140 }) as string,
      publicName: normalizeText(payload.publicName, "Nombre público", { max: 140 }) as string,
      institutionTypeId: normalizeText(payload.institutionTypeId, "Tipo de institución", { max: 120 }) as string,
      institutionRegimeId: normalizeText(payload.institutionRegimeId, "Régimen institucional", { required: false, max: 120 }),
      phone: normalizePhone(payload.phone, "Teléfono") as string,
      email: normalizeEmail(payload.email, "Correo"),
      address: normalizeText(payload.address, "Dirección", { max: 240 }) as string,
      country: normalizeText(payload.country, "País", { max: 80 }) as string,
      department: normalizeText(payload.department, "Departamento", { max: 80 }) as string,
      city: normalizeText(payload.city, "Municipio", { max: 80 }) as string
    };
  }

  return {
    clientType,
    nit: normalizeText(payload.nit, "NIT", { max: 40 }) as string,
    legalName: normalizeText(payload.legalName, "Nombre legal", { max: 140 }) as string,
    tradeName: normalizeText(payload.tradeName, "Nombre comercial", { required: false, max: 140 }),
    insurerTypeId: normalizeText(payload.insurerTypeId, "Tipo de aseguradora", { max: 120 }) as string,
    insurerScope: normalizeInsurerScope(payload.insurerScope),
    insurerLinePrimaryCode: normalizeText(payload.insurerLinePrimaryCode, "Ramo principal", { max: 120 }) as string,
    phone: normalizePhone(payload.phone, "Teléfono") as string,
    email: normalizeEmail(payload.email, "Correo"),
    address: normalizeText(payload.address, "Dirección", { max: 240 }) as string,
    country: normalizeText(payload.country, "País", { max: 80 }) as string,
    department: normalizeText(payload.department, "Departamento", { max: 80 }) as string,
    city: normalizeText(payload.city, "Municipio", { max: 80 }) as string
  };
}

export function summarizeClientSelfRegistrationPayload(payload: ClientSelfRegistrationPayload) {
  if (payload.clientType === "PERSON") {
    return {
      displayName: `${payload.firstName} ${payload.lastName}`.trim(),
      documentRef: payload.idValue,
      email: payload.email,
      phone: payload.phone
    };
  }

  if (payload.clientType === "COMPANY") {
    return {
      displayName: payload.legalName,
      documentRef: payload.nit,
      email: payload.email,
      phone: payload.phone
    };
  }

  if (payload.clientType === "INSTITUTION") {
    return {
      displayName: payload.publicName || payload.legalName,
      documentRef: payload.nit,
      email: payload.email,
      phone: payload.phone
    };
  }

  return {
    displayName: payload.tradeName || payload.legalName,
    documentRef: payload.nit,
    email: payload.email,
    phone: payload.phone
  };
}

export function getSelfRegistrationIdentityHints(payload: ClientSelfRegistrationPayload) {
  if (payload.clientType === "PERSON") {
    const idValue = payload.idValue.trim();
    return {
      idValue,
      nit: idValue,
      dpi: idValue,
      email: payload.email,
      phone: payload.phone
    };
  }

  const nit = payload.nit ?? null;
  return {
    idValue: nit,
    nit,
    dpi: null,
    email: payload.email,
    phone: payload.phone
  };
}

function mapInstitutionFallbackOptions() {
  return INSTITUTION_TYPES.map((item) => ({ id: item.id, label: item.label, isActive: true }));
}

function mapInstitutionRegimeFallbackOptions() {
  return INSTITUTIONAL_REGIMES.map((item) => ({ id: item.id, label: item.label, isActive: true }));
}

export async function getClientSelfRegistrationFormOptions(tenantIdInput: unknown): Promise<PublicRegistrationFormOptions> {
  const tenantId = normalizeTenantId(tenantIdInput);

  const [institutionTypesDb, institutionRegimesDb, directories] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      where: {
        type: ClientCatalogType.INSTITUTION_TYPE,
        isActive: true
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: {
        type: ClientCatalogType.INSTITUTION_CATEGORY,
        isActive: true
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true }
    }),
    getClientContactDirectories(tenantId, { includeInactive: false })
  ]);

  const institutionTypeOptions = institutionTypesDb.length
    ? institutionTypesDb.map((item) => ({ id: item.id, label: item.name, isActive: item.isActive }))
    : mapInstitutionFallbackOptions();

  const institutionRegimeOptions = institutionRegimesDb.length
    ? institutionRegimesDb.map((item) => ({ id: item.id, label: item.name, isActive: item.isActive }))
    : mapInstitutionRegimeFallbackOptions();

  const insurerLineOptions = directories.insurerLines.length
    ? directories.insurerLines.filter((item) => item.isActive).map((item) => ({ id: item.code, label: item.name, isActive: true }))
    : INSURER_LINE_FALLBACK.map((item) => ({ id: item.id, label: item.label, isActive: true }));

  return {
    institutionTypeOptions,
    institutionRegimeOptions,
    insurerTypeOptions: INSURER_TYPES.map((item) => ({ id: item.id, label: item.label, isActive: true })),
    insurerScopeOptions: INSURER_SCOPES.map((item) => ({ id: item.id, label: item.label, isActive: true })),
    insurerLineOptions
  };
}
