"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ClientAffiliationPayerType,
  ClientAffiliationStatus,
  ClientCatalogType,
  CompanyContactChannel,
  CompanyContactRole,
  CompanyKind,
  CompanyStatus,
  ClientEmailCategory,
  ClientDocumentApprovalStatus,
  ClientLocationType,
  ClientPhoneCategory,
  InsurerBillingCutoffMode,
  InsurerBillingType,
  Prisma,
  ClientProfileType,
  PatientSex
} from "@prisma/client";
import type { ClientContactRelationType, ClientNoteType, ClientNoteVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { getSessionUserFromCookies, type SessionUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { canApproveDocsFromRoles, canEditClientProfileFromRoles, canEditDocsFromRoles } from "@/lib/clients/permissions";
import { warnDevMissingRequiredDocsDelegate } from "@/lib/clients/requiredDocuments";
import { isRulesConfigWeightsUnavailableError, warnDevRulesConfigWeightsUnavailable } from "@/lib/clients/rulesConfig";
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  validateAcquisitionConditionalFields
} from "@/lib/clients/acquisition";
import {
  buildIdentityDocumentOptionsByCountry,
  isFallbackDocumentTypeId,
  isSensitiveIdentityDocument,
  validateIdentityDocumentValue,
  type IdentityDocumentOption
} from "@/lib/clients/identityDocuments";
import { isValidEmail } from "@/lib/utils";
import { dpiSchema } from "@/lib/validation/identity";
import { logClientAudit, logClientAuditTx } from "@/lib/clients/audit.service";
import { resolveClientBloodType } from "@/lib/clients/bloodType";
import { buildBirthPlaceLabel, buildPersonLocationDrafts } from "@/lib/clients/personLocation";
import { parseOptionalBirthDate } from "@/lib/clients/personValidation";
import { normalizeClientsDateFormat } from "@/lib/clients/dateFormat";
import { updateTenantClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { updateOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { getCallingCodeOptions } from "@/lib/clients/callingCodeOptions.server";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import {
  normalizeContactDirectoryCode,
  resolveMissingDepartmentDefaults,
  resolveMissingInsurerLineDefaults,
  resolveMissingJobTitleDefaults,
  resolveMissingPbxCategoryDefaults,
  resolveUniqueContactDirectoryCode
} from "@/lib/clients/contactDirectories";
import {
  canDeprecateClientsConfigEntry,
  CLIENTS_CONFIG_DEPRECATED_COOKIE,
  CLIENTS_CONFIG_REGISTRY,
  parseClientsConfigDeprecatedCookie,
  serializeClientsConfigDeprecatedCookie
} from "@/lib/clients/clientsConfigRegistry";
import { COMPANY_CONTACT_DEPARTMENTS } from "@/lib/catalogs/departments";
import { COMPANY_CONTACT_JOB_TITLES } from "@/lib/catalogs/jobTitles";
import { COMPANY_PBX_CATEGORY_SEED } from "@/lib/catalogs/pbxCategories";
import { INSURER_LINE_SEED, normalizeInsurerLineSelection } from "@/lib/catalogs/insurerLines";
import { getClientCatalogDefaultsByType } from "@/lib/catalogs/clientCatalogDefaults";
import {
  assertStrictLocalPhoneValue,
  buildE164,
  normalizeCallingCode,
  sanitizeLocalNumber
} from "@/lib/clients/phoneValidation";
import {
  collectLegacyPbxExtensions,
  hasAtLeastOneCompanyChannel,
  inferEmailCategoryFromLabel,
  inferPhoneCategoryFromLabel,
  normalizeCompanyGeneralChannels,
  normalizeCompanyPersonContacts,
  validateCompanyContactPeopleDrafts,
  validateCompanyGeneralChannelDrafts,
  validateCompanyContactPeople,
  validateCompanyGeneralChannels,
  validateEconomicActivityOtherNote,
  type CompanyGeneralChannelInput,
  type CompanyPersonContactInput,
  type NormalizedCompanyGeneralChannel,
  type NormalizedCompanyPersonContact
} from "@/lib/clients/companyProfile";
import {
  normalizeCompanyBranchDrafts,
  normalizeCompanyWebsite,
  validateCompanyBranchDraft,
  validateCompanyLogoAsset,
  type CompanyBranchDraftInput
} from "@/lib/clients/companyCreate";
import {
  ECONOMIC_ACTIVITY_BY_ID,
  ECONOMIC_ACTIVITY_OTHER_ID,
  isEconomicActivityId,
  resolveEconomicActivitySelection
} from "@/lib/catalogs/economicActivities";
import { isCompanyEmployeeRangeId } from "@/lib/catalogs/companyEmployeeRanges";
import { isCompanyLegalFormId, requiresCompanyLegalFormOther } from "@/lib/catalogs/legalForms";
import { resolveCurrencyPreferenceSelection } from "@/lib/catalogs/currencies";
import { reserveNextClientCodeTx } from "@/lib/clients/clientCode";
import { tenantIdFromUser } from "@/lib/tenant";
import { resolveReceptionRole } from "@/lib/reception/rbac";

const CLIENT_PHOTO_MAX_SIZE_BYTES = 3 * 1024 * 1024;
const CLIENT_PHOTO_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const CLIENT_ACQUISITION_SOURCE_DEFAULTS = [
  { name: "Llegada a instalaciones", code: "WALK_IN", category: "DIRECT", sortOrder: 10 },
  { name: "WhatsApp", code: "WHATSAPP", category: "DIGITAL", sortOrder: 20 },
  { name: "Redes sociales", code: "SOCIAL_MEDIA", category: "DIGITAL", sortOrder: 30 },
  { name: "Google Maps", code: "GOOGLE_MAPS", category: "DIGITAL", sortOrder: 40 },
  { name: "Referido", code: "REFERRED", category: "REFERRAL", sortOrder: 50 },
  { name: "Empresa", code: "COMPANY", category: "B2B", sortOrder: 60 },
  { name: "Otro", code: "OTHER", category: "OTHER", sortOrder: 70 }
] as const;
const CLIENT_ACQUISITION_SOCIAL_DETAILS_DEFAULTS = [
  { code: "FACEBOOK", name: "Facebook" },
  { code: "INSTAGRAM", name: "Instagram" },
  { code: "TIKTOK", name: "TikTok" },
  { code: "LINKEDIN", name: "LinkedIn" },
  { code: "X", name: "X" },
  { code: "YOUTUBE", name: "YouTube" },
  { code: "OTHER_NETWORK", name: "Otra red" }
] as const;

async function requireAuthenticatedUser(): Promise<SessionUser> {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) throw new Error("No autenticado.");
  return user;
}

async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!isAdmin(user)) throw new Error("No autorizado.");
  return user;
}

async function requireClientCreatorUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (isAdmin(user)) return user;

  const receptionRole = resolveReceptionRole(user.roles ?? []);
  if (receptionRole === "RECEPTION_SUPERVISOR" || receptionRole === "RECEPTION_ADMIN") {
    return user;
  }

  throw new Error("No autorizado para crear clientes.");
}

async function requireProfileEditorUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!canEditClientProfileFromRoles(user.roles)) {
    throw new Error("No autorizado para editar perfil del cliente.");
  }
  return user;
}

async function requireDocumentEditorUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!canEditDocsFromRoles(user.roles)) {
    throw new Error("No autorizado para editar documentos.");
  }
  return user;
}

async function requireDocumentApproverUser(): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!canApproveDocsFromRoles(user.roles)) {
    throw new Error("No autorizado para aprobar documentos.");
  }
  return user;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type GeoDivisionDataSourceLiteral = "official" | "operational";

// Evita romper typecheck si el Prisma Client se desfasó respecto al schema.
const GEO_DIVISION_DATA_SOURCE = {
  official: "official",
  operational: "operational"
} as const satisfies Record<GeoDivisionDataSourceLiteral, GeoDivisionDataSourceLiteral>;

function normalizeRequired(value: string | undefined | null, message: string) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(message);
  return trimmed;
}

function normalizeSourceToken(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeDirectorySortOrder(value?: number | null) {
  const raw = Number.isFinite(value) ? Number(value) : 100;
  return Math.min(9999, Math.max(0, Math.floor(raw)));
}

type ClientContactDirectoryDepartmentDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; tenantId: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }>>;
  findUnique: (args: unknown) => Promise<{ id: string; tenantId: string; isActive: boolean; name: string; code: string; description: string | null; sortOrder: number } | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

type ClientContactDirectoryJobTitleDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; tenantId: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }>>;
  findUnique: (args: unknown) => Promise<{ id: string; tenantId: string; isActive: boolean; name: string; code: string; description: string | null; sortOrder: number } | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

type ClientPbxCategoryDirectoryDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; tenantId: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }>>;
  findUnique: (args: unknown) => Promise<{ id: string; tenantId: string; isActive: boolean; name: string; code: string; description: string | null; sortOrder: number } | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

type ClientInsurerLineDirectoryDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; tenantId: string; code: string; name: string; description: string | null; sortOrder: number; isActive: boolean }>>;
  findUnique: (args: unknown) => Promise<{ id: string; tenantId: string; isActive: boolean; name: string; code: string; description: string | null; sortOrder: number } | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

type ClientContactDirectoryCorrelationDelegate = {
  findMany: (args: unknown) => Promise<Array<{ id: string; jobTitleId: string; isActive: boolean }>>;
  upsert: (args: unknown) => Promise<{ id: string }>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

function getClientContactDirectoryDepartmentDelegateOrThrow() {
  const delegate = (prisma as unknown as {
    clientContactDepartmentDirectory?: Partial<ClientContactDirectoryDepartmentDelegate>;
  }).clientContactDepartmentDirectory;

  if (!delegate?.findMany || !delegate.findUnique || !delegate.create || !delegate.update) {
    throw new Error("Directorios de contacto no disponibles. Ejecuta migraciones pendientes.");
  }

  return delegate as ClientContactDirectoryDepartmentDelegate;
}

function getClientContactDirectoryJobTitleDelegateOrThrow() {
  const delegate = (prisma as unknown as {
    clientContactJobTitleDirectory?: Partial<ClientContactDirectoryJobTitleDelegate>;
  }).clientContactJobTitleDirectory;

  if (!delegate?.findMany || !delegate.findUnique || !delegate.create || !delegate.update) {
    throw new Error("Directorios de contacto no disponibles. Ejecuta migraciones pendientes.");
  }

  return delegate as ClientContactDirectoryJobTitleDelegate;
}

function getClientPbxCategoryDirectoryDelegateOrThrow() {
  const delegate = (prisma as unknown as {
    clientPbxCategoryDirectory?: Partial<ClientPbxCategoryDirectoryDelegate>;
  }).clientPbxCategoryDirectory;

  if (!delegate?.findMany || !delegate.findUnique || !delegate.create || !delegate.update) {
    throw new Error("Categorías PBX no disponibles. Ejecuta migraciones pendientes.");
  }

  return delegate as ClientPbxCategoryDirectoryDelegate;
}

function getClientInsurerLineDirectoryDelegateOrThrow() {
  const delegate = (prisma as unknown as {
    clientInsurerLineDirectory?: Partial<ClientInsurerLineDirectoryDelegate>;
  }).clientInsurerLineDirectory;

  if (!delegate?.findMany || !delegate.findUnique || !delegate.create || !delegate.update) {
    throw new Error("Ramos de seguro no disponibles. Ejecuta migraciones pendientes.");
  }

  return delegate as ClientInsurerLineDirectoryDelegate;
}

function getClientContactDirectoryCorrelationDelegateOrThrow() {
  const delegate = (prisma as unknown as {
    clientContactDepartmentJobTitle?: Partial<ClientContactDirectoryCorrelationDelegate>;
  }).clientContactDepartmentJobTitle;

  if (!delegate?.findMany || !delegate.upsert || !delegate.updateMany) {
    throw new Error("Matriz Área↔Cargo no disponible. Ejecuta migraciones pendientes.");
  }

  return delegate as ClientContactDirectoryCorrelationDelegate;
}

function parseOptionalDate(value?: string | null) {
  const normalized = normalizeOptional(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida.");
  }
  return parsed;
}

function calculateAgeYears(birthDate: Date, reference = new Date()) {
  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  const dayDiff = reference.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

function isMinorClient(birthDate: Date | null) {
  if (!birthDate) return false;
  return calculateAgeYears(birthDate) < 18;
}

function normalizeIdentifierValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizePhoneValue(value: string) {
  return sanitizeLocalNumber(value);
}

function normalizePhoneE164(value: string) {
  const raw = value.trim();
  if (!raw.startsWith("+")) return null;
  const digits = sanitizeLocalNumber(raw);
  return digits ? `+${digits}` : null;
}

type IdentityDocumentCatalogRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

async function resolveCountryIso2ById(
  tx: Prisma.TransactionClient | typeof prisma,
  countryId?: string | null
) {
  const normalizedCountryId = normalizeOptional(countryId);
  if (!normalizedCountryId) return null;
  const country = await tx.geoCountry.findUnique({
    where: { id: normalizedCountryId },
    select: { iso2: true }
  });
  return country?.iso2 ?? null;
}

async function listActiveIdentityDocumentOptions(
  tx: Prisma.TransactionClient | typeof prisma,
  countryIso2?: string | null
) {
  const rows: IdentityDocumentCatalogRow[] = await tx.clientCatalogItem.findMany({
    where: {
      type: ClientCatalogType.DOCUMENT_TYPE,
      isActive: true
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true
    }
  });

  return buildIdentityDocumentOptionsByCountry(rows, countryIso2);
}

function normalizeIdentityDocumentSelection(input: {
  options: IdentityDocumentOption[];
  identityDocumentTypeId?: string | null;
}) {
  const selectedId = normalizeOptional(input.identityDocumentTypeId);
  if (!selectedId) {
    return input.options.find((item) => !item.optional) ?? input.options[0] ?? null;
  }
  return input.options.find((item) => item.id === selectedId) ?? null;
}

type AcquisitionResolutionResult = {
  sourceId: string | null;
  detailOptionId: string | null;
  otherNote: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  requiresReferral: boolean;
};

async function resolveDocumentTypeByHints(
  tx: Prisma.TransactionClient,
  preferredTokens: string[]
): Promise<string | null> {
  const docs = await tx.clientCatalogItem.findMany({
    where: { type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
    select: { id: true, name: true }
  });
  if (!docs.length) return null;

  const byToken = docs.map((item) => ({
    id: item.id,
    token: normalizeSourceToken(item.name)
  }));

  for (const preferred of preferredTokens) {
    const token = normalizeSourceToken(preferred);
    const exact = byToken.find((item) => item.token === token);
    if (exact) return exact.id;
  }

  for (const preferred of preferredTokens) {
    const token = normalizeSourceToken(preferred);
    const fuzzy = byToken.find((item) => item.token.includes(token) || token.includes(item.token));
    if (fuzzy) return fuzzy.id;
  }

  return docs[0]?.id ?? null;
}

async function resolveCountryIdByName(tx: Prisma.TransactionClient, countryName: string | null) {
  if (!countryName) return null;
  const row = await tx.geoCountry.findFirst({
    where: { name: { equals: countryName, mode: "insensitive" } },
    select: { id: true }
  });
  return row?.id ?? null;
}

async function createPrimaryClientIdentifier(tx: Prisma.TransactionClient, input: {
  clientId: string;
  value: string | null;
  countryId?: string | null;
  preferredDocumentTypeTokens?: string[];
  documentTypeId?: string | null;
}) {
  const raw = normalizeOptional(input.value);
  if (!raw) return;
  const valueNormalized = normalizeIdentifierValue(raw);
  if (!valueNormalized) return;

  const documentTypeId =
    normalizeOptional(input.documentTypeId) ??
    (input.preferredDocumentTypeTokens?.length
      ? await resolveDocumentTypeByHints(tx, input.preferredDocumentTypeTokens)
      : null);
  await tx.clientIdentifier.create({
    data: {
      clientId: input.clientId,
      countryId: input.countryId ?? null,
      documentTypeId,
      value: raw,
      valueNormalized,
      isPrimary: true,
      isActive: true
    }
  });
}

async function createPrimaryClientPhone(tx: Prisma.TransactionClient, input: {
  clientId: string;
  phone: string | null;
  countryIso2?: string | null;
}) {
  const raw = normalizeOptional(input.phone);
  if (!raw) return;
  const number = normalizePhoneValue(raw);
  if (!number) return;

  const countryCode = normalizeSourceToken(input.countryIso2 ?? "").slice(0, 2) || "XX";
  const explicitE164 = normalizePhoneE164(raw);
  let e164 = explicitE164;
  if (!e164 && countryCode !== "XX") {
    const codeRow = await tx.phoneCountryCode.findFirst({
      where: {
        iso2: countryCode,
        isActive: true
      },
      select: { dialCode: true }
    });
    e164 = buildE164(codeRow?.dialCode ?? null, number);
  }

  await tx.clientPhone.create({
    data: {
      clientId: input.clientId,
      countryCode,
      number,
      e164,
      isPrimary: true,
      isActive: true
    }
  });
}

type ClientPhoneChannelInput = {
  category?: ClientPhoneCategory | string | null;
  relationType?: ClientPhoneRelationType | string | null;
  value?: string | null;
  countryIso2?: string | null;
  canCall?: boolean | null;
  canWhatsapp?: boolean | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

type ClientEmailChannelInput = {
  category?: ClientEmailCategory | string | null;
  value?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

type NormalizedClientPhoneChannel = {
  category: ClientPhoneCategory;
  relationType: ClientPhoneRelationType;
  number: string;
  countryCode: string;
  e164: string | null;
  canCall: boolean;
  canWhatsapp: boolean;
  isPrimary: boolean;
  isActive: boolean;
};

type NormalizedClientEmailChannel = {
  category: ClientEmailCategory;
  valueRaw: string;
  valueNormalized: string;
  isPrimary: boolean;
  isActive: boolean;
};

type ClientPhoneRelationType = "TITULAR" | "CONYUGE" | "HIJO_A" | "MADRE" | "PADRE" | "ENCARGADO" | "OTRO";
type ClientServiceSegment = "PARTICULAR" | "COMPANY" | "INSTITUTION" | "INSURER";

const CLIENT_PHONE_CATEGORIES = new Set(Object.values(ClientPhoneCategory));
const CLIENT_EMAIL_CATEGORIES = new Set(Object.values(ClientEmailCategory));

const CLIENT_PHONE_RELATION_FALLBACK = [
  "TITULAR",
  "CONYUGE",
  "HIJO_A",
  "MADRE",
  "PADRE",
  "ENCARGADO",
  "OTRO"
] as const;

function getPrismaEnumValues(enumObj: unknown): string[] {
  if (!enumObj || typeof enumObj !== "object") return [];
  return Object.values(enumObj as Record<string, string>);
}

const prismaRuntimeEnums = Prisma as unknown as {
  ClientPhoneRelationType?: Record<string, string>;
  $Enums?: { ClientPhoneRelationType?: Record<string, string> };
};

const relationEnumValues = getPrismaEnumValues(
  prismaRuntimeEnums.ClientPhoneRelationType ?? prismaRuntimeEnums.$Enums?.ClientPhoneRelationType
);

const CLIENT_PHONE_RELATION_TYPES = new Set<string>(
  relationEnumValues.length ? relationEnumValues : CLIENT_PHONE_RELATION_FALLBACK
);

const CLIENT_SERVICE_SEGMENT_FALLBACK: ClientServiceSegment = "PARTICULAR";
const CLIENT_SERVICE_SEGMENTS = new Set<ClientServiceSegment>([
  "PARTICULAR",
  "COMPANY",
  "INSTITUTION",
  "INSURER"
]);

function normalizeClientPhoneCategory(value?: ClientPhoneCategory | string | null): ClientPhoneCategory {
  if (!value) return ClientPhoneCategory.PRIMARY;
  const normalized = String(value).trim().toUpperCase() as ClientPhoneCategory;
  return CLIENT_PHONE_CATEGORIES.has(normalized) ? normalized : ClientPhoneCategory.OTHER;
}

function normalizeClientPhoneRelationType(value?: ClientPhoneRelationType | string | null): ClientPhoneRelationType {
  if (!value) return "TITULAR";
  const normalized = String(value).trim().toUpperCase();
  return CLIENT_PHONE_RELATION_TYPES.has(normalized) ? (normalized as ClientPhoneRelationType) : "OTRO";
}

function normalizeClientEmailCategory(value?: ClientEmailCategory | string | null): ClientEmailCategory {
  if (!value) return ClientEmailCategory.PRIMARY;
  const normalized = String(value).trim().toUpperCase() as ClientEmailCategory;
  return CLIENT_EMAIL_CATEGORIES.has(normalized) ? normalized : ClientEmailCategory.OTHER;
}

function normalizeClientServiceSegments(values?: Array<ClientServiceSegment | string> | null): ClientServiceSegment[] {
  const normalized = Array.isArray(values)
    ? values
        .map((value) => String(value ?? "").trim().toUpperCase())
        .filter((value): value is ClientServiceSegment => CLIENT_SERVICE_SEGMENTS.has(value as ClientServiceSegment))
    : [];
  if (!normalized.length) return [CLIENT_SERVICE_SEGMENT_FALLBACK];
  return [...new Set(normalized)];
}

function normalizeStrictPhoneForPerson(rawValue: string, fieldLabel: string): string {
  const raw = (rawValue ?? "").trim();
  if (raw.startsWith("+")) {
    throw new Error(`${fieldLabel} inválido. Ingresa solo número local sin '+'.`);
  }
  return assertStrictLocalPhoneValue(raw, fieldLabel);
}

function normalizeClientPhoneChannels(input: {
  channels?: ClientPhoneChannelInput[] | null;
  fallbackPhone?: string | null;
  fallbackCountryIso2?: string | null;
}): NormalizedClientPhoneChannel[] {
  const rows: NormalizedClientPhoneChannel[] = [];
  const channels = Array.isArray(input.channels) ? input.channels : [];

  for (const item of channels) {
    const rawNumber = normalizeOptional(item.value);
    if (!rawNumber) continue;
    const number = normalizePhoneValue(rawNumber);
    if (!number) continue;
    const countryCode = normalizeSourceToken(item.countryIso2 ?? "").slice(0, 2) || "XX";
    const e164 = normalizePhoneE164(rawNumber);
    rows.push({
      category: normalizeClientPhoneCategory(item.category),
      relationType: normalizeClientPhoneRelationType(item.relationType),
      number,
      countryCode,
      e164,
      canCall: item.canCall !== false,
      canWhatsapp: item.canWhatsapp === true,
      isPrimary: Boolean(item.isPrimary),
      isActive: item.isActive !== false
    });
  }

  const fallbackRaw = normalizeOptional(input.fallbackPhone);
  const fallbackNumber = fallbackRaw ? normalizePhoneValue(fallbackRaw) : null;
  if (fallbackNumber) {
    const fallbackCountryCode = normalizeSourceToken(input.fallbackCountryIso2 ?? "").slice(0, 2) || "XX";
    const exists = rows.some((row) => row.number === fallbackNumber && row.countryCode === fallbackCountryCode);
    if (!exists) {
      const fallbackE164 = fallbackRaw ? normalizePhoneE164(fallbackRaw) : null;
      rows.unshift({
        category: ClientPhoneCategory.PRIMARY,
        relationType: "TITULAR",
        number: fallbackNumber,
        countryCode: fallbackCountryCode,
        e164: fallbackE164,
        canCall: true,
        canWhatsapp: false,
        isPrimary: true,
        isActive: true
      });
    }
  }

  const activeRows = rows.filter((row) => row.isActive);
  if (!activeRows.length) return [];

  const dedupedRows: NormalizedClientPhoneChannel[] = [];
  const indexByPhoneKey = new Map<string, number>();
  for (const row of activeRows) {
    const dedupeKey = row.e164 ?? `${row.countryCode}|${row.number}`;
    const existingIndex = indexByPhoneKey.get(dedupeKey);
    if (existingIndex === undefined) {
      indexByPhoneKey.set(dedupeKey, dedupedRows.length);
      dedupedRows.push({ ...row, isActive: true });
      continue;
    }

    const existing = dedupedRows[existingIndex];
    dedupedRows[existingIndex] = {
      ...existing,
      category:
        existing.category === ClientPhoneCategory.OTHER && row.category !== ClientPhoneCategory.OTHER
          ? row.category
          : existing.category,
      relationType: existing.relationType === "OTRO" && row.relationType !== "OTRO" ? row.relationType : existing.relationType,
      canCall: existing.canCall || row.canCall,
      canWhatsapp: existing.canWhatsapp || row.canWhatsapp,
      isPrimary: existing.isPrimary || row.isPrimary,
      e164: existing.e164 ?? row.e164
    };
  }

  let primaryIndex = dedupedRows.findIndex((row) => row.isPrimary);
  if (primaryIndex < 0) primaryIndex = 0;

  return dedupedRows.map((row, index) => ({
    ...row,
    isPrimary: index === primaryIndex
  }));
}

function normalizeClientEmailChannels(input: {
  channels?: ClientEmailChannelInput[] | null;
  fallbackEmail?: string | null;
}): NormalizedClientEmailChannel[] {
  const rows: NormalizedClientEmailChannel[] = [];
  const channels = Array.isArray(input.channels) ? input.channels : [];

  for (const item of channels) {
    const raw = normalizeOptional(item.value);
    if (!raw) continue;
    const valueNormalized = raw.toLowerCase();
    if (!isValidEmail(valueNormalized)) continue;
    rows.push({
      category: normalizeClientEmailCategory(item.category),
      valueRaw: raw,
      valueNormalized,
      isPrimary: Boolean(item.isPrimary),
      isActive: item.isActive !== false
    });
  }

  const fallbackEmail = normalizeOptional(input.fallbackEmail);
  if (fallbackEmail && isValidEmail(fallbackEmail)) {
    const normalizedFallback = fallbackEmail.toLowerCase();
    const exists = rows.some((row) => row.valueNormalized === normalizedFallback);
    if (!exists) {
      rows.unshift({
        category: ClientEmailCategory.PRIMARY,
        valueRaw: fallbackEmail,
        valueNormalized: normalizedFallback,
        isPrimary: true,
        isActive: true
      });
    }
  }

  const activeRows = rows.filter((row) => row.isActive);
  if (!activeRows.length) return [];

  if (!activeRows.some((row) => row.isPrimary)) {
    activeRows[0].isPrimary = true;
  }

  return rows.filter((row) => row.isActive);
}

async function createClientContactChannels(
  tx: Prisma.TransactionClient,
  input: {
    clientId: string;
    phoneChannels: NormalizedClientPhoneChannel[];
    emailChannels: NormalizedClientEmailChannel[];
  }
) {
  if (input.phoneChannels.length) {
    const iso2Codes = [...new Set(input.phoneChannels.map((row) => row.countryCode).filter((code) => code && code !== "XX"))];
    const phoneCatalog = iso2Codes.length
      ? await tx.phoneCountryCode.findMany({
          where: {
            iso2: { in: iso2Codes },
            isActive: true
          },
          select: {
            iso2: true,
            dialCode: true
          }
        })
      : [];
    const dialByIso2 = new Map(phoneCatalog.map((row) => [row.iso2, normalizeCallingCode(row.dialCode)]));

    await tx.clientPhone.createMany({
      data: input.phoneChannels.map((row) => {
        const resolvedE164 = row.e164 ?? buildE164(dialByIso2.get(row.countryCode) ?? null, row.number);
        return {
          clientId: input.clientId,
          category: row.category,
          relationType: row.relationType,
          countryCode: row.countryCode,
          number: row.number,
          e164: resolvedE164,
          canCall: row.canCall,
          canWhatsapp: row.canWhatsapp,
          isPrimary: row.isPrimary,
          isActive: row.isActive
        };
      })
    });
  }

  if (input.emailChannels.length) {
    await tx.clientEmail.createMany({
      data: input.emailChannels.map((row) => ({
        clientId: input.clientId,
        category: row.category,
        valueRaw: row.valueRaw,
        valueNormalized: row.valueNormalized,
        isPrimary: row.isPrimary,
        isActive: row.isActive
      }))
    });
  }
}

function pickPrimaryPhoneChannel(channels: NormalizedClientPhoneChannel[]) {
  return channels.find((row) => row.isPrimary) ?? channels[0] ?? null;
}

function pickPrimaryEmailChannel(channels: NormalizedClientEmailChannel[]) {
  return channels.find((row) => row.isPrimary) ?? channels[0] ?? null;
}

async function createClientContactChannelsSafe(
  tx: Prisma.TransactionClient,
  input: {
    clientId: string;
    phoneChannels: NormalizedClientPhoneChannel[];
    emailChannels: NormalizedClientEmailChannel[];
    fallbackPhone?: string | null;
    fallbackCountryIso2?: string | null;
  }
) {
  if (!input.phoneChannels.length && !input.emailChannels.length) return;

  try {
    await createClientContactChannels(tx, {
      clientId: input.clientId,
      phoneChannels: input.phoneChannels,
      emailChannels: input.emailChannels
    });
    return;
  } catch (error) {
    if (!isPrismaMissingTableError(error) && !isPrismaSchemaMismatchError(error)) {
      throw error;
    }
    warnDevClientsCompat("clients.actions.createClientContactChannels", error);
  }

  const primaryPhone = pickPrimaryPhoneChannel(input.phoneChannels);
  await createPrimaryClientPhone(tx, {
    clientId: input.clientId,
    phone: primaryPhone?.number ?? input.fallbackPhone ?? null,
    countryIso2: primaryPhone?.countryCode ?? input.fallbackCountryIso2
  });
}

function mapCompanyGeneralChannelsToLegacy(input: {
  channels: NormalizedCompanyGeneralChannel[];
}) {
  const phoneChannels: ClientPhoneChannelInput[] = [];
  const emailChannels: ClientEmailChannelInput[] = [];

  for (const channel of input.channels) {
    if (channel.kind === "EMAIL") {
      emailChannels.push({
        category: inferEmailCategoryFromLabel(channel.label),
        value: channel.value,
        isPrimary: channel.isPrimary,
        isActive: true
      });
      continue;
    }

    phoneChannels.push({
      category: inferPhoneCategoryFromLabel(channel.label, channel.kind),
      relationType: "TITULAR",
      value: channel.value,
      countryIso2: channel.countryIso2 ?? undefined,
      canCall: channel.kind !== "WHATSAPP",
      canWhatsapp: channel.kind === "WHATSAPP",
      isPrimary: channel.isPrimary,
      isActive: true
    });
  }

  return { phoneChannels, emailChannels };
}

function formatPhoneWithExtension(number: string, extension?: string | null) {
  const ext = normalizeOptional(extension);
  return ext ? `${number} ext ${ext}` : number;
}

function inferCompanyContactRoleValue(input: { department: string; role: string }): CompanyContactRole {
  const token = normalizeSourceToken(`${input.department} ${input.role}`);
  if (token.includes("LEGAL") || token.includes("JURID")) return CompanyContactRole.LEGAL_REPRESENTATIVE;
  if (token.includes("FACTUR") || token.includes("FINANZ")) return CompanyContactRole.BILLING;
  if (token.includes("RRHH") || token.includes("RECURSOS_HUMANOS") || token.includes("HUMAN")) {
    return CompanyContactRole.HUMAN_RESOURCES;
  }
  if (token.includes("SALUD_OCUPACIONAL") || token.includes("OCUPACIONAL")) return CompanyContactRole.OCCUPATIONAL_HEALTH;
  if (token.includes("COMPRAS") || token.includes("PROCURE") || token.includes("ADQUISIC")) return CompanyContactRole.PROCUREMENT;
  return CompanyContactRole.ADMINISTRATIVE;
}

function inferCompanyPreferredChannel(input: {
  primaryPhone: { isWhatsApp: boolean } | null;
  primaryEmail: { value: string } | null;
}): CompanyContactChannel | null {
  if (input.primaryEmail && !input.primaryPhone) return CompanyContactChannel.EMAIL;
  if (input.primaryPhone?.isWhatsApp) return CompanyContactChannel.WHATSAPP;
  if (input.primaryPhone) return CompanyContactChannel.PHONE;
  if (input.primaryEmail) return CompanyContactChannel.EMAIL;
  return null;
}

function buildLegacyCompanyPersonRole(input: { department: string; role: string }) {
  const parts = [input.department, input.role].filter((part) => part.trim().length > 0);
  return parts.join(" · ") || "Contacto";
}

function pickFirstPersonPhone(people: NormalizedCompanyPersonContact[]) {
  for (const person of people) {
    const phone = person.phones.find((row) => row.isPrimary) ?? person.phones[0];
    if (phone) return phone;
  }
  return null;
}

function pickFirstPersonEmail(people: NormalizedCompanyPersonContact[]) {
  for (const person of people) {
    const email = person.emails.find((row) => row.isPrimary) ?? person.emails[0];
    if (email) return email;
  }
  return null;
}

async function safeCreateCompanyCoreWithContacts(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    clientProfileId: string;
    kind?: CompanyKind;
    legalName: string;
    tradeName: string | null;
    taxId: string | null;
    website: string | null;
    billingEmail: string | null;
    billingPhone: string | null;
    preferredCurrencyCode: string | null;
    acceptedCurrencyCodes: string[];
    commercialNote: string | null;
    companySizeRange: string | null;
    legalFormId: string | null;
    legalFormOther: string | null;
    activityPrimaryId: string | null;
    activitySecondaryIds: string[];
    legacyPbxExtensionNotes?: string[];
    metadataExtra?: Prisma.InputJsonValue | null;
    generalChannels: NormalizedCompanyGeneralChannel[];
    contactPeople: NormalizedCompanyPersonContact[];
  }
) {
  if (!input.contactPeople.length && !input.generalChannels.length) return { companyId: null as string | null };

  try {
    const companyMetadata: Record<string, unknown> = {
      source: "clients.company.new-form.v2",
      companySizeRange: input.companySizeRange,
      legalForm: input.legalFormId,
      legalFormOther: input.legalFormOther,
      website: input.website,
      economicActivityPrimaryId: input.activityPrimaryId,
      economicActivitySecondaryIds: input.activitySecondaryIds,
      preferredCurrencyCode: input.preferredCurrencyCode,
      acceptedCurrencyCodes: input.acceptedCurrencyCodes,
      legacyPbxExtensionNotes: input.legacyPbxExtensionNotes ?? [],
      generalChannels: input.generalChannels.map((row) => ({
        id: row.id,
        kind: row.kind,
        ownerType: row.ownerType,
        ownerPersonId: row.ownerPersonId,
        labelPreset: row.labelPreset,
        pbxAreaPreset: row.pbxAreaPreset,
        pbxAreaOther: row.pbxAreaOther,
        isPbx: row.kind === "PHONE" && row.labelPreset === "pbx",
        label: row.label,
        value: row.value,
        countryCode: row.countryCode,
        countryIso2: row.countryIso2,
        extension: row.extension,
        isPrimary: row.isPrimary
      }))
    };
    if (input.metadataExtra && typeof input.metadataExtra === "object" && !Array.isArray(input.metadataExtra)) {
      Object.assign(companyMetadata, input.metadataExtra as Record<string, unknown>);
    }

    const company = await tx.company.upsert({
      where: { clientProfileId: input.clientProfileId },
      update: {
        legalName: input.legalName,
        tradeName: input.tradeName,
        taxId: input.taxId,
        website: input.website,
        billingEmail: input.billingEmail,
        billingPhone: input.billingPhone,
        notes: input.commercialNote,
        metadata: companyMetadata as Prisma.InputJsonValue
      },
      create: {
        tenantId: input.tenantId,
        clientProfileId: input.clientProfileId,
        kind: input.kind ?? CompanyKind.COMPANY,
        status: CompanyStatus.ACTIVE,
        legalName: input.legalName,
        tradeName: input.tradeName,
        taxId: input.taxId,
        website: input.website,
        billingEmail: input.billingEmail,
        billingPhone: input.billingPhone,
        notes: input.commercialNote,
        metadata: companyMetadata as Prisma.InputJsonValue
      },
      select: { id: true }
    });

    if (input.contactPeople.length) {
      await tx.companyContact.createMany({
        data: input.contactPeople.map((person, index) => {
          const primaryPhone = person.phones.find((row) => row.isPrimary) ?? person.phones[0] ?? null;
          const primaryEmail = person.emails.find((row) => row.isPrimary) ?? person.emails[0] ?? null;
          const metadata: Prisma.InputJsonValue = {
            source: "clients.company.new-form.v2",
            employmentStatus: person.employmentStatus,
            departmentId: person.departmentId,
            departmentOther: person.departmentOther,
            jobTitleId: person.jobTitleId,
            jobTitleOther: person.jobTitleOther,
            linkedUserId: person.linkedUserId,
            linkedUserName: person.linkedUserName,
            linkedUserEmail: person.linkedUserEmail,
            phones: person.phones.map((row) => ({
              mode: row.mode,
              phoneType: row.phoneType,
              label: row.label,
              value: row.value,
              pbxChannelId: row.pbxChannelId,
              countryCode: row.countryCode,
              countryIso2: row.countryIso2,
              canCall: row.canCall,
              canWhatsApp: row.canWhatsApp,
              canSms: row.canSms,
              extension: row.extension,
              isWhatsApp: row.isWhatsApp,
              isPrimary: row.isPrimary
            })),
            emails: person.emails.map((row) => ({
              label: row.label,
              value: row.value,
              isPrimary: row.isPrimary
            }))
          };

          return {
            tenantId: input.tenantId,
            companyId: company.id,
            role: inferCompanyContactRoleValue({ department: person.department, role: person.role }),
            firstName: person.firstName,
            lastName: person.lastName || null,
            jobTitle: person.role || null,
            department: person.department || null,
            email: primaryEmail?.value ?? null,
            phone: primaryPhone?.value ?? null,
            phoneExtension: primaryPhone?.extension ?? null,
            preferredChannel: inferCompanyPreferredChannel({
              primaryPhone,
              primaryEmail
            }),
            isPrimary: index === 0,
            notes: person.notes,
            metadata
          };
        })
      });
    }

    return { companyId: company.id };
  } catch (error) {
    if (isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error)) {
      warnDevClientsCompat("clients.actions.createCompany.companyCore", error);
      return { companyId: null as string | null };
    }
    throw error;
  }
}

async function ensureEconomicActivityCatalogItem(
  tx: Prisma.TransactionClient,
  canonicalActivityId: string
): Promise<{ id: string; name: string; canonicalId: string }> {
  const definition = ECONOMIC_ACTIVITY_BY_ID.get(canonicalActivityId);
  if (!definition) throw new Error("Actividad económica inválida.");

  const existingById = await tx.clientCatalogItem.findUnique({
    where: { id: canonicalActivityId },
    select: { id: true, type: true, name: true, isActive: true }
  });
  if (existingById) {
    if (existingById.type !== ClientCatalogType.SECTOR) {
      throw new Error("Actividad económica inválida.");
    }
    if (existingById.name !== definition.label || !existingById.isActive) {
      await tx.clientCatalogItem.update({
        where: { id: existingById.id },
        data: {
          name: definition.label,
          isActive: true
        }
      });
    }
    return { id: existingById.id, name: definition.label, canonicalId: definition.id };
  }

  const existingByName = await tx.clientCatalogItem.findFirst({
    where: {
      type: ClientCatalogType.SECTOR,
      name: definition.label
    },
    select: { id: true }
  });
  if (existingByName) {
    if (existingByName.id === canonicalActivityId) {
      return { id: existingByName.id, name: definition.label, canonicalId: definition.id };
    }

    try {
      const migrated = await tx.clientCatalogItem.update({
        where: { id: existingByName.id },
        data: { id: canonicalActivityId, isActive: true }
      });
      return { id: migrated.id, name: definition.label, canonicalId: definition.id };
    } catch (error) {
      warnDevClientsCompat("clients.actions.createCompany.economicActivity.id_migration", error);
      return { id: existingByName.id, name: definition.label, canonicalId: definition.id };
    }
  }

  const created = await tx.clientCatalogItem.create({
    data: {
      id: definition.id,
      type: ClientCatalogType.SECTOR,
      name: definition.label,
      isActive: true
    },
    select: { id: true, name: true }
  });
  return { id: created.id, name: created.name, canonicalId: definition.id };
}

async function resolveEconomicActivityCatalogSelection(
  tx: Prisma.TransactionClient,
  input: {
    rawSelection: string | null;
    otherNote: string | null;
  }
) {
  const initialResolved = resolveEconomicActivitySelection(input.rawSelection);
  let resolvedId = initialResolved.id;
  let fallbackLegacyText = initialResolved.legacyText;

  if (input.rawSelection && !isEconomicActivityId(input.rawSelection) && initialResolved.id === ECONOMIC_ACTIVITY_OTHER_ID) {
    const legacyCatalogRow = await tx.clientCatalogItem.findFirst({
      where: {
        id: input.rawSelection,
        type: ClientCatalogType.SECTOR
      },
      select: { name: true }
    });
    if (legacyCatalogRow) {
      const remapped = resolveEconomicActivitySelection(legacyCatalogRow.name);
      resolvedId = remapped.id;
      fallbackLegacyText = remapped.legacyText ?? (remapped.id === ECONOMIC_ACTIVITY_OTHER_ID ? legacyCatalogRow.name : null);
    }
  }

  if (!resolvedId) {
    return {
      catalogRow: null as { id: string; name: string; canonicalId: string } | null,
      activityOtherNote: null as string | null,
      canonicalId: null as string | null
    };
  }

  const catalogRow = await ensureEconomicActivityCatalogItem(tx, resolvedId);
  const noteCandidate = input.otherNote ?? fallbackLegacyText;
  const noteValidation = validateEconomicActivityOtherNote({
    activityId: resolvedId,
    otherNote: noteCandidate
  });
  if (!noteValidation.ok) throw new Error(noteValidation.error);

  return {
    catalogRow,
    activityOtherNote: noteValidation.normalizedNote,
    canonicalId: resolvedId
  };
}

async function assertCatalogItemActive(
  tx: Prisma.TransactionClient,
  input: { id: string | null; type: ClientCatalogType; message: string }
) {
  if (!input.id) return null;
  const item = await tx.clientCatalogItem.findFirst({
    where: { id: input.id, type: input.type, isActive: true },
    select: { id: true }
  });
  if (!item) throw new Error(input.message);
  return item.id;
}

async function resolveResponsibleAdultPerson(
  tx: Prisma.TransactionClient,
  responsibleClientId: string
) {
  const responsible = await tx.clientProfile.findFirst({
    where: { id: responsibleClientId, type: ClientProfileType.PERSON, deletedAt: null },
    select: { id: true, birthDate: true }
  });
  if (!responsible) throw new Error("Responsable inválido. Debe ser una persona activa.");
  if (!responsible.birthDate || calculateAgeYears(responsible.birthDate) < 18) {
    throw new Error("El responsable debe ser mayor de edad.");
  }
  return responsible;
}

async function resolveAcquisitionInput(
  tx: Prisma.TransactionClient,
  input: {
    acquisitionSourceId?: string;
    acquisitionDetailOptionId?: string;
    acquisitionOtherNote?: string;
  }
): Promise<AcquisitionResolutionResult> {
  const sourceId = normalizeOptional(input.acquisitionSourceId);
  const detailOptionId = normalizeOptional(input.acquisitionDetailOptionId);
  const otherNote = normalizeOptional(input.acquisitionOtherNote);

  if (!sourceId) {
    return {
      sourceId: null,
      detailOptionId: null,
      otherNote: null,
      sourceCode: null,
      sourceName: null,
      requiresReferral: false
    };
  }

  const source = await tx.clientAcquisitionSource.findFirst({
    where: { id: sourceId, isActive: true },
    select: { id: true, code: true, name: true }
  });
  if (!source) throw new Error("Canal de adquisición inválido o inactivo.");

  const social = isSocialAcquisitionSource({ code: source.code, name: source.name });
  const referral = isReferralAcquisitionSource({ code: source.code, name: source.name });
  const preValidation = validateAcquisitionConditionalFields({
    sourceCode: source.code,
    sourceName: source.name,
    detailOptionId,
    otherNote
  });
  if (preValidation.detailError) throw new Error(preValidation.detailError);

  let normalizedDetailOptionId: string | null = null;
  let detailCode: string | null = null;
  let detailName: string | null = null;
  if (social) {
    const requiredId = detailOptionId as string;
    const detail = await tx.clientAcquisitionDetailOption.findFirst({
      where: { id: requiredId, sourceId: source.id, isActive: true },
      select: { id: true, code: true, name: true }
    });
    if (!detail) throw new Error("Detalle de canal inválido para redes sociales.");
    normalizedDetailOptionId = detail.id;
    detailCode = detail.code;
    detailName = detail.name;
  }

  const postValidation = validateAcquisitionConditionalFields({
    sourceCode: source.code,
    sourceName: source.name,
    detailCode,
    detailName,
    detailOptionId: normalizedDetailOptionId,
    otherNote
  });
  if (postValidation.noteError) throw new Error(postValidation.noteError);

  return {
    sourceId: source.id,
    detailOptionId: normalizedDetailOptionId,
    otherNote: postValidation.normalizedOtherNote,
    sourceCode: source.code ?? null,
    sourceName: source.name,
    requiresReferral: referral
  };
}

async function createReferralIfNeeded(
  tx: Prisma.TransactionClient,
  input: {
    referredClientId: string;
    referredByClientId?: string;
    requiresReferral: boolean;
  }
) {
  if (!input.requiresReferral) return { referrerClientId: null as string | null, created: false };

  const referrerClientId = normalizeRequired(input.referredByClientId, "Debes seleccionar el cliente referente.");
  if (referrerClientId === input.referredClientId) {
    throw new Error("Un cliente no puede referirse a sí mismo.");
  }

  const exists = await tx.clientProfile.findFirst({
    where: { id: referrerClientId, deletedAt: null },
    select: { id: true }
  });
  if (!exists) throw new Error("El cliente referente no existe o está inactivo.");

  try {
    await tx.clientReferral.create({
      data: {
        referrerClientId,
        referredClientId: input.referredClientId
      }
    });
    return { referrerClientId, created: true };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { referrerClientId, created: false };
    }
    throw error;
  }
}

function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("unknown arg") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function warnDevClientsCompat(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][clients] ${context}: fallback por schema mismatch. ` +
      "Ejecuta `npm run db:migrate:deploy` y `npm run db:generate`. " +
      `Details: ${message}`
  );
}

async function safeSupportsClientContactExtendedColumns(context = "clients.actions.contacts.columns"): Promise<boolean> {
  try {
    await prisma.clientContact.findFirst({
      select: {
        id: true,
        relationType: true,
        linkedPersonClientId: true,
        isEmergencyContact: true
      }
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientContact.findFirst`, error);
      return false;
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevClientsCompat(`${context}.clientContact.findFirst`, error);
      return false;
    }
    throw error;
  }
}

async function safeSupportsClientNoteExtendedColumns(context = "clients.actions.notes.columns"): Promise<boolean> {
  try {
    await prisma.clientNote.findFirst({
      select: {
        id: true,
        title: true,
        noteType: true,
        visibility: true
      }
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientNote.findFirst`, error);
      return false;
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevClientsCompat(`${context}.clientNote.findFirst`, error);
      return false;
    }
    throw error;
  }
}

function normalizeIdList(values: Iterable<FormDataEntryValue | string>) {
  const ids = new Set<string>();
  for (const raw of values) {
    const value = typeof raw === "string" ? raw : String(raw);
    const trimmed = value.trim();
    if (!trimmed) continue;
    ids.add(trimmed);
  }
  return Array.from(ids);
}

const CONTACT_RELATION_VALUES = ["FAMILY", "WORK", "FRIEND", "OTHER"] as const;
const NOTE_TYPE_VALUES = ["ADMIN", "RECEPCION", "CLINICA", "OTRA"] as const;
const NOTE_VISIBILITY_VALUES = ["INTERNA", "VISIBLE_PACIENTE"] as const;

type ContactRelationValue = (typeof CONTACT_RELATION_VALUES)[number];
type ClientNoteTypeValue = (typeof NOTE_TYPE_VALUES)[number];
type ClientNoteVisibilityValue = (typeof NOTE_VISIBILITY_VALUES)[number];

function normalizeContactRelationType(value: string | null | undefined): ContactRelationValue {
  const normalized = (value ?? "").trim().toUpperCase();
  if ((CONTACT_RELATION_VALUES as readonly string[]).includes(normalized)) {
    return normalized as ContactRelationValue;
  }
  throw new Error("Tipo de relación inválido.");
}

function normalizeClientNoteType(value: string | null | undefined): ClientNoteTypeValue {
  const normalized = (value ?? "").trim().toUpperCase();
  if ((NOTE_TYPE_VALUES as readonly string[]).includes(normalized)) {
    return normalized as ClientNoteTypeValue;
  }
  throw new Error("Tipo de nota inválido.");
}

function normalizeClientNoteVisibility(value: string | null | undefined): ClientNoteVisibilityValue {
  const normalized = (value ?? "").trim().toUpperCase();
  if ((NOTE_VISIBILITY_VALUES as readonly string[]).includes(normalized)) {
    return normalized as ClientNoteVisibilityValue;
  }
  throw new Error("Visibilidad inválida.");
}

const REQUIRED_DOCS_MIGRATION_ERROR =
  "Falta aplicar migración de documentos requeridos. Ejecuta prisma migrate dev/deploy.";

type ClientRequiredDocumentRuleDelegate = typeof prisma.clientRequiredDocumentRule;

function getClientRequiredDocumentRuleDelegateOrThrow(): ClientRequiredDocumentRuleDelegate {
  const delegate = (prisma as unknown as { clientRequiredDocumentRule?: ClientRequiredDocumentRuleDelegate })
    .clientRequiredDocumentRule;
  if (!delegate) {
    warnDevMissingRequiredDocsDelegate("clients.requiredDocs.rules.delegate");
    throw new Error(REQUIRED_DOCS_MIGRATION_ERROR);
  }
  return delegate;
}

async function runRequiredDocRulesOperation<T>(context: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(context, error);
      throw new Error(REQUIRED_DOCS_MIGRATION_ERROR);
    }
    throw error;
  }
}

async function logClientDocumentAudit(params: {
  actorUserId: string;
  actorRole: string | null;
  action: string;
  documentId: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: "ClientDocument",
      entityId: params.documentId,
      metadata: (params.metadata ?? null) as Prisma.InputJsonValue | undefined,
      before: (params.before ?? null) as Prisma.InputJsonValue | undefined,
      after: (params.after ?? null) as Prisma.InputJsonValue | undefined
    }
  });
}

function getClientListPath(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "/admin/clientes/personas";
  if (type === ClientProfileType.COMPANY) return "/admin/clientes/empresas";
  if (type === ClientProfileType.INSTITUTION) return "/admin/clientes/instituciones";
  return "/admin/clientes/aseguradoras";
}

async function resolveActiveClientProfile(clientId: string) {
  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true, type: true }
  });
  if (!client) throw new Error("Cliente no encontrado o archivado.");
  return client;
}

async function resolveDefaultActiveStatusId() {
  const status = await prisma.clientCatalogItem.findFirst({
    where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true, name: { equals: "Activo" } },
    select: { id: true }
  });
  return status?.id ?? null;
}

function formatClientLabel(input: {
  type: ClientProfileType;
  clientCode?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  companyName?: string | null;
  tradeName?: string | null;
  nit?: string | null;
  dpi?: string | null;
}) {
  const codeTag = input.clientCode ? `[${input.clientCode}] ` : "";
  if (input.type === ClientProfileType.PERSON) {
    const name = [input.firstName, input.middleName, input.lastName, input.secondLastName].filter(Boolean).join(" ").trim();
    if (name && input.dpi) return `${codeTag}${name} · DPI ${input.dpi}`;
    return codeTag + (name || (input.dpi ? `DPI ${input.dpi}` : "Persona"));
  }
  const name = input.companyName || input.tradeName || "Cliente";
  return input.nit ? `${codeTag}${name} · NIT ${input.nit}` : `${codeTag}${name}`;
}

type GeoSelectionInput = {
  geoCountryId?: string | null;
  geoAdmin1Id?: string | null;
  geoAdmin2Id?: string | null;
  geoAdmin3Id?: string | null;
  onlyActive?: boolean;
};

type ResolvedGeoSelection = {
  geoCountryId: string | null;
  geoAdmin1Id: string | null;
  geoAdmin2Id: string | null;
  geoAdmin3Id: string | null;
  countryName: string | null;
  countryIso2: string | null;
  admin1Name: string | null;
  admin2Name: string | null;
  admin3Name: string | null;
};

async function resolveGeoSelection(input: GeoSelectionInput): Promise<ResolvedGeoSelection> {
  const onlyActive = input.onlyActive !== false;
  const geoCountryId = normalizeOptional(input.geoCountryId);
  const geoAdmin1Id = normalizeOptional(input.geoAdmin1Id);
  const geoAdmin2Id = normalizeOptional(input.geoAdmin2Id);
  const geoAdmin3Id = normalizeOptional(input.geoAdmin3Id);

  const filterActive = onlyActive ? { isActive: true } : {};

  let country: { id: string; name: string; iso2: string } | null = null;
  let admin1Name: string | null = null;
  let admin2Name: string | null = null;
  let admin3Name: string | null = null;
  let legacyAdmin1Id: string | null = null;
  let legacyAdmin2Id: string | null = null;
  let legacyAdmin3Id: string | null = null;
  let resolvedAdmin1DivisionId: string | null = null;
  let resolvedAdmin2DivisionId: string | null = null;

  const hasIdMatch = (selectedId: string | null | undefined, candidates: Array<string | null | undefined>) => {
    if (!selectedId) return true;
    return candidates.filter(Boolean).includes(selectedId);
  };

  if (geoCountryId) {
    country = await prisma.geoCountry.findFirst({
      where: { id: geoCountryId, ...filterActive },
      select: { id: true, name: true, iso2: true }
    });
    if (!country) throw new Error("País inválido o inactivo.");
  }

  if (geoAdmin1Id) {
    const division1 = await prisma.geoDivision.findFirst({
      where: { id: geoAdmin1Id, level: 1, ...filterActive },
      select: {
        id: true,
        name: true,
        countryId: true,
        legacyGeoAdmin1Id: true
      }
    });

    if (division1) {
      admin1Name = division1.name;
      legacyAdmin1Id = division1.legacyGeoAdmin1Id ?? null;
      resolvedAdmin1DivisionId = division1.id;

      if (country && division1.countryId !== country.id) {
        throw new Error("La Región/Departamento no corresponde al país seleccionado.");
      }
      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: division1.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la región no encontrado.");
      }
    } else {
      const legacyAdmin1 = await prisma.geoAdmin1.findFirst({
        where: { id: geoAdmin1Id, ...filterActive },
        select: { id: true, name: true, countryId: true }
      });
      if (!legacyAdmin1) throw new Error("Región/Departamento inválido o inactivo.");

      admin1Name = legacyAdmin1.name;
      legacyAdmin1Id = legacyAdmin1.id;

      if (country && legacyAdmin1.countryId !== country.id) {
        throw new Error("La Región/Departamento no corresponde al país seleccionado.");
      }
      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: legacyAdmin1.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la región no encontrado.");
      }
    }
  }

  if (geoAdmin2Id) {
    const division2 = await prisma.geoDivision.findFirst({
      where: { id: geoAdmin2Id, level: 2, ...filterActive },
      select: {
        id: true,
        name: true,
        countryId: true,
        legacyGeoAdmin2Id: true,
        parent: {
          select: {
            id: true,
            level: true,
            name: true,
            countryId: true,
            legacyGeoAdmin1Id: true
          }
        }
      }
    });

    if (division2) {
      if (!division2.parent || division2.parent.level !== 1) {
        throw new Error("La Ciudad/Municipio no tiene jerarquía válida.");
      }
      if (
        !hasIdMatch(geoAdmin1Id, [resolvedAdmin1DivisionId, legacyAdmin1Id, division2.parent.id, division2.parent.legacyGeoAdmin1Id])
      ) {
        throw new Error("La Ciudad/Municipio no corresponde a la región seleccionada.");
      }
      if (country && division2.countryId !== country.id) {
        throw new Error("La Ciudad/Municipio no corresponde al país seleccionado.");
      }

      admin2Name = division2.name;
      admin1Name = admin1Name ?? division2.parent.name;
      legacyAdmin2Id = division2.legacyGeoAdmin2Id ?? null;
      legacyAdmin1Id = legacyAdmin1Id ?? division2.parent.legacyGeoAdmin1Id ?? null;
      resolvedAdmin1DivisionId = resolvedAdmin1DivisionId ?? division2.parent.id;
      resolvedAdmin2DivisionId = division2.id;

      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: division2.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la ciudad no encontrado.");
      }
    } else {
      const legacyAdmin2 = await prisma.geoAdmin2.findFirst({
        where: { id: geoAdmin2Id, ...filterActive },
        select: {
          id: true,
          name: true,
          admin1Id: true,
          admin1: {
            select: {
              id: true,
              name: true,
              countryId: true
            }
          }
        }
      });
      if (!legacyAdmin2) throw new Error("Ciudad/Municipio inválido o inactivo.");

      if (!hasIdMatch(geoAdmin1Id, [legacyAdmin1Id, legacyAdmin2.admin1Id])) {
        throw new Error("La Ciudad/Municipio no corresponde a la región seleccionada.");
      }
      if (country && legacyAdmin2.admin1.countryId !== country.id) {
        throw new Error("La Ciudad/Municipio no corresponde al país seleccionado.");
      }

      admin2Name = legacyAdmin2.name;
      admin1Name = admin1Name ?? legacyAdmin2.admin1.name;
      legacyAdmin2Id = legacyAdmin2.id;
      legacyAdmin1Id = legacyAdmin1Id ?? legacyAdmin2.admin1Id;

      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: legacyAdmin2.admin1.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la ciudad no encontrado.");
      }
    }
  }

  if (geoAdmin3Id) {
    const division3 = await prisma.geoDivision.findFirst({
      where: { id: geoAdmin3Id, level: 3, ...filterActive },
      select: {
        id: true,
        name: true,
        countryId: true,
        legacyGeoAdmin3Id: true,
        parent: {
          select: {
            id: true,
            level: true,
            name: true,
            countryId: true,
            legacyGeoAdmin2Id: true,
            parent: {
              select: {
                id: true,
                level: true,
                name: true,
                countryId: true,
                legacyGeoAdmin1Id: true
              }
            }
          }
        }
      }
    });

    if (division3) {
      const parent2 = division3.parent;
      const parent1 = parent2?.parent;
      if (!parent2 || parent2.level !== 2 || !parent1 || parent1.level !== 1) {
        throw new Error("La subdivisión no tiene jerarquía válida.");
      }
      if (!hasIdMatch(geoAdmin2Id, [resolvedAdmin2DivisionId, legacyAdmin2Id, parent2.id, parent2.legacyGeoAdmin2Id])) {
        throw new Error("La subdivisión no corresponde a la ciudad seleccionada.");
      }
      if (!hasIdMatch(geoAdmin1Id, [resolvedAdmin1DivisionId, legacyAdmin1Id, parent1.id, parent1.legacyGeoAdmin1Id])) {
        throw new Error("La subdivisión no corresponde a la región seleccionada.");
      }
      if (country && division3.countryId !== country.id) {
        throw new Error("La subdivisión no corresponde al país seleccionado.");
      }

      admin3Name = division3.name;
      admin2Name = admin2Name ?? parent2.name;
      admin1Name = admin1Name ?? parent1.name;
      legacyAdmin3Id = division3.legacyGeoAdmin3Id ?? null;
      legacyAdmin2Id = legacyAdmin2Id ?? parent2.legacyGeoAdmin2Id ?? null;
      legacyAdmin1Id = legacyAdmin1Id ?? parent1.legacyGeoAdmin1Id ?? null;
      resolvedAdmin2DivisionId = resolvedAdmin2DivisionId ?? parent2.id;
      resolvedAdmin1DivisionId = resolvedAdmin1DivisionId ?? parent1.id;

      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: division3.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la subdivisión no encontrado.");
      }
    } else {
      const legacyAdmin3 = await prisma.geoAdmin3.findFirst({
        where: { id: geoAdmin3Id, ...filterActive },
        select: {
          id: true,
          name: true,
          admin2Id: true,
          admin2: {
            select: {
              id: true,
              name: true,
              admin1Id: true,
              admin1: {
                select: {
                  id: true,
                  name: true,
                  countryId: true
                }
              }
            }
          }
        }
      });
      if (!legacyAdmin3) throw new Error("Subdivisión inválida o inactiva.");

      if (!hasIdMatch(geoAdmin2Id, [legacyAdmin2Id, legacyAdmin3.admin2Id])) {
        throw new Error("La subdivisión no corresponde a la ciudad seleccionada.");
      }
      if (!hasIdMatch(geoAdmin1Id, [legacyAdmin1Id, legacyAdmin3.admin2.admin1Id])) {
        throw new Error("La subdivisión no corresponde a la región seleccionada.");
      }
      if (country && legacyAdmin3.admin2.admin1.countryId !== country.id) {
        throw new Error("La subdivisión no corresponde al país seleccionado.");
      }

      admin3Name = legacyAdmin3.name;
      admin2Name = admin2Name ?? legacyAdmin3.admin2.name;
      admin1Name = admin1Name ?? legacyAdmin3.admin2.admin1.name;
      legacyAdmin3Id = legacyAdmin3.id;
      legacyAdmin2Id = legacyAdmin2Id ?? legacyAdmin3.admin2Id;
      legacyAdmin1Id = legacyAdmin1Id ?? legacyAdmin3.admin2.admin1Id;

      if (!country) {
        country = await prisma.geoCountry.findUnique({
          where: { id: legacyAdmin3.admin2.admin1.countryId },
          select: { id: true, name: true, iso2: true }
        });
        if (!country) throw new Error("País de la subdivisión no encontrado.");
      }
    }
  }

  return {
    geoCountryId: country?.id ?? null,
    geoAdmin1Id: legacyAdmin1Id,
    geoAdmin2Id: legacyAdmin2Id,
    geoAdmin3Id: legacyAdmin3Id,
    countryName: country?.name ?? null,
    countryIso2: country?.iso2 ?? null,
    admin1Name,
    admin2Name,
    admin3Name
  };
}

function payerTypeToClientProfileType(payerType: ClientAffiliationPayerType): ClientProfileType | null {
  if (payerType === ClientAffiliationPayerType.PERSON) return null;
  if (payerType === ClientAffiliationPayerType.COMPANY) return ClientProfileType.COMPANY;
  if (payerType === ClientAffiliationPayerType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (payerType === ClientAffiliationPayerType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function isAffiliationEntityType(
  type: ClientProfileType
): type is Extract<ClientProfileType, "COMPANY" | "INSTITUTION" | "INSURER"> {
  return type === ClientProfileType.COMPANY || type === ClientProfileType.INSTITUTION || type === ClientProfileType.INSURER;
}

type AffiliationTx = Prisma.TransactionClient;

async function resolveActivePersonProfile(tx: AffiliationTx, personClientId: string) {
  const person = await tx.clientProfile.findUnique({
    where: { id: personClientId },
    select: { id: true, type: true, deletedAt: true }
  });
  if (!person || person.type !== ClientProfileType.PERSON || person.deletedAt) throw new Error("Persona inválida.");
  return person;
}

async function resolveAffiliationEntity(
  tx: AffiliationTx,
  entityClientId: string,
  expectedType?: ClientProfileType
) {
  if (expectedType && !isAffiliationEntityType(expectedType)) {
    throw new Error("Tipo de afiliación inválido (solo COMPANY, INSTITUTION o INSURER).");
  }

  const entity = await tx.clientProfile.findUnique({
    where: { id: entityClientId },
    select: { id: true, type: true, deletedAt: true }
  });
  if (!entity || entity.deletedAt || !isAffiliationEntityType(entity.type)) {
    throw new Error("Entidad inválida (solo empresas, instituciones o aseguradoras).");
  }
  if (expectedType && entity.type !== expectedType) {
    throw new Error("El tipo de afiliación no coincide con la entidad seleccionada.");
  }
  return entity;
}

async function resolveAffiliationPayerClientId(params: {
  tx: AffiliationTx;
  payerType: ClientAffiliationPayerType;
  payerClientId?: string | null;
  defaultEntity: { id: string; type: ClientProfileType };
}) {
  const { tx, payerType, defaultEntity } = params;
  let payerClientId = normalizeOptional(params.payerClientId);

  if (payerType === ClientAffiliationPayerType.PERSON) return null;

  const payerProfileType = payerTypeToClientProfileType(payerType);
  if (!payerProfileType) throw new Error("Responsable de pago inválido.");

  if (!payerClientId && payerProfileType === defaultEntity.type) {
    payerClientId = defaultEntity.id;
  }
  if (!payerClientId) throw new Error("Selecciona el Responsable de pago.");

  const payer = await tx.clientProfile.findUnique({
    where: { id: payerClientId },
    select: { id: true, type: true, deletedAt: true }
  });
  if (!payer || payer.deletedAt || payer.type !== payerProfileType) {
    throw new Error("Responsable de pago inválido.");
  }

  return payerClientId;
}

async function enforceSinglePrimaryPayer(tx: AffiliationTx, personClientId: string, preferredAffiliationId?: string) {
  const activeAffiliations = await tx.clientAffiliation.findMany({
    where: {
      personClientId,
      deletedAt: null,
      status: ClientAffiliationStatus.ACTIVE
    },
    orderBy: [{ isPrimaryPayer: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, isPrimaryPayer: true }
  });

  if (!activeAffiliations.length) return;

  const currentPrimary = activeAffiliations.filter((item) => item.isPrimaryPayer).map((item) => item.id);
  const keepPrimaryId =
    preferredAffiliationId && activeAffiliations.some((item) => item.id === preferredAffiliationId)
      ? preferredAffiliationId
      : currentPrimary[0] ?? activeAffiliations[0]?.id;
  if (!keepPrimaryId) return;

  await tx.clientAffiliation.updateMany({
    where: {
      personClientId,
      deletedAt: null,
      status: ClientAffiliationStatus.ACTIVE,
      id: { not: keepPrimaryId },
      isPrimaryPayer: true
    },
    data: { isPrimaryPayer: false }
  });

  await tx.clientAffiliation.update({
    where: { id: keepPrimaryId },
    data: { isPrimaryPayer: true }
  });
}

export async function actionCreatePersonClient(input: {
  firstName: string;
  middleName?: string;
  thirdName?: string;
  lastName: string;
  secondLastName?: string;
  thirdLastName?: string;
  sex?: PatientSex;
  dpi?: string;
  identityCountryId?: string;
  identityDocumentTypeId?: string;
  identityDocumentValue?: string;
  phone: string;
  phoneCountryIso2?: string;
  email?: string;
  photoAssetId?: string;
  phones?: ClientPhoneChannelInput[];
  emails?: ClientEmailChannelInput[];
  birthDate?: string;
  birthCountryId?: string;
  birthGeoAdmin1Id?: string;
  birthGeoAdmin2Id?: string;
  birthGeoAdmin3Id?: string;
  birthGeoFreeState?: string;
  birthGeoFreeCity?: string;
  birthCity?: string;
  residenceCountryId?: string;
  residenceSameAsBirth?: boolean;
  bloodType?: string;
  professionCatalogId?: string;
  maritalStatusId?: string;
  academicLevelId?: string;
  responsibleClientId?: string;
  guardianRelationshipTypeId?: string;
  serviceSegments?: Array<ClientServiceSegment | string>;
  acquisitionSourceId?: string;
  acquisitionDetailOptionId?: string;
  acquisitionOtherNote?: string;
  referredByClientId?: string;
  addressGeneral?: string;
  addressHome?: string;
  addressWork?: string;
  geoCountryId?: string;
  geoAdmin1Id?: string;
  geoAdmin2Id?: string;
  geoAdmin3Id?: string;
  geoPostalCode?: string;
  geoFreeState?: string;
  geoFreeCity?: string;
  workGeoCountryId?: string;
  workGeoAdmin1Id?: string;
  workGeoAdmin2Id?: string;
  workGeoAdmin3Id?: string;
  workGeoPostalCode?: string;
  workGeoFreeState?: string;
  workGeoFreeCity?: string;
  relatedContacts?: Array<{
    relationshipTypeId?: string;
    linkedPersonClientId?: string;
    name?: string;
    phone?: string;
  }>;
  affiliations?: Array<{
    entityType?: ClientProfileType;
    entityClientId: string;
    role?: string;
    status?: ClientAffiliationStatus;
    payerType?: ClientAffiliationPayerType;
    payerClientId?: string;
    isPrimaryPayer?: boolean;
  }>;
}) {
  const user = await requireClientCreatorUser();
  const tenantId = tenantIdFromUser(user);

  const firstName = normalizeRequired(input.firstName, "Primer nombre requerido.");
  const lastName = normalizeRequired(input.lastName, "Primer apellido requerido.");
  const middleName = normalizeOptional(input.middleName);
  const thirdName = normalizeOptional(input.thirdName);
  const secondLastName = normalizeOptional(input.secondLastName);
  const thirdLastName = normalizeOptional(input.thirdLastName);
  const sex = input.sex && Object.values(PatientSex).includes(input.sex) ? input.sex : null;

  const identityCountryId = normalizeOptional(input.identityCountryId);
  const identityDocumentTypeId = normalizeOptional(input.identityDocumentTypeId);
  const identityDocumentRawValue = normalizeOptional(input.identityDocumentValue ?? input.dpi);

  const phone = normalizeStrictPhoneForPerson(
    normalizeRequired(input.phone, "Teléfono requerido."),
    "Teléfono principal"
  );
  const email = normalizeOptional(input.email);
  const photoAssetId = normalizeOptional(input.photoAssetId);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");
  const birthDate = parseOptionalBirthDate(input.birthDate);
  const bloodType = resolveClientBloodType(input.bloodType);
  const professionCatalogId = normalizeOptional(input.professionCatalogId);
  const maritalStatusId = normalizeOptional(input.maritalStatusId);
  const academicLevelId = normalizeOptional(input.academicLevelId);
  const serviceSegments = normalizeClientServiceSegments(input.serviceSegments);
  const responsibleClientId = normalizeOptional(input.responsibleClientId);
  const guardianRelationshipTypeId = normalizeOptional(input.guardianRelationshipTypeId);
  const requiresResponsible = isMinorClient(birthDate);
  const birthCountryId = normalizeOptional(input.birthCountryId);
  const birthGeoAdmin1Id = normalizeOptional(input.birthGeoAdmin1Id);
  const birthGeoAdmin2Id = normalizeOptional(input.birthGeoAdmin2Id);
  const birthGeoAdmin3Id = normalizeOptional(input.birthGeoAdmin3Id);
  const birthGeoFreeState = normalizeOptional(input.birthGeoFreeState);
  const birthGeoFreeCity = normalizeOptional(input.birthGeoFreeCity);
  const birthCity = normalizeOptional(input.birthCity);
  const residenceCountryId = normalizeOptional(input.residenceCountryId);
  const residenceSameAsBirth = Boolean(input.residenceSameAsBirth);
  const hasBirthGeoSelection = Boolean(
    birthCountryId || birthGeoAdmin1Id || birthGeoAdmin2Id || birthGeoAdmin3Id || birthGeoFreeState || birthGeoFreeCity
  );
  const birthGeo = hasBirthGeoSelection
    ? await resolveGeoSelection({
        geoCountryId: birthCountryId,
        geoAdmin1Id: birthGeoAdmin1Id,
        geoAdmin2Id: birthGeoAdmin2Id,
        geoAdmin3Id: birthGeoAdmin3Id
      })
    : {
        geoCountryId: null,
        geoAdmin1Id: null,
        geoAdmin2Id: null,
        geoAdmin3Id: null,
        countryName: null,
        countryIso2: null,
        admin1Name: null,
        admin2Name: null,
        admin3Name: null
      };
  const normalizedBirthCountryId = birthGeo.geoCountryId ?? birthCountryId ?? null;
  const birthPlaceLabel = buildBirthPlaceLabel({
    cityOrTown: birthCity,
    geoAdmin2Name: birthGeo.admin2Name,
    geoFreeCity: birthGeoFreeCity,
    geoAdmin1Name: birthGeo.admin1Name,
    geoFreeState: birthGeoFreeState,
    geoCountryName: birthGeo.countryName
  });

  const addressGeneral = normalizeOptional(input.addressGeneral);
  const addressHome = normalizeOptional(input.addressHome);
  const addressWork = normalizeOptional(input.addressWork);
  const geoPostalCode = normalizeOptional(input.geoPostalCode);
  const geoFreeState = normalizeOptional(input.geoFreeState);
  const geoFreeCity = normalizeOptional(input.geoFreeCity);
  const workGeoPostalCode = normalizeOptional(input.workGeoPostalCode);
  const workGeoFreeState = normalizeOptional(input.workGeoFreeState);
  const workGeoFreeCity = normalizeOptional(input.workGeoFreeCity);
  const normalizedRelatedContacts = (Array.isArray(input.relatedContacts) ? input.relatedContacts : []).map((item) => ({
    relationshipTypeId: normalizeOptional(item.relationshipTypeId),
    linkedPersonClientId: normalizeOptional(item.linkedPersonClientId),
    name: normalizeOptional(item.name),
    phone: item.phone ? normalizeStrictPhoneForPerson(item.phone, "Teléfono de relacionado") : null
  }));
  const effectiveGeoCountryId =
    normalizeOptional(input.geoCountryId) ??
    (residenceSameAsBirth ? normalizedBirthCountryId : residenceCountryId);
  const geo = await resolveGeoSelection({
    geoCountryId: effectiveGeoCountryId,
    geoAdmin1Id: input.geoAdmin1Id,
    geoAdmin2Id: input.geoAdmin2Id,
    geoAdmin3Id: input.geoAdmin3Id
  });
  const hasResidenceGeoSelection = Boolean(
    normalizeOptional(input.geoAdmin1Id) ||
      normalizeOptional(input.geoAdmin2Id) ||
      normalizeOptional(input.geoAdmin3Id) ||
      geoPostalCode ||
      geoFreeState ||
      geoFreeCity
  );
  if (hasResidenceGeoSelection && !addressGeneral && !addressHome) {
    throw new Error("Dirección de vivienda requerida.");
  }
  const hasWorkGeoSelection = Boolean(
    normalizeOptional(input.workGeoCountryId) ||
      normalizeOptional(input.workGeoAdmin1Id) ||
      normalizeOptional(input.workGeoAdmin2Id) ||
      normalizeOptional(input.workGeoAdmin3Id) ||
      workGeoPostalCode ||
      workGeoFreeState ||
      workGeoFreeCity
  );
  const workGeo = hasWorkGeoSelection
    ? await resolveGeoSelection({
        geoCountryId: input.workGeoCountryId,
        geoAdmin1Id: input.workGeoAdmin1Id,
        geoAdmin2Id: input.workGeoAdmin2Id,
        geoAdmin3Id: input.workGeoAdmin3Id
      })
    : null;

  for (const channel of Array.isArray(input.phones) ? input.phones : []) {
    if (!normalizeOptional(channel.value)) continue;
    normalizeStrictPhoneForPerson(channel.value as string, "Teléfono");
  }
  const phoneChannels = normalizeClientPhoneChannels({
    channels: input.phones,
    fallbackPhone: phone,
    fallbackCountryIso2: input.phoneCountryIso2 ?? geo.countryIso2
  });
  const emailChannels = normalizeClientEmailChannels({
    channels: input.emails,
    fallbackEmail: email
  });
  const affiliations = Array.isArray(input.affiliations) ? input.affiliations : [];

  const defaultStatusId = await resolveDefaultActiveStatusId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (professionCatalogId) {
        const profession = await tx.clientCatalogItem.findFirst({
          where: {
            id: professionCatalogId,
            type: ClientCatalogType.PERSON_PROFESSION,
            isActive: true
          },
          select: { id: true }
        });
        if (!profession) throw new Error("Profesión inválida o inactiva.");
      }

      const maritalStatusIdResolved = await assertCatalogItemActive(tx, {
        id: maritalStatusId,
        type: ClientCatalogType.MARITAL_STATUS,
        message: "Estado civil inválido o inactivo."
      });
      const academicLevelIdResolved = await assertCatalogItemActive(tx, {
        id: academicLevelId,
        type: ClientCatalogType.ACADEMIC_LEVEL,
        message: "Nivel académico inválido o inactivo."
      });
      const guardianRelationshipTypeIdResolved = await assertCatalogItemActive(tx, {
        id: guardianRelationshipTypeId,
        type: ClientCatalogType.RELATIONSHIP_TYPE,
        message: "Tipo de parentesco inválido o inactivo."
      });

      let responsible: { id: string; birthDate: Date | null } | null = null;
      if (requiresResponsible) {
        const responsibleId = normalizeRequired(
          responsibleClientId,
          "Menor de edad: debes seleccionar responsable."
        );
        responsible = await resolveResponsibleAdultPerson(tx, responsibleId);
      }

      if (photoAssetId) {
        const photoAsset = await tx.fileAsset.findUnique({
          where: { id: photoAssetId },
          select: {
            id: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true
          }
        });
        if (!photoAsset) throw new Error("Foto de perfil inválida.");
        if (!CLIENT_PHOTO_ALLOWED_MIME_TYPES.has(photoAsset.mimeType.toLowerCase())) {
          throw new Error("Foto de perfil inválida. Solo se permiten JPG, PNG o WEBP.");
        }
        if (photoAsset.sizeBytes > CLIENT_PHOTO_MAX_SIZE_BYTES) {
          throw new Error("Foto de perfil inválida. Máximo 3MB.");
        }
        if (!photoAsset.storageKey.startsWith("clients/photos/")) {
          throw new Error("Foto de perfil inválida. Debe subirse en el flujo de clientes.");
        }
      }

      const [identityCountry, birthCountry, residenceCountry] = await Promise.all([
        identityCountryId
          ? tx.geoCountry.findFirst({
              where: { id: identityCountryId, isActive: true },
              select: { id: true, name: true, iso2: true }
            })
          : Promise.resolve(null),
        normalizedBirthCountryId
          ? tx.geoCountry.findFirst({
              where: { id: normalizedBirthCountryId, isActive: true },
              select: { id: true, name: true, iso2: true }
            })
          : Promise.resolve(null),
        (residenceSameAsBirth ? normalizedBirthCountryId : residenceCountryId)
          ? tx.geoCountry.findFirst({
              where: { id: (residenceSameAsBirth ? normalizedBirthCountryId : residenceCountryId) as string, isActive: true },
              select: { id: true, name: true, iso2: true }
            })
          : Promise.resolve(null)
      ]);

      if (identityCountryId && !identityCountry) throw new Error("País de identificación inválido o inactivo.");
      if (normalizedBirthCountryId && !birthCountry) throw new Error("País de nacimiento inválido o inactivo.");
      if ((residenceSameAsBirth ? normalizedBirthCountryId : residenceCountryId) && !residenceCountry) {
        throw new Error("País de residencia inválido o inactivo.");
      }

      const identityCountryIso2 =
        (identityCountry?.iso2 ?? residenceCountry?.iso2 ?? birthCountry?.iso2 ?? geo.countryIso2 ?? null);
      const identityOptions = await listActiveIdentityDocumentOptions(tx, identityCountryIso2);
      const selectedIdentityOption = normalizeIdentityDocumentSelection({
        options: identityOptions,
        identityDocumentTypeId
      });
      if (!selectedIdentityOption) {
        throw new Error("No hay tipos de documento de identidad disponibles.");
      }
      if (identityCountryIso2 === "GT" && !["DPI", "PASSPORT"].includes(selectedIdentityOption.code)) {
        throw new Error("Para Guatemala solo se permite DPI o Pasaporte.");
      }

      const identityValidation = validateIdentityDocumentValue({
        value: identityDocumentRawValue,
        documentCode: selectedIdentityOption.code,
        documentName: selectedIdentityOption.name,
        optional: selectedIdentityOption.optional
      });
      if (!identityValidation.ok) {
        throw new Error(identityValidation.error ?? "Documento de identidad inválido.");
      }

      const identityDocumentValue = identityValidation.value;

      const acquisition = await resolveAcquisitionInput(tx, {
        acquisitionSourceId: input.acquisitionSourceId,
        acquisitionDetailOptionId: input.acquisitionDetailOptionId,
        acquisitionOtherNote: input.acquisitionOtherNote
      });

      const hasGeoContext = Boolean(
        geo.geoCountryId ||
          geo.geoAdmin1Id ||
          geo.geoAdmin2Id ||
          geo.geoAdmin3Id ||
          geoPostalCode ||
          geoFreeState ||
          geoFreeCity
      );
      const hasWorkGeoContext = Boolean(
        workGeo?.geoCountryId ||
          workGeo?.geoAdmin1Id ||
          workGeo?.geoAdmin2Id ||
          workGeo?.geoAdmin3Id ||
          workGeoPostalCode ||
          workGeoFreeState ||
          workGeoFreeCity
      );
      const locationDrafts = buildPersonLocationDrafts({
        addressGeneral,
        addressHome,
        addressWork,
        hasGeoContext,
        geoAdmin2Name: geo.admin2Name,
        geoFreeCity,
        geoAdmin1Name: geo.admin1Name,
        geoFreeState,
        geoCountryName: geo.countryName,
        workHasGeoContext: hasWorkGeoContext,
        workGeoAdmin2Name: workGeo?.admin2Name,
        workGeoFreeCity: workGeoFreeCity,
        workGeoAdmin1Name: workGeo?.admin1Name,
        workGeoFreeState: workGeoFreeState,
        workGeoCountryName: workGeo?.countryName
      });
      const locationCreateData = locationDrafts.map((loc) => {
        const isResidenceLocation =
          loc.type === ClientLocationType.GENERAL ||
          loc.type === ClientLocationType.HOME ||
          loc.type === ClientLocationType.MAIN;
        const isWorkLocation = loc.type === ClientLocationType.WORK;
        return {
          type: loc.type,
          address: loc.address,
          addressLine1: loc.addressLine1,
          isPrimary: Boolean(loc.isPrimary),
          geoCountryId: isResidenceLocation ? geo.geoCountryId : isWorkLocation ? workGeo?.geoCountryId ?? null : null,
          geoAdmin1Id: isResidenceLocation ? geo.geoAdmin1Id : isWorkLocation ? workGeo?.geoAdmin1Id ?? null : null,
          geoAdmin2Id: isResidenceLocation ? geo.geoAdmin2Id : isWorkLocation ? workGeo?.geoAdmin2Id ?? null : null,
          geoAdmin3Id: isResidenceLocation ? geo.geoAdmin3Id : isWorkLocation ? workGeo?.geoAdmin3Id ?? null : null,
          freeState: isResidenceLocation ? geoFreeState : isWorkLocation ? workGeoFreeState : null,
          freeCity: isResidenceLocation ? geoFreeCity : isWorkLocation ? workGeoFreeCity : null,
          postalCode: isResidenceLocation ? geoPostalCode : isWorkLocation ? workGeoPostalCode : null,
          department: isResidenceLocation
            ? geo.admin1Name ?? geoFreeState
            : isWorkLocation
              ? workGeo?.admin1Name ?? workGeoFreeState ?? null
              : null,
          city: isResidenceLocation
            ? geo.admin2Name ?? geoFreeCity
            : isWorkLocation
              ? workGeo?.admin2Name ?? workGeoFreeCity ?? null
              : null,
          country: isResidenceLocation ? geo.countryName : isWorkLocation ? workGeo?.countryName ?? null : null
        };
      });
      const identifierCreateData =
        identityDocumentValue && identityDocumentValue.trim()
          ? [
              {
                value: identityDocumentValue,
                valueNormalized: normalizeIdentifierValue(identityDocumentValue),
                isPrimary: true,
                isActive: true,
                countryId: identityCountry?.id ?? geo.geoCountryId ?? null,
                documentTypeId:
                  selectedIdentityOption.source === "catalog" && !isFallbackDocumentTypeId(selectedIdentityOption.id)
                    ? selectedIdentityOption.id
                    : null
              }
            ]
          : [];
      const phoneIso2Codes = [...new Set(phoneChannels.map((row) => row.countryCode).filter((code) => code && code !== "XX"))];
      const phoneCatalog = phoneIso2Codes.length
        ? await tx.phoneCountryCode.findMany({
            where: {
              iso2: { in: phoneIso2Codes },
              isActive: true
            },
            select: {
              iso2: true,
              dialCode: true
            }
          })
        : [];
      const dialByIso2 = new Map(phoneCatalog.map((row) => [row.iso2, normalizeCallingCode(row.dialCode)]));
      const phoneCreateData = phoneChannels.map((row) => ({
        category: row.category,
        relationType: row.relationType,
        countryCode: row.countryCode,
        number: row.number,
        e164: row.e164 ?? buildE164(dialByIso2.get(row.countryCode) ?? null, row.number),
        canCall: row.canCall,
        canWhatsapp: row.canWhatsapp,
        isPrimary: row.isPrimary,
        isActive: row.isActive
      }));
      const emailCreateData = emailChannels.map((row) => ({
        category: row.category,
        valueRaw: row.valueRaw,
        valueNormalized: row.valueNormalized,
        isPrimary: row.isPrimary,
        isActive: row.isActive
      }));

      const reservedClientCode = await reserveNextClientCodeTx(tx, {
        tenantId,
        clientType: ClientProfileType.PERSON
      });

      const created = await tx.clientProfile.create({
        data: {
          tenantId,
          clientCode: reservedClientCode.code,
          type: ClientProfileType.PERSON,
          firstName,
          middleName,
          thirdName,
          lastName,
          secondLastName,
          thirdLastName,
          sex,
          birthDate,
          bloodType,
          serviceSegments,
          acquisitionOtherNote: acquisition.otherNote,
          ...(defaultStatusId
            ? {
                status: {
                  connect: { id: defaultStatusId }
                }
              }
            : {}),
          ...(professionCatalogId
            ? {
                professionCatalog: {
                  connect: { id: professionCatalogId }
                }
              }
            : {}),
          ...(acquisition.sourceId
            ? {
                acquisitionSource: {
                  connect: { id: acquisition.sourceId }
                }
              }
            : {}),
          ...(acquisition.detailOptionId
            ? {
                acquisitionDetailOption: {
                  connect: { id: acquisition.detailOptionId }
                }
              }
            : {}),
          ...(photoAssetId
            ? {
                photoAsset: {
                  connect: { id: photoAssetId }
                }
              }
            : {}),
          ...(identifierCreateData.length
            ? {
                clientIdentifiers: {
                  create: identifierCreateData
                }
              }
            : {}),
          ...(phoneCreateData.length
            ? {
                clientPhones: {
                  create: phoneCreateData
                }
              }
            : {}),
          ...(emailCreateData.length
            ? {
                clientEmails: {
                  create: emailCreateData
                }
              }
            : {}),
          ...(locationCreateData.length
            ? {
                clientLocations: {
                  create: locationCreateData
                }
              }
            : {})
        },
        select: { id: true }
      });

      const referralResult = await createReferralIfNeeded(tx, {
        referredClientId: created.id,
        referredByClientId: input.referredByClientId,
        requiresReferral: acquisition.requiresReferral
      });

      await tx.clientDemographicData.create({
        data: {
          clientId: created.id,
          maritalStatusId: maritalStatusIdResolved,
          academicLevelId: academicLevelIdResolved,
          responsibleClientId: responsible?.id ?? null,
          birthCountryId: birthCountry?.id ?? null,
          birthCity: birthPlaceLabel,
          residenceCountryId: residenceCountry?.id ?? geo.geoCountryId ?? null,
          residenceSameAsBirth
        }
      });

      if (requiresResponsible && responsible) {
        await tx.clientGuardianRelation.create({
          data: {
            minorClientId: created.id,
            guardianClientId: responsible.id,
            relationshipTypeId: guardianRelationshipTypeIdResolved
          }
        });
      }

      for (const related of normalizedRelatedContacts) {
        if (!related.relationshipTypeId && !related.linkedPersonClientId && !related.name && !related.phone) {
          continue;
        }
        const relationshipTypeId = normalizeRequired(
          related.relationshipTypeId,
          "Selecciona el tipo de relación para contactos relacionados."
        );
        const relationshipCatalog = await tx.clientCatalogItem.findFirst({
          where: {
            id: relationshipTypeId,
            type: ClientCatalogType.RELATIONSHIP_TYPE,
            isActive: true
          },
          select: { id: true, name: true }
        });
        if (!relationshipCatalog) throw new Error("Tipo de relación inválido o inactivo.");

        let linkedPersonClientId: string | null = null;
        let relatedName = related.name;
        if (related.linkedPersonClientId) {
          const linked = await tx.clientProfile.findFirst({
            where: {
              id: related.linkedPersonClientId,
              type: ClientProfileType.PERSON,
              deletedAt: null
            },
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              secondLastName: true
            }
          });
          if (!linked) throw new Error("Persona relacionada inválida.");
          linkedPersonClientId = linked.id;
          const fullName = [linked.firstName, linked.middleName, linked.lastName, linked.secondLastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          relatedName = fullName || relationshipCatalog.name;
        }

        if (!relatedName) {
          throw new Error("Ingresa nombre del relacionado cuando no seleccionas una persona existente.");
        }

        await tx.clientContact.create({
          data: {
            clientId: created.id,
            linkedPersonClientId,
            relationType: "FAMILY",
            role: relationshipCatalog.name,
            name: relatedName,
            phone: related.phone,
            phoneE164: related.phone?.startsWith("+") ? related.phone : null,
            isEmergencyContact: false,
            isPrimary: false
          }
        });
      }

      const internalAffiliation = await tx.clientAffiliation.create({
        data: {
          personClientId: created.id,
          entityType: ClientProfileType.PERSON,
          entityClientId: created.id,
          role: "INTERNAL",
          status: ClientAffiliationStatus.ACTIVE,
          payerType: ClientAffiliationPayerType.PERSON,
          payerClientId: null,
          isPrimaryPayer: true
        },
        select: { id: true }
      });

      let requestedPrimaryId: string | undefined = internalAffiliation.id;

      if (affiliations.length) {
        const seen = new Set<string>();

        for (const item of affiliations) {
          const entityType = item.entityType;
          const entityClientId = normalizeRequired(item.entityClientId, "Entidad inválida.");

          const entity = await resolveAffiliationEntity(tx, entityClientId, entityType);
          const uniqueKey = `${entity.type}:${entityClientId}`;
          if (seen.has(uniqueKey)) throw new Error("Afiliación duplicada.");
          seen.add(uniqueKey);

          const role = normalizeOptional(item.role);
          const status = item.status ?? ClientAffiliationStatus.ACTIVE;
          const payerType = item.payerType ?? ClientAffiliationPayerType.PERSON;
          const payerClientId = await resolveAffiliationPayerClientId({
            tx,
            payerType,
            payerClientId: item.payerClientId,
            defaultEntity: entity
          });
          const isPrimaryPayer = status === ClientAffiliationStatus.ACTIVE ? Boolean(item.isPrimaryPayer) : false;

          const createdAffiliation = await tx.clientAffiliation.create({
            data: {
              personClientId: created.id,
              entityType: entity.type,
              entityClientId,
              role,
              status,
              payerType,
              payerClientId,
              isPrimaryPayer
            },
            select: { id: true }
          });

          if (isPrimaryPayer) requestedPrimaryId = createdAffiliation.id;
        }
      }

      await enforceSinglePrimaryPayer(tx, created.id, requestedPrimaryId);

      await logClientAuditTx(tx, {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        clientId: created.id,
        action: "CLIENT_CREATED",
        metadata: {
          type: "PERSON",
          clientCode: reservedClientCode.code,
          affiliationsCount: affiliations.length + 1,
          defaultAffiliation: "INTERNAL",
          acquisitionSourceId: acquisition.sourceId,
          acquisitionSourceCode: acquisition.sourceCode,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          identityDocumentTypeId:
            selectedIdentityOption.source === "catalog" && !isFallbackDocumentTypeId(selectedIdentityOption.id)
              ? selectedIdentityOption.id
              : null,
          identityDocumentCode: selectedIdentityOption.code,
          identityDocumentSensitive: selectedIdentityOption.sensitive,
          referredByClientId: referralResult.referrerClientId,
          maritalStatusId: maritalStatusIdResolved,
          academicLevelId: academicLevelIdResolved,
          responsibleClientId: responsible?.id ?? null,
          isMinor: requiresResponsible,
          serviceSegments,
          relatedContactsCount: normalizedRelatedContacts.filter(
            (item) => item.relationshipTypeId || item.linkedPersonClientId || item.name || item.phone
          ).length
        }
      });

      return created;
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/personas");
    revalidatePath(`/admin/clientes/${result.id}`);
    return { id: result.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cliente con ese documento/identificador.");
    throw err;
  }
}

export async function actionCreateCompanyClient(input: {
  legalName: string;
  tradeName: string;
  nit: string;
  website?: string;
  logoUrl?: string;
  logoAssetId?: string;
  logoOriginalName?: string;
  address: string;
  city?: string;
  department?: string;
  country?: string;
  geoCountryId?: string;
  geoAdmin1Id?: string;
  geoAdmin2Id?: string;
  geoAdmin3Id?: string;
  geoPostalCode?: string;
  geoFreeState?: string;
  geoFreeCity?: string;
  companyTypeId?: string;
  companyCategoryId?: string;
  companySizeRange?: string;
  legalForm?: string;
  legalFormOther?: string;
  economicActivityId?: string;
  sectorId?: string;
  economicActivitySecondaryIds?: string[];
  economicActivityOtherNote?: string;
  generalChannels?: CompanyGeneralChannelInput[];
  contactPeople?: CompanyPersonContactInput[];
  useSameAddressForFiscal?: boolean;
  acquisitionSourceId?: string;
  acquisitionDetailOptionId?: string;
  acquisitionOtherNote?: string;
  referredByClientId?: string;
  preferredCurrencyCode?: string;
  acceptedCurrencyCodes?: string[];
  billingEmail?: string;
  commercialNote?: string;
  phone?: string;
  phoneCountryIso2?: string;
  email?: string;
  phones?: ClientPhoneChannelInput[];
  emails?: ClientEmailChannelInput[];
  branches?: CompanyBranchDraftInput[];
}) {
  const user = await requireClientCreatorUser();
  const tenantId = tenantIdFromUser(user);
  const supportsContactExtendedColumns = await safeSupportsClientContactExtendedColumns("clients.actions.createCompany.contacts");
  const supportsNoteExtendedColumns = await safeSupportsClientNoteExtendedColumns("clients.actions.createCompany.notes");
  const usesNewContactPayload = Array.isArray(input.generalChannels) || Array.isArray(input.contactPeople);
  const contactDirectories = usesNewContactPayload ? await getClientContactDirectories(tenantId, { includeInactive: true }) : null;
  const pbxCategoryOptions = (contactDirectories?.pbxCategories ?? []).map((item) => ({
    value: item.code.trim() || item.id.trim(),
    label: item.name,
    isActive: item.isActive
  }));

  const companyName = normalizeRequired(input.legalName, "Razón social requerida.");
  const tradeName = normalizeRequired(input.tradeName, "Nombre comercial requerido.");
  const nit = normalizeRequired(input.nit, "NIT requerido.");
  const websiteSelection = normalizeCompanyWebsite(input.website);
  if (websiteSelection.error) throw new Error(websiteSelection.error);
  const website = websiteSelection.value;
  const logoAssetId = normalizeOptional(input.logoAssetId);
  const logoUrl = normalizeOptional(input.logoUrl) ?? (logoAssetId ? `/api/files/${logoAssetId}` : null);
  const logoOriginalName = normalizeOptional(input.logoOriginalName);
  if (logoUrl && !logoAssetId) {
    throw new Error("Logo inválido.");
  }
  const address = normalizeRequired(input.address, "Dirección requerida.");
  const companyCategoryId = normalizeOptional(input.companyTypeId ?? input.companyCategoryId);
  const companySizeRange = normalizeOptional(input.companySizeRange);
  const legalForm = normalizeOptional(input.legalForm);
  const legalFormOther = normalizeOptional(input.legalFormOther);
  const economicActivitySelection = normalizeOptional(input.economicActivityId ?? input.sectorId);
  const currencySelection = resolveCurrencyPreferenceSelection({
    preferredCurrencyCode: input.preferredCurrencyCode,
    acceptedCurrencyCodes: input.acceptedCurrencyCodes
  });
  if (currencySelection.invalidPreferredCurrencyCode) {
    throw new Error("Moneda preferida inválida.");
  }
  if (currencySelection.invalidAcceptedCurrencyCodes.length > 0) {
    throw new Error("Monedas aceptadas inválidas.");
  }
  const preferredCurrencyCode = currencySelection.preferredCurrencyCode;
  const acceptedCurrencyCodes = currencySelection.acceptedCurrencyCodes;
  const explicitBillingEmail = normalizeOptional(input.billingEmail);
  if (explicitBillingEmail && !isValidEmail(explicitBillingEmail)) {
    throw new Error("Correo de facturación inválido.");
  }
  const commercialNote = normalizeOptional(input.commercialNote);
  if (companySizeRange && !isCompanyEmployeeRangeId(companySizeRange)) {
    throw new Error("Tamaño de empresa inválido.");
  }
  if (usesNewContactPayload && !legalForm) throw new Error("Forma jurídica requerida.");
  if (legalForm && !isCompanyLegalFormId(legalForm)) throw new Error("Forma jurídica inválida.");
  if (requiresCompanyLegalFormOther(legalForm) && !legalFormOther) throw new Error("Forma jurídica: debes especificar el detalle para 'Otro'.");
  if (legalFormOther && legalFormOther.length > 60) throw new Error("Forma jurídica: el detalle no puede exceder 60 caracteres.");
  if (usesNewContactPayload && !economicActivitySelection) throw new Error("Actividad económica principal requerida.");
  const economicActivityOtherNote = normalizeOptional(input.economicActivityOtherNote);
  const economicActivitySecondarySelections = Array.isArray(input.economicActivitySecondaryIds)
    ? Array.from(new Set(input.economicActivitySecondaryIds.map((item) => normalizeOptional(item)).filter(Boolean) as string[]))
    : [];
  const geoPostalCode = normalizeOptional(input.geoPostalCode);
  const geoFreeState = normalizeOptional(input.geoFreeState);
  const geoFreeCity = normalizeOptional(input.geoFreeCity);
  const geo = await resolveGeoSelection({
    geoCountryId: input.geoCountryId,
    geoAdmin1Id: input.geoAdmin1Id,
    geoAdmin2Id: input.geoAdmin2Id,
    geoAdmin3Id: input.geoAdmin3Id
  });
  const country = normalizeOptional(input.country) ?? geo.countryName;
  const department = normalizeOptional(input.department) ?? geo.admin1Name ?? geoFreeState;
  const city = normalizeOptional(input.city) ?? geo.admin2Name ?? geoFreeCity;
  if (!country) throw new Error("Selecciona país.");
  if (!department) throw new Error("Selecciona departamento.");
  if (!city) throw new Error("Selecciona municipio.");
  const normalizedGeneralChannels = usesNewContactPayload
    ? normalizeCompanyGeneralChannels(input.generalChannels, { pbxCategoryOptions })
    : [];
  const normalizedContactPeople = usesNewContactPayload
    ? normalizeCompanyPersonContacts(input.contactPeople, { pbxChannels: normalizedGeneralChannels })
    : [];
  const legacyPbxExtensionNotes = usesNewContactPayload
    ? collectLegacyPbxExtensions({ generalChannels: input.generalChannels, pbxCategoryOptions })
    : [];
  const normalizedContactPeopleWithLegacy =
    legacyPbxExtensionNotes.length > 0 && normalizedContactPeople.length > 0
      ? normalizedContactPeople.map((person, index) => {
          if (index !== 0) return person;
          const legacyBlock = legacyPbxExtensionNotes.join(" | ");
          const notes = [person.notes, legacyBlock].filter(Boolean).join(" | ");
          return { ...person, notes };
        })
      : normalizedContactPeople;
  const normalizedBranchDrafts = normalizeCompanyBranchDrafts(input.branches);
  for (let index = 0; index < normalizedBranchDrafts.length; index += 1) {
    const validationError = validateCompanyBranchDraft({
      branch: normalizedBranchDrafts[index]!,
      rowNumber: index + 1
    });
    if (validationError) throw new Error(validationError);
  }

  const resolvedBranchLocations = await Promise.all(
    normalizedBranchDrafts.map(async (branch, index) => {
      const branchGeo = await resolveGeoSelection({
        geoCountryId: branch.geoCountryId,
        geoAdmin1Id: branch.geoAdmin1Id,
        geoAdmin2Id: branch.geoAdmin2Id,
        geoAdmin3Id: branch.geoAdmin3Id
      });
      const branchCountry = branch.country ?? branchGeo.countryName;
      const branchDepartment = branch.department ?? branchGeo.admin1Name ?? branch.geoFreeState;
      const branchCity = branch.city ?? branchGeo.admin2Name ?? branch.geoFreeCity;
      if (!branchCountry) throw new Error(`Sucursal #${index + 1}: selecciona país.`);
      if (!branchDepartment) throw new Error(`Sucursal #${index + 1}: selecciona departamento.`);
      if (!branchCity) throw new Error(`Sucursal #${index + 1}: selecciona municipio.`);

      return {
        rowNumber: index + 1,
        name: branch.name,
        address: branch.address ?? "",
        country: branchCountry,
        department: branchDepartment,
        city: branchCity,
        geoCountryId: branchGeo.geoCountryId,
        geoAdmin1Id: branchGeo.geoAdmin1Id,
        geoAdmin2Id: branchGeo.geoAdmin2Id,
        geoAdmin3Id: branchGeo.geoAdmin3Id,
        freeState: branch.geoFreeState,
        freeCity: branch.geoFreeCity,
        postalCode: branch.geoPostalCode
      };
    })
  );

  if (usesNewContactPayload) {
    const generalDraftsError = validateCompanyGeneralChannelDrafts(input.generalChannels, {
      contactPeople: input.contactPeople,
      pbxCategoryOptions
    });
    if (generalDraftsError) throw new Error(generalDraftsError);
    const contactDraftsError = validateCompanyContactPeopleDrafts(input.contactPeople, {
      generalChannels: input.generalChannels
    });
    if (contactDraftsError) throw new Error(contactDraftsError);
    const generalChannelsError = validateCompanyGeneralChannels(normalizedGeneralChannels);
    if (generalChannelsError) throw new Error(generalChannelsError);
    const contactPeopleError = validateCompanyContactPeople(normalizedContactPeopleWithLegacy, {
      generalChannels: normalizedGeneralChannels
    });
    if (contactPeopleError) throw new Error(contactPeopleError);
    if (!hasAtLeastOneCompanyChannel({ generalChannels: normalizedGeneralChannels, contactPeople: normalizedContactPeopleWithLegacy })) {
      throw new Error("Debes registrar al menos un canal general o un canal dentro de personas de contacto.");
    }
  }

  const legacyFromGeneralChannels = usesNewContactPayload
    ? mapCompanyGeneralChannelsToLegacy({ channels: normalizedGeneralChannels })
    : { phoneChannels: input.phones ?? [], emailChannels: input.emails ?? [] };
  const personFallbackPhone = usesNewContactPayload ? pickFirstPersonPhone(normalizedContactPeopleWithLegacy) : null;
  const personFallbackEmail = usesNewContactPayload ? pickFirstPersonEmail(normalizedContactPeopleWithLegacy) : null;

  const phoneChannels = normalizeClientPhoneChannels({
    channels: legacyFromGeneralChannels.phoneChannels,
    fallbackPhone: input.phone ?? personFallbackPhone?.value ?? null,
    fallbackCountryIso2:
      input.phoneCountryIso2 ?? personFallbackPhone?.countryIso2 ?? geo.countryIso2
  });
  const emailChannels = normalizeClientEmailChannels({
    channels: legacyFromGeneralChannels.emailChannels,
    fallbackEmail: input.email ?? personFallbackEmail?.value ?? null
  });
  const primaryPhone = pickPrimaryPhoneChannel(phoneChannels);
  const primaryEmail = pickPrimaryEmailChannel(emailChannels);
  const phone = primaryPhone?.number ?? normalizeOptional(input.phone);
  const email = primaryEmail?.valueNormalized ?? normalizeOptional(input.email);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");

  const primaryGeneralPhone =
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL") ??
    null;
  const primaryGeneralEmail =
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL") ??
    null;
  const billingPhone = primaryGeneralPhone ? formatPhoneWithExtension(primaryGeneralPhone.value, primaryGeneralPhone.extension) : phone;
  const billingEmail = explicitBillingEmail ?? primaryGeneralEmail?.value ?? email;

  const defaultStatusId = await resolveDefaultActiveStatusId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const category = companyCategoryId
        ? await tx.clientCatalogItem.findFirst({
            where: {
              id: companyCategoryId,
              type: ClientCatalogType.COMPANY_CATEGORY,
              isActive: true
            },
            select: { id: true }
          })
        : null;
      if (companyCategoryId && !category) throw new Error("Tipo de empresa inválido o inactivo.");
      if (logoAssetId) {
        const logoAsset = await tx.fileAsset.findUnique({
          where: { id: logoAssetId },
          select: {
            id: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true
          }
        });
        if (!logoAsset) throw new Error("Logo inválido.");
        const logoValidation = validateCompanyLogoAsset({
          mimeType: logoAsset.mimeType,
          sizeBytes: logoAsset.sizeBytes,
          storageKey: logoAsset.storageKey
        });
        if (!logoValidation.ok) throw new Error(logoValidation.error);
      }
      const resolvedEconomicActivity = await resolveEconomicActivityCatalogSelection(tx, {
        rawSelection: economicActivitySelection,
        otherNote: economicActivityOtherNote
      });
      if (usesNewContactPayload && !resolvedEconomicActivity.catalogRow) {
        throw new Error("Actividad económica principal requerida.");
      }
      const resolvedSecondaryActivityRows: Array<{ id: string; name: string; canonicalId: string }> = [];
      if (economicActivitySecondarySelections.length) {
        for (const secondarySelection of economicActivitySecondarySelections) {
          if (!secondarySelection || secondarySelection === economicActivitySelection) continue;
          const resolvedSecondary = resolveEconomicActivitySelection(secondarySelection);
          if (!resolvedSecondary.id) continue;
          if (resolvedSecondary.id === resolvedEconomicActivity.canonicalId) continue;
          const row = await ensureEconomicActivityCatalogItem(tx, resolvedSecondary.id);
          if (!resolvedSecondaryActivityRows.some((item) => item.id === row.id)) {
            resolvedSecondaryActivityRows.push(row);
          }
        }
      }

      const acquisition = await resolveAcquisitionInput(tx, {
        acquisitionSourceId: input.acquisitionSourceId,
        acquisitionDetailOptionId: input.acquisitionDetailOptionId,
        acquisitionOtherNote: input.acquisitionOtherNote
      });

      const reservedClientCode = await reserveNextClientCodeTx(tx, {
        tenantId,
        clientType: ClientProfileType.COMPANY
      });

      const created = await tx.clientProfile.create({
        data: {
          tenantId,
          clientCode: reservedClientCode.code,
          type: ClientProfileType.COMPANY,
          companyName,
          tradeName,
          nit,
          address,
          city,
          department,
          country,
          companyCategoryId,
          sectorId: resolvedEconomicActivity.catalogRow?.id ?? null,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          acquisitionOtherNote: acquisition.otherNote,
          photoUrl: logoUrl,
          photoAssetId: logoAssetId,
          phone,
          email,
          statusId: defaultStatusId
        },
        select: { id: true }
      });

      const countryId = geo.geoCountryId ?? (await resolveCountryIdByName(tx, country));
      await createPrimaryClientIdentifier(tx, {
        clientId: created.id,
        value: nit,
        countryId,
        preferredDocumentTypeTokens: ["NIT", "RFC", "RUC", "CUIT", "TAX_ID"]
      });

      await createClientContactChannelsSafe(tx, {
        clientId: created.id,
        phoneChannels,
        emailChannels,
        fallbackPhone: phone,
        fallbackCountryIso2: input.phoneCountryIso2 ?? geo.countryIso2
      });

      if (normalizedContactPeopleWithLegacy.length) {
        for (let index = 0; index < normalizedContactPeopleWithLegacy.length; index += 1) {
          const person = normalizedContactPeopleWithLegacy[index];
          const primaryPersonPhone = person.phones.find((row) => row.isPrimary) ?? person.phones[0] ?? null;
          const primaryPersonEmail = person.emails.find((row) => row.isPrimary) ?? person.emails[0] ?? null;
          const role = buildLegacyCompanyPersonRole({
            department: person.department,
            role: person.role
          });
          const name = `${person.firstName} ${person.lastName}`.trim();

          await tx.clientContact.create({
            data: supportsContactExtendedColumns
              ? {
                  clientId: created.id,
                  name,
                  relationType: "WORK",
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isEmergencyContact: false,
                  isPrimary: index === 0
                }
              : {
                  clientId: created.id,
                  name,
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isPrimary: index === 0
                }
          });
        }
      }

      const companyCoreResult = await safeCreateCompanyCoreWithContacts(tx, {
        tenantId,
        clientProfileId: created.id,
        legalName: companyName,
        tradeName,
        taxId: nit,
        website,
        billingEmail,
        billingPhone,
        preferredCurrencyCode,
        acceptedCurrencyCodes,
        commercialNote,
        companySizeRange,
        legalFormId: legalForm,
        legalFormOther,
        activityPrimaryId: resolvedEconomicActivity.catalogRow?.id ?? null,
        activitySecondaryIds: resolvedSecondaryActivityRows.map((item) => item.id),
        legacyPbxExtensionNotes,
        generalChannels: normalizedGeneralChannels,
        contactPeople: normalizedContactPeopleWithLegacy
      });

      if (resolvedEconomicActivity.activityOtherNote) {
        const noteBody = `Actividad económica (Otro): ${resolvedEconomicActivity.activityOtherNote}`;
        try {
          await tx.clientNote.create({
            data: supportsNoteExtendedColumns
              ? {
                  clientId: created.id,
                  title: "Actividad económica principal",
                  body: noteBody,
                  noteType: "ADMIN",
                  visibility: "INTERNA",
                  actorId: user.id
                }
              : {
                  clientId: created.id,
                  body: noteBody,
                  actorId: user.id
                }
          });
        } catch (error) {
          if (isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error)) {
            warnDevClientsCompat("clients.actions.createCompany.activityOtherNote", error);
          } else {
            throw error;
          }
        }
      }

      const referralResult = await createReferralIfNeeded(tx, {
        referredClientId: created.id,
        referredByClientId: input.referredByClientId,
        requiresReferral: acquisition.requiresReferral
      });

      await tx.clientLocation.create({
        data: {
          clientId: created.id,
          type: ClientLocationType.MAIN,
          address,
          addressLine1: address,
          city,
          department,
          country,
          geoCountryId: geo.geoCountryId,
          geoAdmin1Id: geo.geoAdmin1Id,
          geoAdmin2Id: geo.geoAdmin2Id,
          geoAdmin3Id: geo.geoAdmin3Id,
          freeState: geoFreeState,
          freeCity: geoFreeCity,
          postalCode: geoPostalCode,
          isPrimary: true
        }
      });

      if (resolvedBranchLocations.length) {
        await tx.clientLocation.createMany({
          data: resolvedBranchLocations.map((branch) => ({
            clientId: created.id,
            type: ClientLocationType.BRANCH,
            name: branch.name,
            label: branch.name,
            code: `SUC_${String(branch.rowNumber).padStart(2, "0")}`,
            address: branch.address,
            addressLine1: branch.address,
            city: branch.city,
            department: branch.department,
            country: branch.country,
            geoCountryId: branch.geoCountryId,
            geoAdmin1Id: branch.geoAdmin1Id,
            geoAdmin2Id: branch.geoAdmin2Id,
            geoAdmin3Id: branch.geoAdmin3Id,
            freeState: branch.freeState,
            freeCity: branch.freeCity,
            postalCode: branch.postalCode,
            isPrimary: false,
            metadata: {
              source: "clients.company.new-form.v2",
              sequence: branch.rowNumber
            }
          }))
        });
      }

      await logClientAuditTx(tx, {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        clientId: created.id,
        action: "CLIENT_CREATED",
        metadata: {
          type: "COMPANY",
          clientCode: reservedClientCode.code,
          companyCategoryId,
          companySizeRange,
          economicActivityId: resolvedEconomicActivity.catalogRow?.id ?? null,
          economicActivityCanonicalId: resolvedEconomicActivity.canonicalId,
          economicActivitySecondaryIds: resolvedSecondaryActivityRows.map((item) => item.id),
          legalForm,
          legalFormOther,
          website,
          logoUrl,
          logoAssetId,
          logoOriginalName,
          branchCount: resolvedBranchLocations.length,
          companyCoreId: companyCoreResult.companyId,
          generalChannelsCount: normalizedGeneralChannels.length,
          contactPeopleCount: normalizedContactPeopleWithLegacy.length,
          preferredCurrencyCode,
          acceptedCurrencyCodes,
          legacyPbxExtensionNotes,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionSourceCode: acquisition.sourceCode,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          referredByClientId: referralResult.referrerClientId
        }
      });

      return created;
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/empresas");
    revalidatePath(`/admin/clientes/${result.id}`);
    return { id: result.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cliente con ese DPI/NIT.");
    throw err;
  }
}

export async function actionCreateInstitutionClient(input: {
  name: string;
  tradeName?: string;
  institutionTypeId: string;
  institutionCategoryId?: string;
  institutionCategorySecondaryIds?: string[];
  institutionSector?: "publico" | "privado" | "mixto" | string;
  institutionIsPublic?: boolean | null;
  institutionIsPayer?: boolean;
  institutionIsGroupOrganizer?: boolean;
  institutionIsSponsor?: boolean;
  nit?: string;
  website?: string;
  logoUrl?: string;
  logoAssetId?: string;
  logoOriginalName?: string;
  address: string;
  city?: string;
  department?: string;
  country?: string;
  geoCountryId?: string;
  geoAdmin1Id?: string;
  geoAdmin2Id?: string;
  geoAdmin3Id?: string;
  geoPostalCode?: string;
  geoFreeState?: string;
  geoFreeCity?: string;
  acquisitionSourceId?: string;
  acquisitionDetailOptionId?: string;
  acquisitionOtherNote?: string;
  referredByClientId?: string;
  preferredCurrencyCode?: string;
  acceptedCurrencyCodes?: string[];
  billingEmail?: string;
  commercialNote?: string;
  phone?: string;
  phoneCountryIso2?: string;
  email?: string;
  phones?: ClientPhoneChannelInput[];
  emails?: ClientEmailChannelInput[];
  generalChannels?: CompanyGeneralChannelInput[];
  contactPeople?: CompanyPersonContactInput[];
  useSameAddressForFiscal?: boolean;
  branches?: CompanyBranchDraftInput[];
}) {
  const user = await requireClientCreatorUser();
  const tenantId = tenantIdFromUser(user);
  const supportsContactExtendedColumns = await safeSupportsClientContactExtendedColumns("clients.actions.createInstitution.contacts");
  const usesNewContactPayload = Array.isArray(input.generalChannels) || Array.isArray(input.contactPeople);
  const contactDirectories = usesNewContactPayload ? await getClientContactDirectories(tenantId, { includeInactive: true }) : null;
  const pbxCategoryOptions = (contactDirectories?.pbxCategories ?? []).map((item) => ({
    value: item.code.trim() || item.id.trim(),
    label: item.name,
    isActive: item.isActive
  }));

  const companyName = normalizeRequired(input.name, "Nombre de institución requerido.");
  const tradeName = normalizeOptional(input.tradeName);
  const institutionTypeId = normalizeRequired(input.institutionTypeId, "Tipo de institución requerido.");
  const institutionCategoryId = normalizeOptional(input.institutionCategoryId);
  const institutionCategorySecondaryIds = Array.isArray(input.institutionCategorySecondaryIds)
    ? Array.from(new Set(input.institutionCategorySecondaryIds.map((item) => normalizeOptional(item)).filter(Boolean) as string[]))
    : [];
  const normalizedInstitutionSector = normalizeOptional(input.institutionSector)?.toLowerCase() ?? null;
  if (normalizedInstitutionSector && !["publico", "privado", "mixto"].includes(normalizedInstitutionSector)) {
    throw new Error("Sector institucional inválido.");
  }
  const institutionSector = normalizedInstitutionSector as "publico" | "privado" | "mixto" | null;
  const institutionIsPublic =
    typeof input.institutionIsPublic === "boolean"
      ? input.institutionIsPublic
      : institutionSector === "publico"
        ? true
        : institutionSector === "privado"
          ? false
          : null;
  const institutionIsPayer = Boolean(input.institutionIsPayer);
  const institutionIsGroupOrganizer = Boolean(input.institutionIsGroupOrganizer);
  const institutionIsSponsor = Boolean(input.institutionIsSponsor);
  const nit = normalizeOptional(input.nit);
  if (institutionIsPayer && !nit) throw new Error("NIT requerido para institución pagadora.");
  const websiteSelection = normalizeCompanyWebsite(input.website);
  if (websiteSelection.error) throw new Error(websiteSelection.error);
  const website = websiteSelection.value;
  const logoAssetId = normalizeOptional(input.logoAssetId);
  const logoUrl = normalizeOptional(input.logoUrl) ?? (logoAssetId ? `/api/files/${logoAssetId}` : null);
  const logoOriginalName = normalizeOptional(input.logoOriginalName);
  if (logoUrl && !logoAssetId) throw new Error("Logo inválido.");
  const address = normalizeRequired(input.address, "Dirección requerida.");
  const geoPostalCode = normalizeOptional(input.geoPostalCode);
  const geoFreeState = normalizeOptional(input.geoFreeState);
  const geoFreeCity = normalizeOptional(input.geoFreeCity);
  const geo = await resolveGeoSelection({
    geoCountryId: input.geoCountryId,
    geoAdmin1Id: input.geoAdmin1Id,
    geoAdmin2Id: input.geoAdmin2Id,
    geoAdmin3Id: input.geoAdmin3Id
  });
  const country = normalizeOptional(input.country) ?? geo.countryName;
  const department = normalizeOptional(input.department) ?? geo.admin1Name ?? geoFreeState;
  const city = normalizeOptional(input.city) ?? geo.admin2Name ?? geoFreeCity;
  if (!country) throw new Error("Selecciona país.");
  if (!department) throw new Error("Selecciona departamento.");
  if (!city) throw new Error("Selecciona municipio.");
  const currencySelection = resolveCurrencyPreferenceSelection({
    preferredCurrencyCode: input.preferredCurrencyCode,
    acceptedCurrencyCodes: input.acceptedCurrencyCodes
  });
  if (currencySelection.invalidPreferredCurrencyCode) throw new Error("Moneda preferida inválida.");
  if (currencySelection.invalidAcceptedCurrencyCodes.length > 0) throw new Error("Monedas aceptadas inválidas.");
  const preferredCurrencyCode = currencySelection.preferredCurrencyCode;
  const acceptedCurrencyCodes = currencySelection.acceptedCurrencyCodes;
  const explicitBillingEmail = normalizeOptional(input.billingEmail);
  if (explicitBillingEmail && !isValidEmail(explicitBillingEmail)) {
    throw new Error("Correo de facturación inválido.");
  }
  const commercialNote = normalizeOptional(input.commercialNote);

  const normalizedGeneralChannels = usesNewContactPayload
    ? normalizeCompanyGeneralChannels(input.generalChannels, { pbxCategoryOptions })
    : [];
  const normalizedContactPeople = usesNewContactPayload
    ? normalizeCompanyPersonContacts(input.contactPeople, { pbxChannels: normalizedGeneralChannels })
    : [];
  const legacyPbxExtensionNotes = usesNewContactPayload
    ? collectLegacyPbxExtensions({ generalChannels: input.generalChannels, pbxCategoryOptions })
    : [];
  const normalizedContactPeopleWithLegacy =
    legacyPbxExtensionNotes.length > 0 && normalizedContactPeople.length > 0
      ? normalizedContactPeople.map((person, index) => {
          if (index !== 0) return person;
          const legacyBlock = legacyPbxExtensionNotes.join(" | ");
          const notes = [person.notes, legacyBlock].filter(Boolean).join(" | ");
          return { ...person, notes };
        })
      : normalizedContactPeople;

  const normalizedBranchDrafts = normalizeCompanyBranchDrafts(input.branches);
  for (let index = 0; index < normalizedBranchDrafts.length; index += 1) {
    const validationError = validateCompanyBranchDraft({
      branch: normalizedBranchDrafts[index]!,
      rowNumber: index + 1
    });
    if (validationError) throw new Error(validationError);
  }

  const resolvedBranchLocations = await Promise.all(
    normalizedBranchDrafts.map(async (branch, index) => {
      const branchGeo = await resolveGeoSelection({
        geoCountryId: branch.geoCountryId,
        geoAdmin1Id: branch.geoAdmin1Id,
        geoAdmin2Id: branch.geoAdmin2Id,
        geoAdmin3Id: branch.geoAdmin3Id
      });
      const branchCountry = branch.country ?? branchGeo.countryName;
      const branchDepartment = branch.department ?? branchGeo.admin1Name ?? branch.geoFreeState;
      const branchCity = branch.city ?? branchGeo.admin2Name ?? branch.geoFreeCity;
      if (!branchCountry) throw new Error(`Sucursal #${index + 1}: selecciona país.`);
      if (!branchDepartment) throw new Error(`Sucursal #${index + 1}: selecciona departamento.`);
      if (!branchCity) throw new Error(`Sucursal #${index + 1}: selecciona municipio.`);

      return {
        rowNumber: index + 1,
        name: branch.name,
        address: branch.address ?? "",
        country: branchCountry,
        department: branchDepartment,
        city: branchCity,
        geoCountryId: branchGeo.geoCountryId,
        geoAdmin1Id: branchGeo.geoAdmin1Id,
        geoAdmin2Id: branchGeo.geoAdmin2Id,
        geoAdmin3Id: branchGeo.geoAdmin3Id,
        freeState: branch.geoFreeState,
        freeCity: branch.geoFreeCity,
        postalCode: branch.geoPostalCode
      };
    })
  );

  if (usesNewContactPayload) {
    const generalDraftsError = validateCompanyGeneralChannelDrafts(input.generalChannels, {
      contactPeople: input.contactPeople,
      pbxCategoryOptions
    });
    if (generalDraftsError) throw new Error(generalDraftsError);

    const contactDraftsError = validateCompanyContactPeopleDrafts(input.contactPeople, {
      generalChannels: input.generalChannels
    });
    if (contactDraftsError) throw new Error(contactDraftsError);

    const generalChannelsError = validateCompanyGeneralChannels(normalizedGeneralChannels);
    if (generalChannelsError) throw new Error(generalChannelsError);

    const contactPeopleError = validateCompanyContactPeople(normalizedContactPeopleWithLegacy, {
      generalChannels: normalizedGeneralChannels
    });
    if (contactPeopleError) throw new Error(contactPeopleError);

    if (!hasAtLeastOneCompanyChannel({ generalChannels: normalizedGeneralChannels, contactPeople: normalizedContactPeopleWithLegacy })) {
      throw new Error("Debes registrar al menos un canal general o un canal dentro de personas de contacto.");
    }
  }

  const legacyFromGeneralChannels = usesNewContactPayload
    ? mapCompanyGeneralChannelsToLegacy({ channels: normalizedGeneralChannels })
    : { phoneChannels: input.phones ?? [], emailChannels: input.emails ?? [] };
  const personFallbackPhone = usesNewContactPayload ? pickFirstPersonPhone(normalizedContactPeopleWithLegacy) : null;
  const personFallbackEmail = usesNewContactPayload ? pickFirstPersonEmail(normalizedContactPeopleWithLegacy) : null;

  const phoneChannels = normalizeClientPhoneChannels({
    channels: legacyFromGeneralChannels.phoneChannels,
    fallbackPhone: input.phone ?? personFallbackPhone?.value ?? null,
    fallbackCountryIso2: input.phoneCountryIso2 ?? personFallbackPhone?.countryIso2 ?? geo.countryIso2
  });
  const emailChannels = normalizeClientEmailChannels({
    channels: legacyFromGeneralChannels.emailChannels,
    fallbackEmail: input.email ?? personFallbackEmail?.value ?? null
  });
  const primaryPhone = pickPrimaryPhoneChannel(phoneChannels);
  const primaryEmail = pickPrimaryEmailChannel(emailChannels);
  const phone = primaryPhone?.number ?? normalizeOptional(input.phone);
  const email = primaryEmail?.valueNormalized ?? normalizeOptional(input.email);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");

  const primaryGeneralPhone =
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL") ??
    null;
  const primaryGeneralEmail =
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL") ??
    null;
  const billingPhone = primaryGeneralPhone ? formatPhoneWithExtension(primaryGeneralPhone.value, primaryGeneralPhone.extension) : phone;
  const billingEmail = explicitBillingEmail ?? primaryGeneralEmail?.value ?? email;

  const institutionType = await prisma.clientCatalogItem.findFirst({
    where: { id: institutionTypeId, type: ClientCatalogType.INSTITUTION_TYPE, isActive: true },
    select: { id: true }
  });
  if (!institutionType) throw new Error("Tipo de institución inválido o inactivo.");

  const defaultStatusId = await resolveDefaultActiveStatusId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (logoAssetId) {
        const logoAsset = await tx.fileAsset.findUnique({
          where: { id: logoAssetId },
          select: {
            id: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true
          }
        });
        if (!logoAsset) throw new Error("Logo inválido.");
        const logoValidation = validateCompanyLogoAsset({
          mimeType: logoAsset.mimeType,
          sizeBytes: logoAsset.sizeBytes,
          storageKey: logoAsset.storageKey
        });
        if (!logoValidation.ok) throw new Error(logoValidation.error);
      }

      if (institutionCategoryId) {
        const category = await tx.clientCatalogItem.findFirst({
          where: {
            id: institutionCategoryId,
            type: ClientCatalogType.INSTITUTION_CATEGORY,
            isActive: true
          },
          select: { id: true }
        });
        if (!category) throw new Error("Régimen institucional inválido o inactivo.");
      }

      const institutionSecondaryCategories: Array<{ id: string; name: string }> = [];
      if (institutionCategorySecondaryIds.length) {
        for (const secondaryId of institutionCategorySecondaryIds) {
          if (!secondaryId || secondaryId === institutionCategoryId) continue;
          const category = await tx.clientCatalogItem.findFirst({
            where: {
              id: secondaryId,
              type: ClientCatalogType.INSTITUTION_CATEGORY,
              isActive: true
            },
            select: { id: true, name: true }
          });
          if (!category) throw new Error("Régimen institucional secundario inválido o inactivo.");
          institutionSecondaryCategories.push(category);
        }
      }

      const acquisition = await resolveAcquisitionInput(tx, {
        acquisitionSourceId: input.acquisitionSourceId,
        acquisitionDetailOptionId: input.acquisitionDetailOptionId,
        acquisitionOtherNote: input.acquisitionOtherNote
      });

      const reservedClientCode = await reserveNextClientCodeTx(tx, {
        tenantId,
        clientType: ClientProfileType.INSTITUTION
      });

      const created = await tx.clientProfile.create({
        data: {
          tenantId,
          clientCode: reservedClientCode.code,
          type: ClientProfileType.INSTITUTION,
          companyName,
          tradeName,
          institutionTypeId,
          institutionCategoryId,
          institutionIsPublic,
          institutionIsPayer,
          institutionIsGroupOrganizer,
          institutionIsSponsor,
          nit,
          address,
          city,
          department,
          country,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          acquisitionOtherNote: acquisition.otherNote,
          photoUrl: logoUrl,
          photoAssetId: logoAssetId,
          phone,
          email,
          statusId: defaultStatusId
        },
        select: { id: true }
      });

      const countryId = geo.geoCountryId ?? (await resolveCountryIdByName(tx, country));
      await createPrimaryClientIdentifier(tx, {
        clientId: created.id,
        value: nit,
        countryId,
        preferredDocumentTypeTokens: ["NIT", "RFC", "RUC", "CUIT", "TAX_ID"]
      });

      await createClientContactChannelsSafe(tx, {
        clientId: created.id,
        phoneChannels,
        emailChannels,
        fallbackPhone: phone,
        fallbackCountryIso2: input.phoneCountryIso2 ?? geo.countryIso2
      });

      if (normalizedContactPeopleWithLegacy.length) {
        for (let index = 0; index < normalizedContactPeopleWithLegacy.length; index += 1) {
          const person = normalizedContactPeopleWithLegacy[index];
          const primaryPersonPhone = person.phones.find((row) => row.isPrimary) ?? person.phones[0] ?? null;
          const primaryPersonEmail = person.emails.find((row) => row.isPrimary) ?? person.emails[0] ?? null;
          const role = buildLegacyCompanyPersonRole({
            department: person.department,
            role: person.role
          });
          const name = `${person.firstName} ${person.lastName}`.trim();

          await tx.clientContact.create({
            data: supportsContactExtendedColumns
              ? {
                  clientId: created.id,
                  name,
                  relationType: "WORK",
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isEmergencyContact: false,
                  isPrimary: index === 0
                }
              : {
                  clientId: created.id,
                  name,
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isPrimary: index === 0
                }
          });
        }
      }

      const companyCoreResult = await safeCreateCompanyCoreWithContacts(tx, {
        tenantId,
        clientProfileId: created.id,
        kind: CompanyKind.INSTITUTION,
        legalName: companyName,
        tradeName,
        taxId: nit,
        website,
        billingEmail,
        billingPhone,
        preferredCurrencyCode,
        acceptedCurrencyCodes,
        commercialNote,
        companySizeRange: null,
        legalFormId: null,
        legalFormOther: null,
        activityPrimaryId: institutionCategoryId,
        activitySecondaryIds: institutionSecondaryCategories.map((item) => item.id),
        legacyPbxExtensionNotes,
        metadataExtra: {
          institutionTypeId,
          institutionRegimePrimaryId: institutionCategoryId,
          institutionRegimeSecondaryIds: institutionSecondaryCategories.map((item) => item.id),
          institutionRegimeSecondaryNames: institutionSecondaryCategories.map((item) => item.name),
          institutionSector
        },
        generalChannels: normalizedGeneralChannels,
        contactPeople: normalizedContactPeopleWithLegacy
      });

      const referralResult = await createReferralIfNeeded(tx, {
        referredClientId: created.id,
        referredByClientId: input.referredByClientId,
        requiresReferral: acquisition.requiresReferral
      });

      await tx.clientLocation.create({
        data: {
          clientId: created.id,
          type: ClientLocationType.MAIN,
          address,
          addressLine1: address,
          city,
          department,
          country,
          geoCountryId: geo.geoCountryId,
          geoAdmin1Id: geo.geoAdmin1Id,
          geoAdmin2Id: geo.geoAdmin2Id,
          geoAdmin3Id: geo.geoAdmin3Id,
          freeState: geoFreeState,
          freeCity: geoFreeCity,
          postalCode: geoPostalCode,
          isPrimary: true
        }
      });

      if (resolvedBranchLocations.length) {
        await tx.clientLocation.createMany({
          data: resolvedBranchLocations.map((branch) => ({
            clientId: created.id,
            type: ClientLocationType.BRANCH,
            name: branch.name,
            label: branch.name,
            code: `SUC_${String(branch.rowNumber).padStart(2, "0")}`,
            address: branch.address,
            addressLine1: branch.address,
            city: branch.city,
            department: branch.department,
            country: branch.country,
            geoCountryId: branch.geoCountryId,
            geoAdmin1Id: branch.geoAdmin1Id,
            geoAdmin2Id: branch.geoAdmin2Id,
            geoAdmin3Id: branch.geoAdmin3Id,
            freeState: branch.freeState,
            freeCity: branch.freeCity,
            postalCode: branch.postalCode,
            isPrimary: false,
            metadata: {
              source: "clients.institution.new-form.v2",
              sequence: branch.rowNumber
            }
          }))
        });
      }

      await logClientAuditTx(tx, {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        clientId: created.id,
        action: "CLIENT_CREATED",
        metadata: {
          type: "INSTITUTION",
          clientCode: reservedClientCode.code,
          institutionTypeId,
          institutionCategoryId,
          institutionIsPublic,
          institutionIsPayer,
          institutionIsGroupOrganizer,
          institutionIsSponsor,
          institutionSector,
          institutionCategorySecondaryIds: institutionSecondaryCategories.map((item) => item.id),
          tradeName,
          website,
          logoUrl,
          logoAssetId,
          logoOriginalName,
          branchCount: resolvedBranchLocations.length,
          companyCoreId: companyCoreResult.companyId,
          generalChannelsCount: normalizedGeneralChannels.length,
          contactPeopleCount: normalizedContactPeopleWithLegacy.length,
          preferredCurrencyCode,
          acceptedCurrencyCodes,
          legacyPbxExtensionNotes,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionSourceCode: acquisition.sourceCode,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          referredByClientId: referralResult.referrerClientId
        }
      });

      return created;
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/instituciones");
    revalidatePath(`/admin/clientes/${result.id}`);
    return { id: result.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cliente con ese DPI/NIT.");
    throw err;
  }
}
export async function actionCreateInsurerClient(input: {
  name?: string;
  legalName?: string;
  tradeName?: string;
  nit: string;
  website?: string;
  logoUrl?: string;
  logoAssetId?: string;
  logoOriginalName?: string;
  address: string;
  city?: string;
  department?: string;
  country?: string;
  geoCountryId?: string;
  geoAdmin1Id?: string;
  geoAdmin2Id?: string;
  geoAdmin3Id?: string;
  geoPostalCode?: string;
  geoFreeState?: string;
  geoFreeCity?: string;
  acquisitionSourceId?: string;
  acquisitionDetailOptionId?: string;
  acquisitionOtherNote?: string;
  referredByClientId?: string;
  preferredCurrencyCode?: string;
  acceptedCurrencyCodes?: string[];
  billingEmail?: string;
  commercialNote?: string;
  companySizeRange?: string;
  legalForm?: string;
  legalFormOther?: string;
  economicActivityId?: string;
  insurerLinePrimaryCode?: string;
  insurerLineSecondaryCodes?: string[];
  insurerTypeId?: string;
  insurerScope?: "local" | "regional" | "internacional" | string;
  insurerCode?: string;
  hasActiveAgreement?: boolean;
  agreementStartDate?: string;
  agreementEndDate?: string;
  billingMethod?: "direct" | "reimbursement" | "mixed" | string;
  typicalPaymentTermsDays?: number | string;
  authorizationPortalUrl?: string;
  authorizationEmail?: string;
  claimsEmail?: string;
  providerSupportPhone?: string;
  providerSupportWhatsApp?: string;
  insurerCutoffMode?: InsurerBillingCutoffMode | null;
  insurerCutoffDay?: number | null;
  insurerBillingType?: InsurerBillingType | null;
  insurerDiscountRules?: Prisma.InputJsonValue;
  insurerManualRulePriority?: boolean;
  phone?: string;
  phoneCountryIso2?: string;
  email?: string;
  phones?: ClientPhoneChannelInput[];
  emails?: ClientEmailChannelInput[];
  generalChannels?: CompanyGeneralChannelInput[];
  contactPeople?: CompanyPersonContactInput[];
  useSameAddressForFiscal?: boolean;
  branches?: CompanyBranchDraftInput[];
}) {
  const user = await requireClientCreatorUser();
  const tenantId = tenantIdFromUser(user);
  const supportsContactExtendedColumns = await safeSupportsClientContactExtendedColumns("clients.actions.createInsurer.contacts");
  const usesNewContactPayload = Array.isArray(input.generalChannels) || Array.isArray(input.contactPeople);
  const contactDirectories = await getClientContactDirectories(tenantId, { includeInactive: true });
  const pbxCategoryOptions = contactDirectories.pbxCategories.map((item) => ({
    value: item.code.trim() || item.id.trim(),
    label: item.name,
    isActive: item.isActive
  }));
  const insurerLineOptions = contactDirectories.insurerLines.map((item) => ({
    value: item.code.trim() || item.id.trim(),
    label: item.name,
    isActive: item.isActive
  }));
  const insurerLineCodes = new Set(insurerLineOptions.map((item) => item.value).filter(Boolean));

  const companyName = normalizeRequired(input.legalName ?? input.name, "Razón social requerida.");
  const tradeName = normalizeOptional(input.tradeName);
  const nit = normalizeRequired(input.nit, "Documento fiscal requerido.");
  const websiteSelection = normalizeCompanyWebsite(input.website);
  if (websiteSelection.error) throw new Error(websiteSelection.error);
  const website = websiteSelection.value;
  const logoAssetId = normalizeOptional(input.logoAssetId);
  const logoUrl = normalizeOptional(input.logoUrl) ?? (logoAssetId ? `/api/files/${logoAssetId}` : null);
  const logoOriginalName = normalizeOptional(input.logoOriginalName);
  if (logoUrl && !logoAssetId) throw new Error("Logo inválido.");
  const address = normalizeRequired(input.address, "Dirección requerida.");
  const geoPostalCode = normalizeOptional(input.geoPostalCode);
  const geoFreeState = normalizeOptional(input.geoFreeState);
  const geoFreeCity = normalizeOptional(input.geoFreeCity);
  const geo = await resolveGeoSelection({
    geoCountryId: input.geoCountryId,
    geoAdmin1Id: input.geoAdmin1Id,
    geoAdmin2Id: input.geoAdmin2Id,
    geoAdmin3Id: input.geoAdmin3Id
  });
  const country = normalizeOptional(input.country) ?? geo.countryName;
  const department = normalizeOptional(input.department) ?? geo.admin1Name ?? geoFreeState;
  const city = normalizeOptional(input.city) ?? geo.admin2Name ?? geoFreeCity;
  if (!country) throw new Error("Selecciona país.");
  if (!department) throw new Error("Selecciona departamento.");
  if (!city) throw new Error("Selecciona municipio.");

  const companySizeRange = normalizeOptional(input.companySizeRange);
  if (companySizeRange && !isCompanyEmployeeRangeId(companySizeRange)) {
    throw new Error("Tamaño de empresa inválido.");
  }

  const legalForm = normalizeOptional(input.legalForm);
  const legalFormOther = normalizeOptional(input.legalFormOther);
  if (usesNewContactPayload && !legalForm) throw new Error("Forma jurídica requerida.");
  if (legalForm && !isCompanyLegalFormId(legalForm)) throw new Error("Forma jurídica inválida.");
  if (requiresCompanyLegalFormOther(legalForm) && !legalFormOther) throw new Error("Forma jurídica: debes especificar el detalle para 'Otro'.");
  if (legalFormOther && legalFormOther.length > 60) throw new Error("Forma jurídica: el detalle no puede exceder 60 caracteres.");

  const legacyEconomicActivitySelection = normalizeOptional(input.economicActivityId);
  let insurerLinePrimaryCode = normalizeOptional(input.insurerLinePrimaryCode);
  if (!insurerLinePrimaryCode && legacyEconomicActivitySelection) {
    insurerLinePrimaryCode = insurerLineCodes.has("otro") ? "otro" : null;
  }
  const insurerLineSelection = normalizeInsurerLineSelection({
    primaryCode: insurerLinePrimaryCode,
    secondaryCodes: Array.isArray(input.insurerLineSecondaryCodes) ? input.insurerLineSecondaryCodes : []
  });
  insurerLinePrimaryCode = insurerLineSelection.primaryCode;
  const insurerLineSecondaryCodes = insurerLineSelection.secondaryCodes;
  if (usesNewContactPayload && !insurerLinePrimaryCode) {
    throw new Error("Ramo principal del seguro requerido.");
  }
  if (insurerLinePrimaryCode && insurerLineCodes.size > 0 && !insurerLineCodes.has(insurerLinePrimaryCode)) {
    throw new Error("Ramo principal inválido o inactivo.");
  }
  for (const secondaryCode of insurerLineSecondaryCodes) {
    if (!insurerLineCodes.has(secondaryCode)) {
      throw new Error("Ramo adicional inválido o inactivo.");
    }
  }

  const insurerTypeId = normalizeRequired(input.insurerTypeId, "Tipo de aseguradora requerido.");
  const insurerScopeRaw = normalizeOptional(input.insurerScope)?.toLowerCase() ?? null;
  if (insurerScopeRaw && !["local", "regional", "internacional"].includes(insurerScopeRaw)) {
    throw new Error("Alcance de aseguradora inválido.");
  }
  const insurerScope = insurerScopeRaw as "local" | "regional" | "internacional" | null;
  const insurerCode = normalizeOptional(input.insurerCode);
  const hasActiveAgreement = Boolean(input.hasActiveAgreement);
  const agreementStartDate = parseOptionalDate(input.agreementStartDate);
  const agreementEndDate = parseOptionalDate(input.agreementEndDate);
  if (agreementStartDate && agreementEndDate && agreementEndDate.getTime() < agreementStartDate.getTime()) {
    throw new Error("La fecha fin de convenio no puede ser anterior al inicio.");
  }
  const billingMethodRaw = normalizeOptional(input.billingMethod)?.toLowerCase() ?? null;
  if (billingMethodRaw && !["direct", "reimbursement", "mixed"].includes(billingMethodRaw)) {
    throw new Error("Método de facturación inválido.");
  }
  const billingMethod = billingMethodRaw as "direct" | "reimbursement" | "mixed" | null;
  const typicalPaymentTermsDaysRaw =
    typeof input.typicalPaymentTermsDays === "number" ? input.typicalPaymentTermsDays : Number(normalizeOptional(String(input.typicalPaymentTermsDays ?? "")) ?? NaN);
  const typicalPaymentTermsDays = Number.isFinite(typicalPaymentTermsDaysRaw) ? Math.floor(typicalPaymentTermsDaysRaw) : null;
  if (typicalPaymentTermsDays !== null && (typicalPaymentTermsDays < 0 || typicalPaymentTermsDays > 365)) {
    throw new Error("Días de pago inválidos (0-365).");
  }
  const authorizationPortalSelection = normalizeCompanyWebsite(input.authorizationPortalUrl);
  if (authorizationPortalSelection.error) throw new Error(authorizationPortalSelection.error);
  const authorizationPortalUrl = authorizationPortalSelection.value;
  const authorizationEmail = normalizeOptional(input.authorizationEmail);
  if (authorizationEmail && !isValidEmail(authorizationEmail)) throw new Error("Correo de autorizaciones inválido.");
  const claimsEmail = normalizeOptional(input.claimsEmail);
  if (claimsEmail && !isValidEmail(claimsEmail)) throw new Error("Correo de siniestros inválido.");
  const providerSupportPhone = normalizeOptional(input.providerSupportPhone);
  const providerSupportWhatsApp = normalizeOptional(input.providerSupportWhatsApp);

  const currencySelection = resolveCurrencyPreferenceSelection({
    preferredCurrencyCode: input.preferredCurrencyCode,
    acceptedCurrencyCodes: input.acceptedCurrencyCodes
  });
  if (currencySelection.invalidPreferredCurrencyCode) throw new Error("Moneda preferida inválida.");
  if (currencySelection.invalidAcceptedCurrencyCodes.length > 0) throw new Error("Monedas aceptadas inválidas.");
  const preferredCurrencyCode = currencySelection.preferredCurrencyCode;
  const acceptedCurrencyCodes = currencySelection.acceptedCurrencyCodes;
  const explicitBillingEmail = normalizeOptional(input.billingEmail);
  if (explicitBillingEmail && !isValidEmail(explicitBillingEmail)) {
    throw new Error("Correo de facturación inválido.");
  }
  const commercialNote = normalizeOptional(input.commercialNote);

  const normalizedGeneralChannels = usesNewContactPayload
    ? normalizeCompanyGeneralChannels(input.generalChannels, { pbxCategoryOptions })
    : [];
  const normalizedContactPeople = usesNewContactPayload
    ? normalizeCompanyPersonContacts(input.contactPeople, { pbxChannels: normalizedGeneralChannels })
    : [];
  const legacyPbxExtensionNotes = usesNewContactPayload
    ? collectLegacyPbxExtensions({ generalChannels: input.generalChannels, pbxCategoryOptions })
    : [];
  const normalizedContactPeopleWithLegacy =
    legacyPbxExtensionNotes.length > 0 && normalizedContactPeople.length > 0
      ? normalizedContactPeople.map((person, index) => {
          if (index !== 0) return person;
          const legacyBlock = legacyPbxExtensionNotes.join(" | ");
          const notes = [person.notes, legacyBlock].filter(Boolean).join(" | ");
          return { ...person, notes };
        })
      : normalizedContactPeople;

  const normalizedBranchDrafts = normalizeCompanyBranchDrafts(input.branches);
  for (let index = 0; index < normalizedBranchDrafts.length; index += 1) {
    const validationError = validateCompanyBranchDraft({
      branch: normalizedBranchDrafts[index]!,
      rowNumber: index + 1
    });
    if (validationError) throw new Error(validationError);
  }

  const resolvedBranchLocations = await Promise.all(
    normalizedBranchDrafts.map(async (branch, index) => {
      const branchGeo = await resolveGeoSelection({
        geoCountryId: branch.geoCountryId,
        geoAdmin1Id: branch.geoAdmin1Id,
        geoAdmin2Id: branch.geoAdmin2Id,
        geoAdmin3Id: branch.geoAdmin3Id
      });
      const branchCountry = branch.country ?? branchGeo.countryName;
      const branchDepartment = branch.department ?? branchGeo.admin1Name ?? branch.geoFreeState;
      const branchCity = branch.city ?? branchGeo.admin2Name ?? branch.geoFreeCity;
      if (!branchCountry) throw new Error(`Sucursal #${index + 1}: selecciona país.`);
      if (!branchDepartment) throw new Error(`Sucursal #${index + 1}: selecciona departamento.`);
      if (!branchCity) throw new Error(`Sucursal #${index + 1}: selecciona municipio.`);

      return {
        rowNumber: index + 1,
        name: branch.name,
        address: branch.address ?? "",
        country: branchCountry,
        department: branchDepartment,
        city: branchCity,
        geoCountryId: branchGeo.geoCountryId,
        geoAdmin1Id: branchGeo.geoAdmin1Id,
        geoAdmin2Id: branchGeo.geoAdmin2Id,
        geoAdmin3Id: branchGeo.geoAdmin3Id,
        freeState: branch.geoFreeState,
        freeCity: branch.geoFreeCity,
        postalCode: branch.geoPostalCode
      };
    })
  );

  if (usesNewContactPayload) {
    const generalDraftsError = validateCompanyGeneralChannelDrafts(input.generalChannels, {
      contactPeople: input.contactPeople,
      pbxCategoryOptions
    });
    if (generalDraftsError) throw new Error(generalDraftsError);

    const contactDraftsError = validateCompanyContactPeopleDrafts(input.contactPeople, {
      generalChannels: input.generalChannels
    });
    if (contactDraftsError) throw new Error(contactDraftsError);

    const generalChannelsError = validateCompanyGeneralChannels(normalizedGeneralChannels);
    if (generalChannelsError) throw new Error(generalChannelsError);

    const contactPeopleError = validateCompanyContactPeople(normalizedContactPeopleWithLegacy, {
      generalChannels: normalizedGeneralChannels
    });
    if (contactPeopleError) throw new Error(contactPeopleError);

    if (!hasAtLeastOneCompanyChannel({ generalChannels: normalizedGeneralChannels, contactPeople: normalizedContactPeopleWithLegacy })) {
      throw new Error("Debes registrar al menos un canal general o un canal dentro de personas de contacto.");
    }
  }

  const legacyFromGeneralChannels = usesNewContactPayload
    ? mapCompanyGeneralChannelsToLegacy({ channels: normalizedGeneralChannels })
    : { phoneChannels: input.phones ?? [], emailChannels: input.emails ?? [] };
  const personFallbackPhone = usesNewContactPayload ? pickFirstPersonPhone(normalizedContactPeopleWithLegacy) : null;
  const personFallbackEmail = usesNewContactPayload ? pickFirstPersonEmail(normalizedContactPeopleWithLegacy) : null;

  const insurerCutoffMode = input.insurerCutoffMode ?? null;
  const insurerCutoffDay = input.insurerCutoffDay ?? null;
  const insurerBillingType = input.insurerBillingType ?? null;
  const insurerManualRulePriority = Boolean(input.insurerManualRulePriority);
  const insurerDiscountRules = input.insurerDiscountRules ?? null;
  if (insurerCutoffMode === InsurerBillingCutoffMode.DAY_OF_MONTH) {
    if (!insurerCutoffDay || insurerCutoffDay < 1 || insurerCutoffDay > 31) {
      throw new Error("El día de corte debe estar entre 1 y 31.");
    }
  }
  const phoneChannels = normalizeClientPhoneChannels({
    channels: legacyFromGeneralChannels.phoneChannels,
    fallbackPhone: input.phone ?? personFallbackPhone?.value ?? null,
    fallbackCountryIso2: input.phoneCountryIso2 ?? personFallbackPhone?.countryIso2 ?? geo.countryIso2
  });
  const emailChannels = normalizeClientEmailChannels({
    channels: legacyFromGeneralChannels.emailChannels,
    fallbackEmail: input.email ?? personFallbackEmail?.value ?? null
  });
  const primaryPhone = pickPrimaryPhoneChannel(phoneChannels);
  const primaryEmail = pickPrimaryEmailChannel(emailChannels);
  const phone = primaryPhone?.number ?? normalizeOptional(input.phone);
  const email = primaryEmail?.valueNormalized ?? normalizeOptional(input.email);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");

  const primaryGeneralPhone =
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind !== "EMAIL") ??
    null;
  const primaryGeneralEmail =
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL" && row.isPrimary) ??
    normalizedGeneralChannels.find((row) => row.kind === "EMAIL") ??
    null;
  const billingPhone = primaryGeneralPhone ? formatPhoneWithExtension(primaryGeneralPhone.value, primaryGeneralPhone.extension) : phone;
  const billingEmail = explicitBillingEmail ?? primaryGeneralEmail?.value ?? email;

  const defaultStatusId = await resolveDefaultActiveStatusId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (logoAssetId) {
        const logoAsset = await tx.fileAsset.findUnique({
          where: { id: logoAssetId },
          select: {
            id: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true
          }
        });
        if (!logoAsset) throw new Error("Logo inválido.");
        const logoValidation = validateCompanyLogoAsset({
          mimeType: logoAsset.mimeType,
          sizeBytes: logoAsset.sizeBytes,
          storageKey: logoAsset.storageKey
        });
        if (!logoValidation.ok) throw new Error(logoValidation.error);
      }

      const acquisition = await resolveAcquisitionInput(tx, {
        acquisitionSourceId: input.acquisitionSourceId,
        acquisitionDetailOptionId: input.acquisitionDetailOptionId,
        acquisitionOtherNote: input.acquisitionOtherNote
      });

      const reservedClientCode = await reserveNextClientCodeTx(tx, {
        tenantId,
        clientType: ClientProfileType.INSURER
      });

      const created = await tx.clientProfile.create({
        data: {
          tenantId,
          clientCode: reservedClientCode.code,
          type: ClientProfileType.INSURER,
          companyName,
          tradeName,
          nit,
          address,
          city,
          department,
          country,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          acquisitionOtherNote: acquisition.otherNote,
          photoUrl: logoUrl,
          photoAssetId: logoAssetId,
          insurerCutoffMode,
          insurerCutoffDay: insurerCutoffMode === InsurerBillingCutoffMode.DAY_OF_MONTH ? insurerCutoffDay : null,
          insurerBillingType,
          insurerDiscountRules: insurerDiscountRules ?? undefined,
          insurerManualRulePriority,
          phone,
          email,
          statusId: defaultStatusId
        },
        select: { id: true }
      });

      const countryId = geo.geoCountryId ?? (await resolveCountryIdByName(tx, country));
      await createPrimaryClientIdentifier(tx, {
        clientId: created.id,
        value: nit,
        countryId,
        preferredDocumentTypeTokens: ["NIT", "RFC", "RUC", "CUIT", "TAX_ID"]
      });

      await createClientContactChannelsSafe(tx, {
        clientId: created.id,
        phoneChannels,
        emailChannels,
        fallbackPhone: phone,
        fallbackCountryIso2: input.phoneCountryIso2 ?? geo.countryIso2
      });

      if (normalizedContactPeopleWithLegacy.length) {
        for (let index = 0; index < normalizedContactPeopleWithLegacy.length; index += 1) {
          const person = normalizedContactPeopleWithLegacy[index];
          const primaryPersonPhone = person.phones.find((row) => row.isPrimary) ?? person.phones[0] ?? null;
          const primaryPersonEmail = person.emails.find((row) => row.isPrimary) ?? person.emails[0] ?? null;
          const role = buildLegacyCompanyPersonRole({
            department: person.department,
            role: person.role
          });
          const name = `${person.firstName} ${person.lastName}`.trim();

          await tx.clientContact.create({
            data: supportsContactExtendedColumns
              ? {
                  clientId: created.id,
                  name,
                  relationType: "WORK",
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isEmergencyContact: false,
                  isPrimary: index === 0
                }
              : {
                  clientId: created.id,
                  name,
                  role,
                  phone: primaryPersonPhone ? formatPhoneWithExtension(primaryPersonPhone.value, primaryPersonPhone.extension) : null,
                  email: primaryPersonEmail?.value ?? null,
                  isPrimary: index === 0
                }
          });
        }
      }

      const companyCoreResult = await safeCreateCompanyCoreWithContacts(tx, {
        tenantId,
        clientProfileId: created.id,
        kind: CompanyKind.INSURER,
        legalName: companyName,
        tradeName,
        taxId: nit,
        website,
        billingEmail,
        billingPhone,
        preferredCurrencyCode,
        acceptedCurrencyCodes,
        commercialNote,
        companySizeRange,
        legalFormId: legalForm,
        legalFormOther,
        activityPrimaryId: null,
        activitySecondaryIds: [],
        legacyPbxExtensionNotes,
        metadataExtra: {
          insurerTypeId,
          insurerScope,
          insurerCode,
          hasActiveAgreement,
          agreementStartDate,
          agreementEndDate,
          billingMethod,
          typicalPaymentTermsDays,
          authorizationPortalUrl,
          authorizationEmail,
          claimsEmail,
          providerSupportPhone,
          providerSupportWhatsApp,
          insurerLinePrimaryCode,
          insurerLineSecondaryCodes,
          logoUrl,
          logoAssetId,
          logoOriginalName,
          useSameAddressForFiscal: Boolean(input.useSameAddressForFiscal),
          legacyEconomicActivityId: legacyEconomicActivitySelection
        },
        generalChannels: normalizedGeneralChannels,
        contactPeople: normalizedContactPeopleWithLegacy
      });

      const referralResult = await createReferralIfNeeded(tx, {
        referredClientId: created.id,
        referredByClientId: input.referredByClientId,
        requiresReferral: acquisition.requiresReferral
      });

      if (address) {
        await tx.clientLocation.create({
          data: {
            clientId: created.id,
            type: ClientLocationType.MAIN,
            address,
            addressLine1: address,
            city,
            department,
            country,
            geoCountryId: geo.geoCountryId,
            geoAdmin1Id: geo.geoAdmin1Id,
            geoAdmin2Id: geo.geoAdmin2Id,
            geoAdmin3Id: geo.geoAdmin3Id,
            freeState: geoFreeState,
            freeCity: geoFreeCity,
            postalCode: geoPostalCode,
            isPrimary: true
          }
        });
      }

      if (resolvedBranchLocations.length) {
        await tx.clientLocation.createMany({
          data: resolvedBranchLocations.map((branch) => ({
            clientId: created.id,
            type: ClientLocationType.BRANCH,
            name: branch.name,
            label: branch.name,
            code: `SUC_${String(branch.rowNumber).padStart(2, "0")}`,
            address: branch.address,
            addressLine1: branch.address,
            city: branch.city,
            department: branch.department,
            country: branch.country,
            geoCountryId: branch.geoCountryId,
            geoAdmin1Id: branch.geoAdmin1Id,
            geoAdmin2Id: branch.geoAdmin2Id,
            geoAdmin3Id: branch.geoAdmin3Id,
            freeState: branch.freeState,
            freeCity: branch.freeCity,
            postalCode: branch.postalCode,
            isPrimary: false,
            metadata: {
              source: "clients.insurer.new-form.v2",
              sequence: branch.rowNumber
            }
          }))
        });
      }

      await logClientAuditTx(tx, {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        clientId: created.id,
        action: "CLIENT_CREATED",
        metadata: {
          type: "INSURER",
          clientCode: reservedClientCode.code,
          acquisitionSourceId: acquisition.sourceId,
          acquisitionSourceCode: acquisition.sourceCode,
          acquisitionDetailOptionId: acquisition.detailOptionId,
          referredByClientId: referralResult.referrerClientId,
          insurerCutoffMode,
          insurerCutoffDay: insurerCutoffMode === InsurerBillingCutoffMode.DAY_OF_MONTH ? insurerCutoffDay : null,
          insurerBillingType,
          insurerTypeId,
          insurerScope,
          insurerCode,
          hasActiveAgreement,
          agreementStartDate,
          agreementEndDate,
          billingMethod,
          typicalPaymentTermsDays,
          authorizationPortalUrl,
          authorizationEmail,
          claimsEmail,
          providerSupportPhone,
          providerSupportWhatsApp,
          insurerLinePrimaryCode,
          insurerLineSecondaryCodes,
          website,
          logoUrl,
          logoAssetId,
          logoOriginalName,
          companyCoreId: companyCoreResult.companyId,
          branchCount: resolvedBranchLocations.length,
          generalChannelsCount: normalizedGeneralChannels.length,
          contactPeopleCount: normalizedContactPeopleWithLegacy.length
        }
      });

      return created;
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/aseguradoras");
    revalidatePath(`/admin/clientes/${result.id}`);
    return { id: result.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cliente con ese DPI/NIT.");
    throw err;
  }
}

export async function actionSearchClientProfiles(input: {
  q: string;
  types: ClientProfileType[];
  limit?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);

  const q = input.q.trim();
  if (q.length < 2) return { items: [] as Array<{ id: string; type: ClientProfileType; label: string }> };

  const types =
    Array.isArray(input.types) && input.types.length
      ? Array.from(new Set(input.types))
      : [ClientProfileType.COMPANY, ClientProfileType.INSTITUTION, ClientProfileType.INSURER];
  if (!types.length) return { items: [] as Array<{ id: string; type: ClientProfileType; label: string }> };
  const limit = Math.min(Math.max(input.limit ?? 15, 5), 25);
  const includePerson = types.includes(ClientProfileType.PERSON);
  const insensitiveMode = Prisma.QueryMode.insensitive;

  const rows = await prisma.clientProfile.findMany({
    where: {
      tenantId,
      deletedAt: null,
      type: { in: types },
      OR: [
        { clientCode: { contains: q, mode: insensitiveMode } },
        { companyName: { contains: q, mode: insensitiveMode } },
        { tradeName: { contains: q, mode: insensitiveMode } },
        { nit: { contains: q, mode: insensitiveMode } },
        { email: { contains: q, mode: insensitiveMode } },
        { phone: { contains: q, mode: insensitiveMode } },
        ...(includePerson
          ? [
              { firstName: { contains: q, mode: insensitiveMode } },
              { middleName: { contains: q, mode: insensitiveMode } },
              { lastName: { contains: q, mode: insensitiveMode } },
              { secondLastName: { contains: q, mode: insensitiveMode } },
              { dpi: { contains: q, mode: insensitiveMode } }
            ]
          : [])
      ]
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      clientCode: true,
      type: true,
      companyName: true,
      tradeName: true,
      nit: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      dpi: true
    }
  });

  return {
    items: rows.map((row) => {
      return {
        id: row.id,
        type: row.type,
        label: formatClientLabel(row)
      };
    })
  };
}

export async function actionSearchTenantUsers(input: { q: string; limit?: number }) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const q = input.q.trim();
  if (q.length < 2) return { items: [] as Array<{ id: string; name: string; email: string }> };
  const limit = Math.min(Math.max(input.limit ?? 15, 5), 25);

  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ tenantId }, ...(tenantId === "global" ? [{ tenantId: null }] : [])],
      AND: [
        {
          OR: [{ name: { contains: q, mode: Prisma.QueryMode.insensitive } }, { email: { contains: q, mode: Prisma.QueryMode.insensitive } }]
        }
      ]
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name?.trim() || row.email,
      email: row.email
    }))
  };
}

export async function actionListCallingCodeOptions(input?: {
  q?: string;
  includeInactive?: boolean;
  limit?: number;
}) {
  await requireAdminUser();
  return getCallingCodeOptions({
    q: input?.q,
    includeInactive: input?.includeInactive,
    limit: input?.limit
  });
}

export async function actionListClientAcquisitionSources(input?: { includeInactive?: boolean }) {
  await requireAdminUser();
  const includeInactive = Boolean(input?.includeInactive);
  const rows = await prisma.clientAcquisitionSource.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      isActive: true
    }
  });

  return { items: rows };
}

export async function actionListClientAcquisitionDetailOptions(input: { sourceId: string; includeInactive?: boolean }) {
  await requireAdminUser();
  const sourceId = normalizeRequired(input.sourceId, "Canal requerido.");
  const includeInactive = Boolean(input.includeInactive);
  const rows = await prisma.clientAcquisitionDetailOption.findMany({
    where: {
      sourceId,
      ...(includeInactive ? {} : { isActive: true })
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      sourceId: true,
      code: true,
      name: true,
      isActive: true
    }
  });

  return { items: rows };
}

export async function actionListClientCatalogItems(input: { type: ClientCatalogType; includeInactive?: boolean }) {
  await requireAdminUser();
  const rows = await prisma.clientCatalogItem.findMany({
    where: {
      type: input.type,
      ...(input.includeInactive ? {} : { isActive: true })
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true
    }
  });

  return { items: rows };
}

export async function actionListClientContactDirectories(input?: {
  includeInactive?: boolean;
  q?: string;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  return getClientContactDirectories(tenantId, {
    includeInactive: input?.includeInactive,
    q: input?.q
  });
}

export async function actionCheckPersonDpi(input: { dpi: string; excludeClientId?: string }) {
  await requireAdminUser();

  const dpi = normalizeRequired(input.dpi, "DPI requerido.");
  const parsed = dpiSchema.safeParse(dpi);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "DPI inválido.");

  const excludeClientId = normalizeOptional(input.excludeClientId);
  const existing = await prisma.clientProfile.findFirst({
    where: {
      type: ClientProfileType.PERSON,
      dpi,
      deletedAt: null,
      ...(excludeClientId ? { id: { not: excludeClientId } } : {})
    },
    select: {
      id: true,
      type: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      companyName: true,
      tradeName: true,
      dpi: true,
      nit: true
    }
  });

  return {
    exists: Boolean(existing),
    clientId: existing?.id ?? null,
    label: existing ? formatClientLabel(existing) : null
  };
}

export async function actionListPersonIdentityDocumentTypes(input?: { countryId?: string }) {
  await requireAdminUser();

  const countryId = normalizeOptional(input?.countryId);
  const countryIso2 = await resolveCountryIso2ById(prisma, countryId);
  const items = await listActiveIdentityDocumentOptions(prisma, countryIso2);

  return {
    countryIso2,
    items
  };
}

export async function actionCheckPersonIdentityDocument(input: {
  value?: string;
  documentTypeId?: string;
  countryId?: string;
  excludeClientId?: string;
}) {
  await requireAdminUser();

  const countryIso2 = await resolveCountryIso2ById(prisma, input.countryId);
  const options = await listActiveIdentityDocumentOptions(prisma, countryIso2);
  const selectedOption = normalizeIdentityDocumentSelection({
    options,
    identityDocumentTypeId: input.documentTypeId
  });
  if (!selectedOption) {
    throw new Error("No hay tipos de documento de identidad disponibles.");
  }
  if (countryIso2 === "GT" && !["DPI", "PASSPORT"].includes(selectedOption.code)) {
    throw new Error("Para Guatemala solo se permite DPI o Pasaporte.");
  }

  const validation = validateIdentityDocumentValue({
    value: input.value,
    documentCode: selectedOption?.code,
    documentName: selectedOption?.name,
    optional: selectedOption?.optional
  });
  if (!validation.ok) {
    throw new Error(validation.error ?? "Documento inválido.");
  }

  if (!validation.normalized || !validation.value) {
    return {
      exists: false,
      clientId: null,
      label: null,
      optionalSkipped: true,
      selected: selectedOption
        ? {
            id: selectedOption.id,
            name: selectedOption.name,
            code: selectedOption.code,
            sensitive: selectedOption.sensitive,
            optional: selectedOption.optional
          }
        : null
    };
  }

  const excludeClientId = normalizeOptional(input.excludeClientId);
  const hasCatalogDocumentType = selectedOption?.source === "catalog" && !isFallbackDocumentTypeId(selectedOption.id);
  const existingIdentifier = await prisma.clientIdentifier.findFirst({
    where: {
      valueNormalized: validation.normalized,
      isActive: true,
      ...(hasCatalogDocumentType ? { documentTypeId: selectedOption.id } : {}),
      client: {
        deletedAt: null,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {})
      }
    },
    select: {
      client: {
        select: {
          id: true,
          type: true,
          firstName: true,
          middleName: true,
          lastName: true,
          secondLastName: true,
          companyName: true,
          tradeName: true,
          dpi: true,
          nit: true
        }
      }
    }
  });

  let existingClient = existingIdentifier?.client ?? null;
  if (!existingClient && !selectedOption?.sensitive) {
    const maybeLegacy = await prisma.clientProfile.findFirst({
      where: {
        type: ClientProfileType.PERSON,
        dpi: validation.value,
        deletedAt: null,
        ...(excludeClientId ? { id: { not: excludeClientId } } : {})
      },
      select: {
        id: true,
        type: true,
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        companyName: true,
        tradeName: true,
        dpi: true,
        nit: true
      }
    });
    existingClient = maybeLegacy ?? null;
  }

  return {
    exists: Boolean(existingClient),
    clientId: existingClient?.id ?? null,
    label: existingClient ? formatClientLabel(existingClient) : null,
    optionalSkipped: false,
    selected: selectedOption
      ? {
          id: selectedOption.id,
          name: selectedOption.name,
          code: selectedOption.code,
          sensitive: selectedOption.sensitive,
          optional: selectedOption.optional
        }
      : null
  };
}

export async function actionSearchGeoCountries(input: { q?: string; limit?: number; onlyActive?: boolean }) {
  await requireAdminUser();
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 30, 10), 100);

  const rows: Array<{ id: string; iso2: string; iso3: string | null; name: string; isActive: boolean }> =
    await prisma.geoCountry.findMany({
    where: {
      ...(input.onlyActive !== false ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { iso2: { contains: q.toUpperCase() } },
              { iso3: { contains: q.toUpperCase() } }
            ]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: { id: true, iso2: true, iso3: true, name: true, isActive: true }
    });

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.iso2,
      iso3: row.iso3,
      name: row.name,
      isActive: row.isActive
    }))
  };
}

export async function actionListGeoAdmin1(input: {
  countryId: string;
  q?: string;
  limit?: number;
  onlyActive?: boolean;
}) {
  await requireAdminUser();
  const countryId = normalizeRequired(input.countryId, "País requerido.");
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 80, 20), 300);

  const rows = await prisma.geoAdmin1.findMany({
    where: {
      countryId,
      ...(input.onlyActive !== false ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: { id: true, code: true, name: true, isActive: true }
  });

  return { items: rows };
}

export async function actionListGeoAdmin2(input: {
  admin1Id: string;
  q?: string;
  limit?: number;
  onlyActive?: boolean;
}) {
  await requireAdminUser();
  const admin1Id = normalizeRequired(input.admin1Id, "Región/Departamento requerido.");
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 120, 20), 500);

  const rows = await prisma.geoAdmin2.findMany({
    where: {
      admin1Id,
      ...(input.onlyActive !== false ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: { id: true, code: true, name: true, isActive: true }
  });

  return { items: rows };
}

export async function actionListGeoAdmin3(input: {
  admin2Id: string;
  q?: string;
  limit?: number;
  onlyActive?: boolean;
}) {
  await requireAdminUser();
  const admin2Id = normalizeRequired(input.admin2Id, "Subdivisión padre requerida.");
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 120, 20), 500);

  const rows = await prisma.geoAdmin3.findMany({
    where: {
      admin2Id,
      ...(input.onlyActive !== false ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: { id: true, code: true, name: true, isActive: true }
  });

  return { items: rows };
}

export async function actionListGeoExplorerCountries(input?: {
  q?: string;
  limit?: number;
  status?: "all" | "active" | "inactive";
  coverage?: "all" | "empty" | "with";
  source?: "all" | "official" | "operational";
}) {
  await requireAdminUser();

  const q = input?.q?.trim() ?? "";
  const limit = Math.min(Math.max(input?.limit ?? 350, 25), 500);
  const status = input?.status ?? "all";
  const coverage = input?.coverage ?? "all";
  const source = input?.source ?? "all";

  const whereCountry: Prisma.GeoCountryWhereInput = {
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { iso2: { contains: q.toUpperCase() } },
            { iso3: { contains: q.toUpperCase() } }
          ]
        }
      : {})
  };

  const rows = await prisma.geoCountry.findMany({
    where: whereCountry,
    orderBy: [{ name: "asc" }],
    take: limit,
    select: {
      id: true,
      iso2: true,
      iso3: true,
      name: true,
      callingCode: true,
      admin1Label: true,
      admin2Label: true,
      admin3Label: true,
      adminMaxLevel: true,
      isActive: true,
      meta: {
        select: {
          level1Label: true,
          level2Label: true,
          level3Label: true,
          maxLevel: true
        }
      }
    }
  });

  if (!rows.length) return { items: [] as Array<Record<string, unknown>> };

  const countryIds = rows.map((row) => row.id);

  const [level1Counts, sourceCounts] = await Promise.all([
    prisma.geoDivision.groupBy({
      by: ["countryId"],
      where: {
        countryId: { in: countryIds },
        level: 1,
        ...(source === "official"
          ? { dataSource: GEO_DIVISION_DATA_SOURCE.official }
          : source === "operational"
            ? { dataSource: GEO_DIVISION_DATA_SOURCE.operational }
            : {})
      },
      _count: { _all: true }
    }),
    prisma.geoDivision.groupBy({
      by: ["countryId", "dataSource"],
      where: { countryId: { in: countryIds } },
      _count: { _all: true }
    })
  ]);

  const level1ByCountry = new Map(level1Counts.map((row) => [row.countryId, row._count._all]));
  const sourceByCountry = new Map<
    string,
    {
      official: number;
      operational: number;
    }
  >();

  for (const row of sourceCounts) {
    const current = sourceByCountry.get(row.countryId) ?? { official: 0, operational: 0 };
    if (row.dataSource === GEO_DIVISION_DATA_SOURCE.official) {
      current.official += row._count._all;
    } else {
      current.operational += row._count._all;
    }
    sourceByCountry.set(row.countryId, current);
  }

  const items = rows
    .map((row) => {
      const level1Count = level1ByCountry.get(row.id) ?? 0;
      const sourceStats = sourceByCountry.get(row.id) ?? { official: 0, operational: 0 };
      return {
        id: row.id,
        code: row.iso2,
        iso3: row.iso3,
        name: row.name,
        callingCode: row.callingCode,
        admin1Label: row.admin1Label ?? row.meta?.level1Label ?? null,
        admin2Label: row.admin2Label ?? row.meta?.level2Label ?? null,
        admin3Label: row.admin3Label ?? row.meta?.level3Label ?? null,
        adminMaxLevel: row.adminMaxLevel ?? row.meta?.maxLevel ?? null,
        isActive: row.isActive,
        level1Count,
        officialCount: sourceStats.official,
        operationalCount: sourceStats.operational,
        isEmpty: level1Count === 0,
        meta: row.meta
      };
    })
    .filter((row) => {
      if (coverage === "empty") return row.isEmpty;
      if (coverage === "with") return !row.isEmpty;
      return true;
    })
    .filter((row) => {
      if (source === "official") return row.officialCount > 0;
      if (source === "operational") return row.operationalCount > 0;
      return true;
    });

  return { items };
}

export async function actionListGeoDivisions(input: {
  countryId: string;
  level: number;
  parentId?: string | null;
  q?: string;
  limit?: number;
  onlyActive?: boolean;
  source?: "all" | "official" | "operational";
}) {
  await requireAdminUser();

  const countryId = normalizeRequired(input.countryId, "País requerido.");
  const level = Math.min(8, Math.max(1, Number(input.level || 1)));
  const parentId = normalizeOptional(input.parentId);
  const q = input.q?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 500, 20), 2000);
  const onlyActive = input.onlyActive !== false;
  const source = input.source ?? "all";

  const rows = await prisma.geoDivision.findMany({
    where: {
      countryId,
      level,
      ...(typeof input.parentId !== "undefined" ? { parentId } : {}),
      ...(onlyActive ? { isActive: true } : {}),
      ...(source === "official"
        ? { dataSource: GEO_DIVISION_DATA_SOURCE.official }
        : source === "operational"
          ? { dataSource: GEO_DIVISION_DATA_SOURCE.operational }
          : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ name: "asc" }],
    take: limit,
    select: {
      id: true,
      countryId: true,
      level: true,
      code: true,
      name: true,
      parentId: true,
      dataSource: true,
      isActive: true
    }
  });

  return { items: rows };
}

async function resolveGeoDivisionSubtreeIds(rootId: string) {
  const visited = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length) {
    const currentIds = queue.splice(0, 100);
    for (const id of currentIds) visited.add(id);

    const children = await prisma.geoDivision.findMany({
      where: { parentId: { in: currentIds } },
      select: { id: true }
    });
    for (const child of children) {
      if (!visited.has(child.id)) queue.push(child.id);
    }
  }

  return Array.from(visited);
}

export async function actionSetGeoDivisionActive(input: {
  id: string;
  isActive: boolean;
  includeSubtree?: boolean;
}) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "División inválida.");
  const isActive = Boolean(input.isActive);
  const includeSubtree = Boolean(input.includeSubtree);

  const existing = await prisma.geoDivision.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  });
  if (!existing) throw new Error("División no encontrada.");

  const ids = includeSubtree ? await resolveGeoDivisionSubtreeIds(id) : [id];
  await prisma.geoDivision.updateMany({
    where: { id: { in: ids } },
    data: { isActive }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_GEO_DIVISION_STATUS_CHANGED",
      entityType: "GeoDivision",
      entityId: id,
      metadata: {
        before: existing.isActive,
        after: isActive,
        includeSubtree,
        affectedCount: ids.length
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true, affectedCount: ids.length };
}

export async function actionCreateGeoDivision(input: {
  countryId: string;
  level: number;
  code: string;
  name: string;
  parentId?: string | null;
  dataSource?: "official" | "operational";
}) {
  const user = await requireAdminUser();
  const countryId = normalizeRequired(input.countryId, "País requerido.");
  const level = Math.min(8, Math.max(1, Number(input.level || 1)));
  const code = normalizeRequired(input.code, "Código requerido.");
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const parentId = normalizeOptional(input.parentId);
  const dataSource =
    input.dataSource === "official" ? GEO_DIVISION_DATA_SOURCE.official : GEO_DIVISION_DATA_SOURCE.operational;

  const country = await prisma.geoCountry.findUnique({
    where: { id: countryId },
    select: { id: true }
  });
  if (!country) throw new Error("País inválido.");

  if (level > 1) {
    if (!parentId) throw new Error("Debes seleccionar división padre.");
    const parent = await prisma.geoDivision.findUnique({
      where: { id: parentId },
      select: { id: true, countryId: true, level: true }
    });
    if (!parent || parent.countryId !== countryId) throw new Error("División padre inválida.");
    if (parent.level !== level - 1) throw new Error("La división padre no corresponde al nivel anterior.");
  }

  const existing = await prisma.geoDivision.findFirst({
    where: {
      countryId,
      level,
      parentId,
      OR: [{ code: { equals: code, mode: "insensitive" } }, { name: { equals: name, mode: "insensitive" } }]
    },
    select: { id: true }
  });
  if (existing) {
    throw new Error("Ya existe una división con ese código o nombre en el nivel seleccionado.");
  }

  const created = await prisma.geoDivision.create({
    data: {
      countryId,
      level,
      code,
      name,
      parentId,
      dataSource,
      isActive: true
    },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_GEO_DIVISION_CREATED",
      entityType: "GeoDivision",
      entityId: created.id,
      metadata: {
        countryId,
        level,
        parentId,
        dataSource
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { id: created.id };
}

type GeoDivisionImportRow = {
  level?: number;
  code?: string | null;
  name?: string | null;
  parentId?: string | null;
  parentCode?: string | null;
  parentName?: string | null;
  postalCode?: string | null;
  dataSource?: "official" | "operational" | null;
  isActive?: boolean | null;
};

export async function actionImportGeoDivisions(input: {
  countryId: string;
  rows: GeoDivisionImportRow[];
  defaultLevel?: number;
  defaultParentId?: string | null;
}) {
  const user = await requireAdminUser();
  const countryId = normalizeRequired(input.countryId, "País requerido.");
  const defaultLevel = Math.min(8, Math.max(1, Number(input.defaultLevel || 2)));
  const defaultParentId = normalizeOptional(input.defaultParentId);
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (!rows.length) throw new Error("No hay filas para importar.");

  const country = await prisma.geoCountry.findUnique({
    where: { id: countryId },
    select: { id: true }
  });
  if (!country) throw new Error("País inválido.");

  const summary = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string }>
  };

  const parentCache = new Map<string, string | null>();
  const resolveParentId = async (row: GeoDivisionImportRow, level: number): Promise<string | null> => {
    if (level <= 1) return null;
    const explicitParentId = normalizeOptional(row.parentId) ?? defaultParentId;
    if (explicitParentId) return explicitParentId;

    const parentCode = normalizeOptional(row.parentCode);
    const parentName = normalizeOptional(row.parentName);
    if (!parentCode && !parentName) return null;

    const cacheKey = `${level - 1}:${parentCode ?? ""}:${(parentName ?? "").toLowerCase()}`;
    if (parentCache.has(cacheKey)) {
      return parentCache.get(cacheKey) ?? null;
    }

    const parent = await prisma.geoDivision.findFirst({
      where: {
        countryId,
        level: level - 1,
        OR: [
          ...(parentCode
            ? [
                {
                  code: { equals: parentCode, mode: "insensitive" as const }
                }
              ]
            : []),
          ...(parentName
            ? [
                {
                  name: { equals: parentName, mode: "insensitive" as const }
                }
              ]
            : [])
        ]
      },
      select: { id: true }
    });
    parentCache.set(cacheKey, parent?.id ?? null);
    return parent?.id ?? null;
  };

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const level = Math.min(8, Math.max(1, Number(row.level || defaultLevel)));
    const code = normalizeOptional(row.code)?.toUpperCase() ?? null;
    const name = normalizeOptional(row.name);
    if (!name || !code) {
      summary.skipped += 1;
      summary.errors.push({ row: index + 1, reason: "Fila omitida: nombre/código requerido." });
      continue;
    }

    const parentId = await resolveParentId(row, level);
    if (level > 1 && !parentId) {
      summary.skipped += 1;
      summary.errors.push({ row: index + 1, reason: "Fila omitida: no se pudo resolver parentId." });
      continue;
    }

    const dataSource = row.dataSource === "official" ? GEO_DIVISION_DATA_SOURCE.official : GEO_DIVISION_DATA_SOURCE.operational;
    const existing = await prisma.geoDivision.findFirst({
      where: {
        countryId,
        level,
        parentId,
        OR: [
          { code: { equals: code, mode: "insensitive" } },
          { name: { equals: name, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        code: true,
        name: true,
        postalCode: true,
        dataSource: true,
        isActive: true
      }
    });

    if (!existing) {
      await prisma.geoDivision.create({
        data: {
          countryId,
          level,
          code,
          name,
          parentId,
          postalCode: normalizeOptional(row.postalCode),
          dataSource,
          isActive: row.isActive !== false
        }
      });
      summary.inserted += 1;
      continue;
    }

    const nextPostalCode = normalizeOptional(row.postalCode);
    const nextIsActive = row.isActive !== false;
    const hasChanges =
      existing.code.toUpperCase() !== code ||
      existing.name !== name ||
      (existing.postalCode ?? null) !== nextPostalCode ||
      existing.dataSource !== dataSource ||
      existing.isActive !== nextIsActive;

    if (!hasChanges) {
      summary.skipped += 1;
      continue;
    }

    await prisma.geoDivision.update({
      where: { id: existing.id },
      data: {
        code,
        name,
        postalCode: nextPostalCode,
        dataSource,
        isActive: nextIsActive
      }
    });
    summary.updated += 1;
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_GEO_DIVISION_IMPORT",
      entityType: "GeoDivision",
      entityId: countryId,
      metadata: {
        total: summary.total,
        inserted: summary.inserted,
        updated: summary.updated,
        skipped: summary.skipped,
        errorCount: summary.errors.length
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return summary;
}

export async function actionAddClientAffiliation(input: {
  personClientId: string;
  entityType?: ClientProfileType;
  entityClientId: string;
  role?: string;
  status?: ClientAffiliationStatus;
  payerType?: ClientAffiliationPayerType;
  payerClientId?: string;
  isPrimaryPayer?: boolean;
}) {
  const user = await requireAdminUser();
  const personClientId = normalizeRequired(input.personClientId, "Persona inválida.");
  const entityType = input.entityType;
  const entityClientId = normalizeRequired(input.entityClientId, "Entidad inválida.");

  const role = normalizeOptional(input.role);
  const status = input.status ?? ClientAffiliationStatus.ACTIVE;
  const payerType = input.payerType ?? ClientAffiliationPayerType.PERSON;
  const requestedPrimary = Boolean(input.isPrimaryPayer);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await resolveActivePersonProfile(tx, personClientId);
      const entity = await resolveAffiliationEntity(tx, entityClientId, entityType);
      const payerClientId = await resolveAffiliationPayerClientId({
        tx,
        payerType,
        payerClientId: input.payerClientId,
        defaultEntity: entity
      });

      const isPrimaryPayer = status === ClientAffiliationStatus.ACTIVE ? requestedPrimary : false;

      const created = await tx.clientAffiliation.create({
        data: {
          personClientId,
          entityType: entity.type,
          entityClientId,
          role,
          status,
          payerType,
          payerClientId,
          isPrimaryPayer
        },
        select: { id: true }
      });

      if (isPrimaryPayer) {
        await tx.clientAffiliation.updateMany({
          where: {
            personClientId,
            deletedAt: null,
            status: ClientAffiliationStatus.ACTIVE,
            id: { not: created.id },
            isPrimaryPayer: true
          },
          data: { isPrimaryPayer: false }
        });
      }

      await enforceSinglePrimaryPayer(tx, personClientId, isPrimaryPayer ? created.id : undefined);

      return {
        createdId: created.id,
        entityType: entity.type,
        payerClientId,
        isPrimaryPayer
      };
    });

    await logClientAudit({
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      clientId: personClientId,
      action: "CLIENT_AFFILIATION_ADDED",
      metadata: {
        affiliationId: result.createdId,
        entityType: result.entityType,
        entityClientId,
        role,
        status,
        payerType,
        payerClientId: result.payerClientId,
        isPrimaryPayer: result.isPrimaryPayer
      }
    });

    revalidatePath(`/admin/clientes/${personClientId}`);
    return { id: result.createdId };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const errorMessage = String(err?.message ?? "");
      if (errorMessage.includes("ClientAffiliation_unique_active_target_per_person_idx")) {
        throw new Error("Esta afiliación ya existe para esta persona.");
      }
      if (errorMessage.includes("ClientAffiliation_unique_active_primary_payer_idx")) {
        throw new Error("Solo puede existir un Responsable de pago principal activo por persona.");
      }
      throw new Error("No se pudo guardar la afiliación por conflicto de unicidad.");
    }
    throw err;
  }
}

export async function actionUpdateClientAffiliation(input: {
  affiliationId: string;
  personClientId: string;
  role?: string;
  status?: ClientAffiliationStatus;
  payerType?: ClientAffiliationPayerType;
  payerClientId?: string;
  isPrimaryPayer?: boolean;
}) {
  const user = await requireAdminUser();
  const affiliationId = normalizeRequired(input.affiliationId, "Afiliación inválida.");
  const personClientId = normalizeRequired(input.personClientId, "Persona inválida.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      await resolveActivePersonProfile(tx, personClientId);

      const existing = await tx.clientAffiliation.findFirst({
        where: { id: affiliationId, personClientId, deletedAt: null },
        select: {
          id: true,
          personClientId: true,
          entityType: true,
          entityClientId: true,
          role: true,
          status: true,
          payerType: true,
          payerClientId: true,
          isPrimaryPayer: true
        }
      });
      if (!existing) throw new Error("Afiliación no encontrada.");

      const role = input.role === undefined ? existing.role : normalizeOptional(input.role);
      const status = input.status ?? existing.status;
      const payerType = input.payerType ?? existing.payerType;
      const payerClientId = await resolveAffiliationPayerClientId({
        tx,
        payerType,
        payerClientId: input.payerClientId,
        defaultEntity: { id: existing.entityClientId, type: existing.entityType }
      });
      const requestedPrimary = input.isPrimaryPayer ?? existing.isPrimaryPayer;
      const isPrimaryPayer = status === ClientAffiliationStatus.ACTIVE ? requestedPrimary : false;

      const update = {
        role,
        status,
        payerType,
        payerClientId,
        isPrimaryPayer
      };

      const updated = await tx.clientAffiliation.update({
        where: { id: affiliationId },
        data: update,
        select: { id: true }
      });

      if (isPrimaryPayer) {
        await tx.clientAffiliation.updateMany({
          where: {
            personClientId,
            deletedAt: null,
            status: ClientAffiliationStatus.ACTIVE,
            id: { not: updated.id },
            isPrimaryPayer: true
          },
          data: { isPrimaryPayer: false }
        });
      }

      await enforceSinglePrimaryPayer(
        tx,
        personClientId,
        status === ClientAffiliationStatus.ACTIVE ? updated.id : undefined
      );

      return { updated, existing, update };
    });

    await logClientAudit({
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      clientId: personClientId,
      action: "CLIENT_AFFILIATION_UPDATED",
      before: result.existing as any,
      after: result.update as any
    });

    revalidatePath(`/admin/clientes/${personClientId}`);
    return { ok: true, id: result.updated.id };
  } catch (err: any) {
    if (err?.code === "P2002") {
      const errorMessage = String(err?.message ?? "");
      if (errorMessage.includes("ClientAffiliation_unique_active_target_per_person_idx")) {
        throw new Error("Esta afiliación ya existe para esta persona.");
      }
      if (errorMessage.includes("ClientAffiliation_unique_active_primary_payer_idx")) {
        throw new Error("Solo puede existir un Responsable de pago principal activo por persona.");
      }
      throw new Error("No se pudo actualizar la afiliación por conflicto de unicidad.");
    }
    throw err;
  }
}

export async function actionDeleteClientAffiliation(input: { affiliationId: string; personClientId: string }) {
  const user = await requireAdminUser();
  const affiliationId = normalizeRequired(input.affiliationId, "Afiliación inválida.");
  const personClientId = normalizeRequired(input.personClientId, "Persona inválida.");

  const existing = await prisma.$transaction(async (tx) => {
    await resolveActivePersonProfile(tx, personClientId);

    const current = await tx.clientAffiliation.findFirst({
      where: { id: affiliationId, personClientId, deletedAt: null },
      select: {
        id: true,
        personClientId: true,
        entityType: true,
        entityClientId: true,
        payerType: true,
        payerClientId: true,
        role: true,
        status: true,
        isPrimaryPayer: true
      }
    });
    if (!current) throw new Error("Afiliación no encontrada.");

    await tx.clientAffiliation.update({
      where: { id: affiliationId },
      data: {
        deletedAt: new Date(),
        status: ClientAffiliationStatus.INACTIVE,
        isPrimaryPayer: false
      }
    });

    await enforceSinglePrimaryPayer(tx, personClientId);

    return current;
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId: personClientId,
    action: "CLIENT_AFFILIATION_DELETED",
    metadata: { affiliationId, entityType: existing.entityType, entityClientId: existing.entityClientId, softDelete: true }
  });

  revalidatePath(`/admin/clientes/${personClientId}`);
  return { ok: true };
}

export async function actionSoftDeleteClientProfile(
  clientId: string,
  reason?: string,
  options?: { actorUser?: SessionUser; skipRevalidate?: boolean; now?: Date }
) {
  const user = options?.actorUser ?? (await requireAdminUser());
  const normalizedClientId = normalizeRequired(clientId, "Cliente inválido.");
  const normalizedReason = normalizeOptional(reason);
  const archivedAt = options?.now ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.clientProfile.findFirst({
      where: { id: normalizedClientId, deletedAt: null },
      select: { id: true, type: true, deletedAt: true }
    });
    if (!existing) throw new Error("Cliente no encontrado o ya archivado.");

    let archivedAffiliations = 0;
    if (existing.type === ClientProfileType.PERSON) {
      const updatedAffiliations = await tx.clientAffiliation.updateMany({
        where: { personClientId: existing.id, deletedAt: null },
        data: {
          deletedAt: archivedAt,
          status: ClientAffiliationStatus.INACTIVE,
          isPrimaryPayer: false
        }
      });
      archivedAffiliations = updatedAffiliations.count;
    }

    const updated = await tx.clientProfile.update({
      where: { id: existing.id },
      data: { deletedAt: archivedAt },
      select: { id: true, type: true, deletedAt: true }
    });

    const metadata = {
      clientId: updated.id,
      clientType: updated.type,
      archivedAffiliations,
      ...(normalizedReason ? { reason: normalizedReason } : {})
    };

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PROFILE_SOFT_DELETED",
        entityType: "ClientProfile",
        entityId: updated.id,
        metadata,
        before: { deletedAt: null },
        after: { deletedAt: updated.deletedAt?.toISOString() ?? null }
      }
    });

    await tx.clientAuditEvent.create({
      data: {
        clientId: updated.id,
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PROFILE_SOFT_DELETED",
        metadata
      }
    });

    return updated;
  });

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/clientes");
    revalidatePath(getClientListPath(result.type));
    revalidatePath(`/admin/clientes/${result.id}`);
  }

  return { ok: true, id: result.id, type: result.type };
}

export async function actionRestoreClientProfile(
  clientId: string,
  options?: { actorUser?: SessionUser; skipRevalidate?: boolean }
) {
  const user = options?.actorUser ?? (await requireAdminUser());
  const normalizedClientId = normalizeRequired(clientId, "Cliente inválido.");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.clientProfile.findUnique({
      where: { id: normalizedClientId },
      select: { id: true, type: true, deletedAt: true }
    });
    if (!existing) throw new Error("Cliente no encontrado.");
    if (!existing.deletedAt) throw new Error("Cliente no está archivado.");
    const previousDeletedAt = existing.deletedAt;

    const updated = await tx.clientProfile.update({
      where: { id: existing.id },
      data: { deletedAt: null },
      select: { id: true, type: true, deletedAt: true }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PROFILE_RESTORED",
        entityType: "ClientProfile",
        entityId: updated.id,
        metadata: {
          clientId: updated.id,
          clientType: updated.type,
          note: "Las afiliaciones de persona archivadas no se restauran automáticamente."
        },
        before: { deletedAt: previousDeletedAt.toISOString() },
        after: { deletedAt: null }
      }
    });

    await tx.clientAuditEvent.create({
      data: {
        clientId: updated.id,
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PROFILE_RESTORED",
        metadata: {
          clientId: updated.id,
          clientType: updated.type,
          note: "Las afiliaciones de persona archivadas no se restauran automáticamente."
        }
      }
    });

    return updated;
  });

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/clientes");
    revalidatePath(getClientListPath(result.type));
    revalidatePath(`/admin/clientes/${result.id}`);
  }

  return { ok: true, id: result.id, type: result.type };
}

export async function actionApplyBulkClientMutation(formData: FormData) {
  const user = await requireAdminUser();
  const intent = normalizeRequired(String(formData.get("intent") || ""), "Acción masiva inválida.").toLowerCase();
  const ids = normalizeIdList(formData.getAll("ids"));
  const reason = normalizeOptional(String(formData.get("reason") || ""));
  const requestedStatusId = normalizeOptional(String(formData.get("bulkStatusId") || ""));

  if (!ids.length) {
    return;
  }

  if (intent !== "archive" && intent !== "restore" && intent !== "status") {
    throw new Error("Acción masiva inválida.");
  }

  const selectedClients = await prisma.clientProfile.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, deletedAt: true }
  });
  if (!selectedClients.length) {
    return;
  }

  const actorRole = user.roles?.[0] ?? null;
  let affectedIds: string[] = [];
  let affectedTypes: ClientProfileType[] = [];

  if (intent === "archive") {
    const archiveDate = new Date();
    const activeClients = selectedClients.filter((client) => !client.deletedAt);
    affectedIds = activeClients.map((client) => client.id);
    affectedTypes = Array.from(new Set(activeClients.map((client) => client.type)));

    if (affectedIds.length) {
      const personIds = activeClients.filter((client) => client.type === ClientProfileType.PERSON).map((client) => client.id);

      await prisma.$transaction(async (tx) => {
        if (personIds.length) {
          await tx.clientAffiliation.updateMany({
            where: { personClientId: { in: personIds }, deletedAt: null },
            data: {
              deletedAt: archiveDate,
              status: ClientAffiliationStatus.INACTIVE,
              isPrimaryPayer: false
            }
          });
        }

        await tx.clientProfile.updateMany({
          where: { id: { in: affectedIds }, deletedAt: null },
          data: { deletedAt: archiveDate }
        });

        await tx.auditLog.createMany({
          data: affectedIds.map((clientId) => ({
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_PROFILE_SOFT_DELETED_BULK",
            entityType: "ClientProfile",
            entityId: clientId,
            metadata: { reason: reason ?? null, mode: "bulk" },
            before: { deletedAt: null },
            after: { deletedAt: archiveDate.toISOString() }
          }))
        });

        await tx.clientAuditEvent.createMany({
          data: affectedIds.map((clientId) => ({
            clientId,
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_PROFILE_SOFT_DELETED_BULK",
            metadata: { reason: reason ?? null, mode: "bulk" }
          }))
        });
      });
    }
  }

  if (intent === "restore") {
    const archivedClients = selectedClients.filter((client) => Boolean(client.deletedAt));
    affectedIds = archivedClients.map((client) => client.id);
    affectedTypes = Array.from(new Set(archivedClients.map((client) => client.type)));

    if (affectedIds.length) {
      await prisma.$transaction(async (tx) => {
        await tx.clientProfile.updateMany({
          where: { id: { in: affectedIds }, deletedAt: { not: null } },
          data: { deletedAt: null }
        });

        await tx.auditLog.createMany({
          data: affectedIds.map((clientId) => ({
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_PROFILE_RESTORED_BULK",
            entityType: "ClientProfile",
            entityId: clientId,
            metadata: { mode: "bulk" },
            before: { deletedAt: "archived" },
            after: { deletedAt: null }
          }))
        });

        await tx.clientAuditEvent.createMany({
          data: affectedIds.map((clientId) => ({
            clientId,
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_PROFILE_RESTORED_BULK",
            metadata: { mode: "bulk" }
          }))
        });
      });
    }
  }

  if (intent === "status") {
    if (requestedStatusId) {
      const status = await prisma.clientCatalogItem.findFirst({
        where: { id: requestedStatusId, type: ClientCatalogType.CLIENT_STATUS, isActive: true },
        select: { id: true, name: true }
      });
      if (!status) throw new Error("Estado de cliente inválido o inactivo.");
    }

    const activeClients = selectedClients.filter((client) => !client.deletedAt);
    affectedIds = activeClients.map((client) => client.id);
    affectedTypes = Array.from(new Set(activeClients.map((client) => client.type)));

    if (affectedIds.length) {
      await prisma.$transaction(async (tx) => {
        await tx.clientProfile.updateMany({
          where: { id: { in: affectedIds }, deletedAt: null },
          data: { statusId: requestedStatusId ?? null }
        });

        await tx.auditLog.createMany({
          data: affectedIds.map((clientId) => ({
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_STATUS_UPDATED_BULK",
            entityType: "ClientProfile",
            entityId: clientId,
            metadata: { statusId: requestedStatusId ?? null, mode: "bulk" }
          }))
        });

        await tx.clientAuditEvent.createMany({
          data: affectedIds.map((clientId) => ({
            clientId,
            actorUserId: user.id,
            actorRole,
            action: "CLIENT_STATUS_UPDATED_BULK",
            metadata: { statusId: requestedStatusId ?? null, mode: "bulk" }
          }))
        });
      });
    }
  }

  revalidatePath("/admin/clientes");
  for (const type of affectedTypes) {
    revalidatePath(getClientListPath(type));
  }
  for (const id of affectedIds) {
    revalidatePath(`/admin/clientes/${id}`);
  }

  return;
}

export async function actionAddClientDocument(input: {
  clientId: string;
  title: string;
  documentTypeId?: string;
  expiresAt?: string;
  fileUrl?: string;
  fileAssetId?: string;
  originalName?: string;
}) {
  const user = await requireDocumentEditorUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");
  await resolveActiveClientProfile(clientId);
  const title = normalizeRequired(input.title, "Título de documento requerido.");
  const documentTypeId = normalizeOptional(input.documentTypeId);
  const fileUrl = normalizeOptional(input.fileUrl);
  const fileAssetId = normalizeOptional(input.fileAssetId);
  const originalName = normalizeOptional(input.originalName);

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Fecha de vencimiento inválida.");

  if (documentTypeId) {
    const ok = await prisma.clientCatalogItem.findFirst({
      where: { id: documentTypeId, type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
      select: { id: true }
    });
    if (!ok) throw new Error("Tipo de documento inválido o inactivo.");
  }

  const created = await prisma.clientDocument.create({
    data: {
      clientId,
      title,
      documentTypeId,
      expiresAt,
      fileUrl,
      fileAssetId,
      originalName,
      approvalStatus: ClientDocumentApprovalStatus.PENDING,
      version: 1
    },
    select: { id: true, version: true, approvalStatus: true }
  });

  await logClientDocumentAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    action: "CLIENT_DOCUMENT_ADDED",
    documentId: created.id,
    metadata: { clientId, title, version: created.version, approvalStatus: created.approvalStatus }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId,
    action: "CLIENT_DOCUMENT_ADDED",
    metadata: {
      documentId: created.id,
      title,
      version: created.version,
      approvalStatus: created.approvalStatus
    }
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: created.id, version: created.version };
}

export async function actionUpdateClientDocument(input: {
  documentId: string;
  title?: string;
  documentTypeId?: string;
  expiresAt?: string;
  fileUrl?: string;
  fileAssetId?: string;
  originalName?: string;
}) {
  const user = await requireDocumentEditorUser();
  const documentId = normalizeRequired(input.documentId, "Documento inválido.");

  const existing = await prisma.clientDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      clientId: true,
      title: true,
      documentTypeId: true,
      expiresAt: true,
      fileUrl: true,
      fileAssetId: true,
      originalName: true,
      approvalStatus: true,
      supersededAt: true,
      client: { select: { id: true, deletedAt: true } }
    }
  });
  if (!existing || existing.client?.deletedAt) {
    throw new Error("Documento no encontrado o cliente archivado.");
  }
  if (existing.supersededAt) {
    throw new Error("Este documento fue reemplazado por una versión más reciente.");
  }

  const title = input.title !== undefined ? normalizeRequired(input.title, "Título de documento requerido.") : existing.title;
  const documentTypeId = input.documentTypeId !== undefined ? normalizeOptional(input.documentTypeId) : existing.documentTypeId;
  const fileUrl = input.fileUrl !== undefined ? normalizeOptional(input.fileUrl) : existing.fileUrl;
  const fileAssetId = input.fileAssetId !== undefined ? normalizeOptional(input.fileAssetId) : existing.fileAssetId;
  const originalName = input.originalName !== undefined ? normalizeOptional(input.originalName) : existing.originalName;
  const expiresAt =
    input.expiresAt !== undefined
      ? input.expiresAt
        ? new Date(input.expiresAt)
        : null
      : existing.expiresAt;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Fecha de vencimiento inválida.");

  const fileChanged =
    (fileUrl ?? null) !== (existing.fileUrl ?? null) ||
    (fileAssetId ?? null) !== (existing.fileAssetId ?? null) ||
    (originalName ?? null) !== (existing.originalName ?? null);
  if (fileChanged) {
    throw new Error("Cambio de archivo detectado. Usa “Reemplazar versión” para mantener trazabilidad.");
  }

  if (documentTypeId) {
    const validType = await prisma.clientCatalogItem.findFirst({
      where: { id: documentTypeId, type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
      select: { id: true }
    });
    if (!validType) throw new Error("Tipo de documento inválido o inactivo.");
  }

  const metadataChanged =
    title !== existing.title ||
    (documentTypeId ?? null) !== (existing.documentTypeId ?? null) ||
    (expiresAt?.toISOString() ?? null) !== (existing.expiresAt?.toISOString() ?? null);
  if (existing.approvalStatus === ClientDocumentApprovalStatus.APPROVED && metadataChanged) {
    const safeTitleOnly =
      title !== existing.title &&
      (documentTypeId ?? null) === (existing.documentTypeId ?? null) &&
      (expiresAt?.toISOString() ?? null) === (existing.expiresAt?.toISOString() ?? null);
    if (!safeTitleOnly) {
      throw new Error("Documento aprobado: para cambios de tipo/vencimiento usa “Reemplazar versión”.");
    }
  }

  await prisma.clientDocument.update({
    where: { id: documentId },
    data: {
      title,
      documentTypeId,
      expiresAt,
      fileUrl,
      fileAssetId,
      originalName
    }
  });

  await logClientDocumentAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    action: "CLIENT_DOCUMENT_UPDATED",
    documentId,
    metadata: { clientId: existing.clientId, mode: "portal", approvalStatus: existing.approvalStatus },
    before: {
      title: existing.title,
      documentTypeId: existing.documentTypeId,
      expiresAt: existing.expiresAt?.toISOString() ?? null,
      fileUrl: existing.fileUrl ?? null
    },
    after: {
      title,
      documentTypeId,
      expiresAt: expiresAt?.toISOString() ?? null,
      fileUrl
    }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId: existing.clientId,
    action: "CLIENT_DOCUMENT_UPDATED",
    metadata: {
      documentId: existing.id,
      title,
      approvalStatus: existing.approvalStatus
    }
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${existing.clientId}`);
  return { id: existing.id };
}

export async function actionCreateDocumentVersion(input: {
  documentId: string;
  newFileUrl?: string;
  newFileAssetId?: string;
  newOriginalName?: string;
  expiresAt?: string;
  title?: string;
  documentTypeId?: string;
}, options?: { actorUser?: SessionUser; skipRevalidate?: boolean; now?: Date }) {
  const user = options?.actorUser ?? (await requireDocumentEditorUser());
  if (!canEditDocsFromRoles(user.roles)) {
    throw new Error("No autorizado para editar documentos.");
  }
  const documentId = normalizeRequired(input.documentId, "Documento inválido.");

  const existing = await prisma.clientDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      clientId: true,
      title: true,
      documentTypeId: true,
      expiresAt: true,
      version: true,
      approvalStatus: true,
      supersededByDocumentId: true,
      client: { select: { deletedAt: true } }
    }
  });
  if (!existing || existing.client?.deletedAt) {
    throw new Error("Documento no encontrado o cliente archivado.");
  }
  if (existing.supersededByDocumentId) {
    throw new Error("Este documento ya fue reemplazado por una versión más reciente.");
  }

  const newFileUrl = normalizeOptional(input.newFileUrl);
  const newFileAssetId = normalizeOptional(input.newFileAssetId);
  const newOriginalName = normalizeOptional(input.newOriginalName);
  if (!newFileUrl && !newFileAssetId) {
    throw new Error("Debes adjuntar el archivo de la nueva versión.");
  }

  const nextTitle = input.title !== undefined ? normalizeRequired(input.title, "Título requerido.") : existing.title;
  const nextDocumentTypeId =
    input.documentTypeId !== undefined ? normalizeOptional(input.documentTypeId) : existing.documentTypeId;
  const nextExpiresAt =
    input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : existing.expiresAt;
  if (nextExpiresAt && Number.isNaN(nextExpiresAt.getTime())) throw new Error("Fecha de vencimiento inválida.");

  if (nextDocumentTypeId) {
    const validType = await prisma.clientCatalogItem.findFirst({
      where: { id: nextDocumentTypeId, type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
      select: { id: true }
    });
    if (!validType) throw new Error("Tipo de documento inválido o inactivo.");
  }

  const now = options?.now ?? new Date();
  const actorRole = user.roles?.[0] ?? null;
  const result = await prisma.$transaction(async (tx) => {
    const updatedPrevious = await tx.clientDocument.updateMany({
      where: { id: existing.id, supersededByDocumentId: null },
      data: { supersededAt: now }
    });
    if (updatedPrevious.count !== 1) {
      throw new Error("El documento ya fue versionado por otro usuario.");
    }

    const created = await tx.clientDocument.create({
      data: {
        clientId: existing.clientId,
        title: nextTitle,
        documentTypeId: nextDocumentTypeId,
        expiresAt: nextExpiresAt,
        fileUrl: newFileUrl,
        fileAssetId: newFileAssetId,
        originalName: newOriginalName,
        version: existing.version + 1,
        approvalStatus: ClientDocumentApprovalStatus.PENDING
      },
      select: { id: true, version: true, approvalStatus: true }
    });

    await tx.clientDocument.update({
      where: { id: existing.id },
      data: {
        supersededAt: now,
        supersededByDocumentId: created.id
      }
    });

    await tx.auditLog.createMany({
      data: [
        {
          actorUserId: user.id,
          actorRole,
          action: "CLIENT_DOCUMENT_SUPERSEDED",
          entityType: "ClientDocument",
          entityId: existing.id,
          metadata: {
            clientId: existing.clientId,
            replacedByDocumentId: created.id,
            previousVersion: existing.version
          }
        },
        {
          actorUserId: user.id,
          actorRole,
          action: "CLIENT_DOCUMENT_VERSION_CREATED",
          entityType: "ClientDocument",
          entityId: created.id,
          metadata: {
            clientId: existing.clientId,
            sourceDocumentId: existing.id,
            version: created.version
          }
        }
      ]
    });

    return created;
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole,
    clientId: existing.clientId,
    action: "CLIENT_DOCUMENT_VERSION_CREATED",
    metadata: {
      sourceDocumentId: existing.id,
      newDocumentId: result.id,
      fromVersion: existing.version,
      toVersion: result.version
    }
  });

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${existing.clientId}`);
  }
  return { id: result.id, version: result.version };
}

export async function actionApproveClientDocument(
  input: { documentId: string; note?: string },
  options?: { actorUser?: SessionUser; skipRevalidate?: boolean }
) {
  const user = options?.actorUser ?? (await requireDocumentApproverUser());
  if (!canApproveDocsFromRoles(user.roles)) {
    throw new Error("No autorizado para aprobar documentos.");
  }
  const documentId = normalizeRequired(input.documentId, "Documento inválido.");
  const note = normalizeOptional(input.note);

  const existing = await prisma.clientDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      clientId: true,
      title: true,
      expiresAt: true,
      approvalStatus: true,
      approvedAt: true,
      approvedByUserId: true,
      rejectedAt: true,
      rejectedByUserId: true,
      rejectionReason: true,
      version: true,
      supersededAt: true,
      fileUrl: true,
      fileAssetId: true,
      client: { select: { id: true, deletedAt: true } }
    }
  });
  if (!existing || existing.client?.deletedAt) {
    throw new Error("Documento no encontrado o cliente archivado.");
  }
  if (existing.supersededAt) {
    throw new Error("No se puede aprobar una versión reemplazada.");
  }
  if (!existing.fileUrl && !existing.fileAssetId) {
    throw new Error("No se puede aprobar un documento sin archivo adjunto.");
  }

  const approvedAt = new Date();
  await prisma.clientDocument.update({
    where: { id: existing.id },
    data: {
      approvalStatus: ClientDocumentApprovalStatus.APPROVED,
      approvedAt,
      approvedByUserId: user.id,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null
    }
  });

  await logClientDocumentAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    action: "CLIENT_DOCUMENT_APPROVED",
    documentId: existing.id,
    metadata: {
      clientId: existing.clientId,
      title: existing.title,
      expiresAt: existing.expiresAt?.toISOString() ?? null,
      note,
      version: existing.version
    },
    before: {
      approvalStatus: existing.approvalStatus,
      approvedAt: existing.approvedAt?.toISOString() ?? null,
      approvedByUserId: existing.approvedByUserId ?? null,
      rejectedAt: existing.rejectedAt?.toISOString() ?? null,
      rejectedByUserId: existing.rejectedByUserId ?? null,
      rejectionReason: existing.rejectionReason ?? null
    },
    after: {
      approvalStatus: ClientDocumentApprovalStatus.APPROVED,
      approvedAt: approvedAt.toISOString(),
      approvedByUserId: user.id,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectionReason: null
    }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId: existing.clientId,
    action: "CLIENT_DOCUMENT_APPROVED",
    metadata: {
      documentId: existing.id,
      title: existing.title,
      note,
      version: existing.version
    }
  });

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${existing.clientId}`);
  }
  return { id: existing.id };
}

export async function actionRejectClientDocument(
  input: { documentId: string; reason: string },
  options?: { actorUser?: SessionUser; skipRevalidate?: boolean }
) {
  const user = options?.actorUser ?? (await requireDocumentApproverUser());
  if (!canApproveDocsFromRoles(user.roles)) {
    throw new Error("No autorizado para aprobar documentos.");
  }
  const documentId = normalizeRequired(input.documentId, "Documento inválido.");
  const reason = normalizeRequired(input.reason, "Debes indicar el motivo de rechazo.");
  if (reason.length < 5) throw new Error("El motivo de rechazo debe tener al menos 5 caracteres.");

  const existing = await prisma.clientDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      clientId: true,
      title: true,
      approvalStatus: true,
      approvedAt: true,
      approvedByUserId: true,
      rejectedAt: true,
      rejectedByUserId: true,
      rejectionReason: true,
      version: true,
      supersededAt: true,
      client: { select: { id: true, deletedAt: true } }
    }
  });
  if (!existing || existing.client?.deletedAt) {
    throw new Error("Documento no encontrado o cliente archivado.");
  }
  if (existing.supersededAt) {
    throw new Error("No se puede rechazar una versión reemplazada.");
  }

  const rejectedAt = new Date();
  await prisma.clientDocument.update({
    where: { id: existing.id },
    data: {
      approvalStatus: ClientDocumentApprovalStatus.REJECTED,
      rejectedAt,
      rejectedByUserId: user.id,
      rejectionReason: reason,
      approvedAt: null,
      approvedByUserId: null
    }
  });

  await logClientDocumentAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    action: "CLIENT_DOCUMENT_REJECTED",
    documentId: existing.id,
    metadata: {
      clientId: existing.clientId,
      title: existing.title,
      reason,
      version: existing.version
    },
    before: {
      approvalStatus: existing.approvalStatus,
      approvedAt: existing.approvedAt?.toISOString() ?? null,
      approvedByUserId: existing.approvedByUserId ?? null,
      rejectedAt: existing.rejectedAt?.toISOString() ?? null,
      rejectedByUserId: existing.rejectedByUserId ?? null,
      rejectionReason: existing.rejectionReason ?? null
    },
    after: {
      approvalStatus: ClientDocumentApprovalStatus.REJECTED,
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: rejectedAt.toISOString(),
      rejectedByUserId: user.id,
      rejectionReason: reason
    }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId: existing.clientId,
    action: "CLIENT_DOCUMENT_REJECTED",
    metadata: {
      documentId: existing.id,
      title: existing.title,
      reason,
      version: existing.version
    }
  });

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${existing.clientId}`);
  }
  return { id: existing.id };
}

export async function actionAddClientLocation(input: {
  clientId: string;
  type: ClientLocationType;
  address: string;
  city?: string;
  department?: string;
  country?: string;
  geoCountryId?: string;
  geoAdmin1Id?: string;
  geoAdmin2Id?: string;
  geoAdmin3Id?: string;
  postalCode?: string;
  freeState?: string;
  freeCity?: string;
  label?: string;
  isPrimary?: boolean;
}) {
  const user = await requireAdminUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");
  await resolveActiveClientProfile(clientId);
  const address = normalizeRequired(input.address, "Dirección requerida.");
  const geo = await resolveGeoSelection({
    geoCountryId: input.geoCountryId,
    geoAdmin1Id: input.geoAdmin1Id,
    geoAdmin2Id: input.geoAdmin2Id,
    geoAdmin3Id: input.geoAdmin3Id
  });

  const created = await prisma.clientLocation.create({
    data: {
      clientId,
      type: input.type,
      address,
      city: normalizeOptional(input.city) ?? geo.admin2Name,
      department: normalizeOptional(input.department) ?? geo.admin1Name,
      country: normalizeOptional(input.country) ?? geo.countryName,
      geoCountryId: geo.geoCountryId,
      geoAdmin1Id: geo.geoAdmin1Id,
      geoAdmin2Id: geo.geoAdmin2Id,
      geoAdmin3Id: geo.geoAdmin3Id,
      freeState: normalizeOptional(input.freeState),
      freeCity: normalizeOptional(input.freeCity),
      postalCode: normalizeOptional(input.postalCode),
      label: normalizeOptional(input.label),
      isPrimary: Boolean(input.isPrimary)
    },
    select: { id: true }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId,
    action: "CLIENT_LOCATION_ADDED",
    metadata: { locationId: created.id, type: input.type }
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: created.id };
}

export async function actionAddClientContact(input: {
  clientId: string;
  name?: string;
  relationType?: ClientContactRelationType;
  role?: string;
  phone?: string;
  email?: string;
  linkedPersonClientId?: string;
  isEmergencyContact?: boolean;
  isPrimary?: boolean;
}) {
  const user = await requireAdminUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");
  await resolveActiveClientProfile(clientId);
  const supportsContactExtendedColumns = await safeSupportsClientContactExtendedColumns("clients.actions.addContact");

  const relationType = normalizeContactRelationType(input.relationType ?? "OTHER");

  const linkedPersonClientId = normalizeOptional(input.linkedPersonClientId);
  let linkedPersonName: string | null = null;
  if (linkedPersonClientId) {
    if (linkedPersonClientId === clientId) {
      throw new Error("No puedes vincular el mismo cliente como contacto.");
    }
    const linkedPerson = await prisma.clientProfile.findFirst({
      where: { id: linkedPersonClientId, type: ClientProfileType.PERSON, deletedAt: null },
      select: {
        firstName: true,
        middleName: true,
        lastName: true,
        secondLastName: true,
        dpi: true
      }
    });
    if (!linkedPerson) {
      throw new Error("La persona vinculada no existe o está archivada.");
    }
    linkedPersonName = formatClientLabel({
      type: ClientProfileType.PERSON,
      firstName: linkedPerson.firstName,
      middleName: linkedPerson.middleName,
      lastName: linkedPerson.lastName,
      secondLastName: linkedPerson.secondLastName,
      dpi: linkedPerson.dpi,
      companyName: null,
      tradeName: null,
      nit: null
    });
  }

  const providedName = normalizeOptional(input.name);
  const name = providedName ?? linkedPersonName;
  if (!name) throw new Error("Nombre requerido.");
  const role = normalizeOptional(input.role);
  const phone = normalizeOptional(input.phone);
  const email = normalizeOptional(input.email);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");
  const isPrimary = Boolean(input.isPrimary);
  const isEmergencyContact = Boolean(input.isEmergencyContact);

  const created = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.clientContact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false }
      });
    }

    return tx.clientContact.create({
      data: {
        clientId,
        name,
        role,
        phone,
        email,
        ...(supportsContactExtendedColumns
          ? {
              relationType: relationType as ClientContactRelationType,
              linkedPersonClientId,
              isEmergencyContact,
              isPrimary
            }
          : {
              isPrimary
            })
      },
      select: { id: true }
    });
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId,
    action: "CLIENT_CONTACT_ADDED",
    metadata: {
      contactId: created.id,
      name,
      relationType,
      linkedPersonClientId,
      isEmergencyContact,
      isPrimary
    }
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: created.id };
}

export async function actionAddClientNote(input: {
  clientId: string;
  title?: string;
  body: string;
  noteType?: ClientNoteType;
  visibility?: ClientNoteVisibility;
}) {
  const user = await requireAdminUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");
  await resolveActiveClientProfile(clientId);
  const supportsNoteExtendedColumns = await safeSupportsClientNoteExtendedColumns("clients.actions.addNote");
  const title = normalizeOptional(input.title);
  const body = normalizeRequired(input.body, "Nota requerida.");
  const noteType = normalizeClientNoteType(input.noteType ?? "ADMIN");
  const visibility = normalizeClientNoteVisibility(input.visibility ?? "INTERNA");

  const created = await prisma.clientNote.create({
    data: supportsNoteExtendedColumns
      ? {
          clientId,
          title,
          body,
          noteType: noteType as ClientNoteType,
          visibility: visibility as ClientNoteVisibility,
          actorId: user.id
        }
      : {
          clientId,
          body,
          actorId: user.id
        },
    select: { id: true }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId,
    action: "CLIENT_NOTE_ADDED",
    metadata: { noteId: created.id, noteType, visibility }
  });

  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: created.id };
}

export async function actionCreateClientCatalogItem(input: {
  type: ClientCatalogType;
  name: string;
  description?: string;
}) {
  const user = await requireAdminUser();
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const description = normalizeOptional(input.description);

  try {
    const created = await prisma.clientCatalogItem.create({
      data: {
        type: input.type,
        name,
        description,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CATALOG_CREATED",
        entityType: "ClientCatalogItem",
        entityId: created.id,
        metadata: { type: input.type, name }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un item con ese nombre.");
    throw err;
  }
}

export async function actionLoadClientCatalogDefaults(input: { type: ClientCatalogType }) {
  const user = await requireAdminUser();
  const type = input.type;
  const defaults = getClientCatalogDefaultsByType(type);
  if (!defaults.length) {
    throw new Error("Este catálogo no tiene valores iniciales configurados.");
  }

  const existingRows = await prisma.clientCatalogItem.findMany({
    where: { type },
    select: { id: true, name: true, isActive: true }
  });

  const rowsById = new Map(existingRows.map((row) => [row.id, row] as const));
  const rowsByToken = new Map(existingRows.map((row) => [normalizeSourceToken(row.name), row] as const));

  let created = 0;
  let reactivated = 0;
  let updated = 0;

  for (const row of defaults) {
    const label = normalizeRequired(row.label, "Nombre inicial inválido.");
    const token = normalizeSourceToken(label);
    const matched = (row.id ? rowsById.get(row.id) : null) ?? rowsByToken.get(token) ?? null;

    if (matched) {
      const shouldReactivate = !matched.isActive;
      const shouldRename = matched.name !== label;
      const shouldAdoptId = Boolean(row.id && matched.id !== row.id);

      if (shouldAdoptId) {
        try {
          await prisma.clientCatalogItem.update({
            where: { id: matched.id },
            data: {
              id: row.id,
              name: label,
              isActive: true
            },
            select: { id: true, name: true, isActive: true }
          });
        } catch (error: any) {
          if (error?.code !== "P2002") throw error;
          await prisma.clientCatalogItem.update({
            where: { id: matched.id },
            data: {
              name: label,
              isActive: true
            },
            select: { id: true, name: true, isActive: true }
          });
        }
      } else if (shouldReactivate || shouldRename) {
        await prisma.clientCatalogItem.update({
          where: { id: matched.id },
          data: {
            name: label,
            isActive: true
          },
          select: { id: true, name: true, isActive: true }
        });
      }

      if (shouldReactivate) reactivated += 1;
      if (shouldRename || shouldAdoptId) updated += 1;
      continue;
    }

    try {
      await prisma.clientCatalogItem.create({
        data: {
          ...(row.id ? { id: row.id } : {}),
          type,
          name: label,
          isActive: true
        },
        select: { id: true }
      });
      created += 1;
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
      const byName = await prisma.clientCatalogItem.findFirst({
        where: { type, name: label },
        select: { id: true, isActive: true }
      });
      if (byName && !byName.isActive) {
        await prisma.clientCatalogItem.update({
          where: { id: byName.id },
          data: { isActive: true },
          select: { id: true }
        });
        reactivated += 1;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CATALOG_DEFAULTS_LOADED",
      entityType: "ClientCatalogItem",
      entityId: type,
      metadata: {
        type,
        created,
        reactivated,
        updated
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true, created, reactivated, updated };
}

export async function actionLoadClientAcquisitionDefaults() {
  const user = await requireAdminUser();

  const existingSources = await prisma.clientAcquisitionSource.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, category: true, sortOrder: true, isActive: true }
  });

  const sourcesByCode = new Map(existingSources.map((row) => [normalizeSourceToken(row.code), row] as const));
  const sourcesByName = new Map(existingSources.map((row) => [normalizeSourceToken(row.name), row] as const));

  let createdSources = 0;
  let reactivatedSources = 0;
  let updatedSources = 0;

  for (const source of CLIENT_ACQUISITION_SOURCE_DEFAULTS) {
    const sourceCodeToken = normalizeSourceToken(source.code);
    const sourceNameToken = normalizeSourceToken(source.name);
    const matched = sourcesByCode.get(sourceCodeToken) ?? sourcesByName.get(sourceNameToken) ?? null;

    if (matched) {
      const shouldReactivate = !matched.isActive;
      const shouldUpdate =
        matched.name !== source.name ||
        normalizeSourceToken(matched.code) !== sourceCodeToken ||
        normalizeSourceToken(matched.category) !== normalizeSourceToken(source.category) ||
        matched.sortOrder !== source.sortOrder;

      if (shouldReactivate || shouldUpdate) {
        await prisma.clientAcquisitionSource.update({
          where: { id: matched.id },
          data: {
            name: source.name,
            code: source.code,
            category: source.category,
            sortOrder: source.sortOrder,
            isActive: true
          },
          select: { id: true }
        });
      }

      if (shouldReactivate) reactivatedSources += 1;
      if (shouldUpdate) updatedSources += 1;
      continue;
    }

    await prisma.clientAcquisitionSource.create({
      data: {
        name: source.name,
        code: source.code,
        category: source.category,
        sortOrder: source.sortOrder,
        isActive: true
      },
      select: { id: true }
    });
    createdSources += 1;
  }

  const socialSource = await prisma.clientAcquisitionSource.findFirst({
    where: {
      OR: [{ code: "SOCIAL_MEDIA" }, { name: "Redes sociales" }]
    },
    select: { id: true }
  });

  let createdDetails = 0;
  let reactivatedDetails = 0;
  let updatedDetails = 0;
  if (socialSource) {
    for (const detail of CLIENT_ACQUISITION_SOCIAL_DETAILS_DEFAULTS) {
      const existingDetail = await prisma.clientAcquisitionDetailOption.findUnique({
        where: {
          sourceId_code: {
            sourceId: socialSource.id,
            code: detail.code
          }
        },
        select: { id: true, isActive: true, name: true }
      });

      if (existingDetail) {
        const shouldReactivate = !existingDetail.isActive;
        const shouldUpdate = existingDetail.name !== detail.name;
        if (shouldReactivate || shouldUpdate) {
          await prisma.clientAcquisitionDetailOption.update({
            where: { id: existingDetail.id },
            data: {
              name: detail.name,
              isActive: true
            },
            select: { id: true }
          });
        }
        if (shouldReactivate) reactivatedDetails += 1;
        if (shouldUpdate) updatedDetails += 1;
        continue;
      }

      await prisma.clientAcquisitionDetailOption.create({
        data: {
          sourceId: socialSource.id,
          code: detail.code,
          name: detail.name,
          isActive: true
        },
        select: { id: true }
      });
      createdDetails += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_ACQUISITION_DEFAULTS_LOADED",
      entityType: "ClientAcquisitionSource",
      entityId: "global",
      metadata: {
        createdSources,
        reactivatedSources,
        updatedSources,
        createdDetails,
        reactivatedDetails,
        updatedDetails
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/personas/nuevo");
  revalidatePath("/admin/clientes/empresas/nuevo");
  revalidatePath("/admin/clientes/instituciones/nuevo");
  revalidatePath("/admin/clientes/aseguradoras/nuevo");
  return {
    ok: true,
    createdSources,
    reactivatedSources,
    updatedSources,
    createdDetails,
    reactivatedDetails,
    updatedDetails
  };
}

export async function actionCreateClientContactDepartment(input: {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryDepartmentDelegateOrThrow();
  const name = normalizeRequired(input.name, "Nombre de área requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de área inválido.");
  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: existingRows.map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el área.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  try {
    const created = await delegate.create({
      data: {
        tenantId,
        code,
        name,
        description,
        sortOrder,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CONTACT_DEPARTMENT_CREATED",
        entityType: "ClientContactDepartmentDirectory",
        entityId: created.id,
        metadata: { tenantId, name, code, requestedCode: codeBase, sortOrder }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un área con ese nombre o código.");
    throw err;
  }
}

export async function actionUpdateClientContactDepartment(input: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryDepartmentDelegateOrThrow();
  const id = normalizeRequired(input.id, "Área inválida.");
  const name = normalizeRequired(input.name, "Nombre de área requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de área inválido.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, name: true, code: true, description: true, sortOrder: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Área no encontrada.");

  const tenantRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: tenantRows.filter((row) => row.id !== id).map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el área.");

  try {
    await delegate.update({
      where: { id },
      data: {
        name,
        code,
        description,
        sortOrder
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CONTACT_DEPARTMENT_UPDATED",
        entityType: "ClientContactDepartmentDirectory",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code, requestedCode: codeBase, description, sortOrder } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un área con ese nombre o código.");
    throw err;
  }
}

export async function actionSetClientContactDepartmentActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryDepartmentDelegateOrThrow();
  const id = normalizeRequired(input.id, "Área inválida.");

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Área no encontrada.");

  await delegate.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CONTACT_DEPARTMENT_STATUS_CHANGED",
      entityType: "ClientContactDepartmentDirectory",
      entityId: id,
      metadata: { before: existing.isActive, after: Boolean(input.isActive) }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true };
}

export async function actionCreateClientContactJobTitle(input: {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryJobTitleDelegateOrThrow();
  const name = normalizeRequired(input.name, "Nombre de cargo requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de cargo inválido.");
  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: existingRows.map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el cargo.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  try {
    const created = await delegate.create({
      data: {
        tenantId,
        code,
        name,
        description,
        sortOrder,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CONTACT_JOB_TITLE_CREATED",
        entityType: "ClientContactJobTitleDirectory",
        entityId: created.id,
        metadata: { tenantId, name, code, requestedCode: codeBase, sortOrder }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cargo con ese nombre o código.");
    throw err;
  }
}

export async function actionUpdateClientContactJobTitle(input: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryJobTitleDelegateOrThrow();
  const id = normalizeRequired(input.id, "Cargo inválido.");
  const name = normalizeRequired(input.name, "Nombre de cargo requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de cargo inválido.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, name: true, code: true, description: true, sortOrder: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Cargo no encontrado.");

  const tenantRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: tenantRows.filter((row) => row.id !== id).map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el cargo.");

  try {
    await delegate.update({
      where: { id },
      data: {
        name,
        code,
        description,
        sortOrder
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CONTACT_JOB_TITLE_UPDATED",
        entityType: "ClientContactJobTitleDirectory",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code, requestedCode: codeBase, description, sortOrder } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un cargo con ese nombre o código.");
    throw err;
  }
}

export async function actionSetClientContactJobTitleActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryJobTitleDelegateOrThrow();
  const id = normalizeRequired(input.id, "Cargo inválido.");

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Cargo no encontrado.");

  await delegate.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CONTACT_JOB_TITLE_STATUS_CHANGED",
      entityType: "ClientContactJobTitleDirectory",
      entityId: id,
      metadata: { before: existing.isActive, after: Boolean(input.isActive) }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true };
}

export async function actionLoadClientContactDepartmentDefaults() {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryDepartmentDelegateOrThrow();

  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const defaultsByCode = new Map(
    COMPANY_CONTACT_DEPARTMENTS.map((item, index) => [
      normalizeContactDirectoryCode({ value: item.id }),
      {
        ...item,
        sortOrder: (index + 1) * 10
      }
    ] as const)
  );

  let reactivated = 0;
  for (const row of existingRows) {
    const rowCode = normalizeContactDirectoryCode({ value: row.code });
    if (!defaultsByCode.has(rowCode)) continue;
    if (row.isActive) continue;
    await delegate.update({
      where: { id: row.id },
      data: { isActive: true },
      select: { id: true }
    });
    reactivated += 1;
  }

  const refreshedRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const missingDefaults = resolveMissingDepartmentDefaults(
    refreshedRows.map((row) => ({ code: row.code, name: row.name }))
  );

  let created = 0;
  for (const defaultRow of missingDefaults) {
    const codeBase = normalizeContactDirectoryCode({ value: defaultRow.id, fallbackName: defaultRow.label });
    const code = resolveUniqueContactDirectoryCode({
      baseCode: codeBase,
      existingCodes: refreshedRows.map((row) => row.code)
    });
    if (!code) continue;

    try {
      await delegate.create({
        data: {
          tenantId,
          code,
          name: defaultRow.label,
          sortOrder: (COMPANY_CONTACT_DEPARTMENTS.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
          isActive: true
        },
        select: { id: true }
      });
      refreshedRows.push({
        id: `created_department_${code}_${created}`,
        tenantId,
        code,
        name: defaultRow.label,
        description: null,
        sortOrder: (COMPANY_CONTACT_DEPARTMENTS.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
        isActive: true
      });
      created += 1;
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CONTACT_DEPARTMENT_DEFAULTS_LOADED",
      entityType: "ClientContactDepartmentDirectory",
      entityId: tenantId,
      metadata: { tenantId, created, reactivated }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true, created, reactivated };
}

export async function actionLoadClientContactJobTitleDefaults() {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientContactDirectoryJobTitleDelegateOrThrow();

  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const defaultsByCode = new Map(
    COMPANY_CONTACT_JOB_TITLES.map((item, index) => [
      normalizeContactDirectoryCode({ value: item.id }),
      {
        ...item,
        sortOrder: (index + 1) * 10
      }
    ] as const)
  );

  let reactivated = 0;
  for (const row of existingRows) {
    const rowCode = normalizeContactDirectoryCode({ value: row.code });
    if (!defaultsByCode.has(rowCode)) continue;
    if (row.isActive) continue;
    await delegate.update({
      where: { id: row.id },
      data: { isActive: true },
      select: { id: true }
    });
    reactivated += 1;
  }

  const refreshedRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const missingDefaults = resolveMissingJobTitleDefaults(
    refreshedRows.map((row) => ({ code: row.code, name: row.name }))
  );

  let created = 0;
  for (const defaultRow of missingDefaults) {
    const codeBase = normalizeContactDirectoryCode({ value: defaultRow.id, fallbackName: defaultRow.label });
    const code = resolveUniqueContactDirectoryCode({
      baseCode: codeBase,
      existingCodes: refreshedRows.map((row) => row.code)
    });
    if (!code) continue;

    try {
      await delegate.create({
        data: {
          tenantId,
          code,
          name: defaultRow.label,
          sortOrder: (COMPANY_CONTACT_JOB_TITLES.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
          isActive: true
        },
        select: { id: true }
      });
      refreshedRows.push({
        id: `created_job_title_${code}_${created}`,
        tenantId,
        code,
        name: defaultRow.label,
        description: null,
        sortOrder: (COMPANY_CONTACT_JOB_TITLES.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
        isActive: true
      });
      created += 1;
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CONTACT_JOB_TITLE_DEFAULTS_LOADED",
      entityType: "ClientContactJobTitleDirectory",
      entityId: tenantId,
      metadata: { tenantId, created, reactivated }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true, created, reactivated };
}

export async function actionCreateClientPbxCategory(input: {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientPbxCategoryDirectoryDelegateOrThrow();
  const name = normalizeRequired(input.name, "Nombre de categoría PBX requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de categoría PBX inválido.");
  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: existingRows.map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para la categoría PBX.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  try {
    const created = await delegate.create({
      data: {
        tenantId,
        code,
        name,
        description,
        sortOrder,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PBX_CATEGORY_CREATED",
        entityType: "ClientPbxCategoryDirectory",
        entityId: created.id,
        metadata: { tenantId, name, code, requestedCode: codeBase, sortOrder }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe una categoría PBX con ese nombre o código.");
    throw err;
  }
}

export async function actionUpdateClientPbxCategory(input: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientPbxCategoryDirectoryDelegateOrThrow();
  const id = normalizeRequired(input.id, "Categoría PBX inválida.");
  const name = normalizeRequired(input.name, "Nombre de categoría PBX requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de categoría PBX inválido.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, name: true, code: true, description: true, sortOrder: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Categoría PBX no encontrada.");

  const tenantRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: tenantRows.filter((row) => row.id !== id).map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para la categoría PBX.");

  try {
    await delegate.update({
      where: { id },
      data: {
        name,
        code,
        description,
        sortOrder
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_PBX_CATEGORY_UPDATED",
        entityType: "ClientPbxCategoryDirectory",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code, requestedCode: codeBase, description, sortOrder } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/empresas/nuevo");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe una categoría PBX con ese nombre o código.");
    throw err;
  }
}

export async function actionSetClientPbxCategoryActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientPbxCategoryDirectoryDelegateOrThrow();
  const id = normalizeRequired(input.id, "Categoría PBX inválida.");

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Categoría PBX no encontrada.");

  await delegate.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_PBX_CATEGORY_STATUS_CHANGED",
      entityType: "ClientPbxCategoryDirectory",
      entityId: id,
      metadata: { before: existing.isActive, after: Boolean(input.isActive) }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true };
}

export async function actionLoadClientPbxCategoryDefaults() {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientPbxCategoryDirectoryDelegateOrThrow();

  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const defaultsByCode = new Map(
    COMPANY_PBX_CATEGORY_SEED.map((item, index) => [
      normalizeContactDirectoryCode({ value: item.id }),
      {
        ...item,
        sortOrder: (index + 1) * 10
      }
    ] as const)
  );

  let reactivated = 0;
  for (const row of existingRows) {
    const rowCode = normalizeContactDirectoryCode({ value: row.code });
    if (!defaultsByCode.has(rowCode)) continue;
    if (row.isActive) continue;
    await delegate.update({
      where: { id: row.id },
      data: { isActive: true },
      select: { id: true }
    });
    reactivated += 1;
  }

  const refreshedRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const missingDefaults = resolveMissingPbxCategoryDefaults(
    refreshedRows.map((row) => ({ code: row.code, name: row.name }))
  );

  let created = 0;
  for (const defaultRow of missingDefaults) {
    const codeBase = normalizeContactDirectoryCode({ value: defaultRow.id, fallbackName: defaultRow.label });
    const code = resolveUniqueContactDirectoryCode({
      baseCode: codeBase,
      existingCodes: refreshedRows.map((row) => row.code)
    });
    if (!code) continue;

    try {
      await delegate.create({
        data: {
          tenantId,
          code,
          name: defaultRow.label,
          sortOrder: (COMPANY_PBX_CATEGORY_SEED.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
          isSystem: true,
          isActive: true
        },
        select: { id: true }
      });
      refreshedRows.push({
        id: `created_${code}_${created}`,
        tenantId,
        code,
        name: defaultRow.label,
        description: null,
        sortOrder: (COMPANY_PBX_CATEGORY_SEED.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
        isActive: true
      });
      created += 1;
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_PBX_CATEGORY_DEFAULTS_LOADED",
      entityType: "ClientPbxCategoryDirectory",
      entityId: tenantId,
      metadata: { tenantId, created, reactivated }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true, created, reactivated };
}

export async function actionCreateClientInsurerLine(input: {
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientInsurerLineDirectoryDelegateOrThrow();
  const name = normalizeRequired(input.name, "Nombre de ramo requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de ramo inválido.");
  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: existingRows.map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el ramo.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  try {
    const created = await delegate.create({
      data: {
        tenantId,
        code,
        name,
        description,
        sortOrder,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_INSURER_LINE_CREATED",
        entityType: "ClientInsurerLineDirectory",
        entityId: created.id,
        metadata: { tenantId, name, code, requestedCode: codeBase, sortOrder }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/aseguradoras/nuevo");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un ramo con ese nombre o código.");
    throw err;
  }
}

export async function actionUpdateClientInsurerLine(input: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  sortOrder?: number;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientInsurerLineDirectoryDelegateOrThrow();
  const id = normalizeRequired(input.id, "Ramo inválido.");
  const name = normalizeRequired(input.name, "Nombre de ramo requerido.");
  const codeBase = normalizeContactDirectoryCode({ value: input.code, fallbackName: name });
  if (!codeBase) throw new Error("Código de ramo inválido.");
  const description = normalizeOptional(input.description);
  const sortOrder = normalizeDirectorySortOrder(input.sortOrder);

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, name: true, code: true, description: true, sortOrder: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Ramo no encontrado.");

  const tenantRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });
  const code = resolveUniqueContactDirectoryCode({
    baseCode: codeBase,
    existingCodes: tenantRows.filter((row) => row.id !== id).map((row) => row.code)
  });
  if (!code) throw new Error("No se pudo generar un slug único para el ramo.");

  try {
    await delegate.update({
      where: { id },
      data: {
        name,
        code,
        description,
        sortOrder
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_INSURER_LINE_UPDATED",
        entityType: "ClientInsurerLineDirectory",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code, requestedCode: codeBase, description, sortOrder } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    revalidatePath("/admin/clientes/aseguradoras/nuevo");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un ramo con ese nombre o código.");
    throw err;
  }
}

export async function actionSetClientInsurerLineActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientInsurerLineDirectoryDelegateOrThrow();
  const id = normalizeRequired(input.id, "Ramo inválido.");

  const existing = await delegate.findUnique({
    where: { id },
    select: { id: true, tenantId: true, isActive: true }
  });
  if (!existing || existing.tenantId !== tenantId) throw new Error("Ramo no encontrado.");

  await delegate.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_INSURER_LINE_STATUS_CHANGED",
      entityType: "ClientInsurerLineDirectory",
      entityId: id,
      metadata: { before: existing.isActive, after: Boolean(input.isActive) }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/aseguradoras/nuevo");
  return { ok: true };
}

export async function actionLoadClientInsurerLineDefaults() {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const delegate = getClientInsurerLineDirectoryDelegateOrThrow();

  const existingRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const defaultsByCode = new Map(
    INSURER_LINE_SEED.map((item, index) => [
      normalizeContactDirectoryCode({ value: item.id }),
      {
        ...item,
        sortOrder: (index + 1) * 10
      }
    ] as const)
  );

  let reactivated = 0;
  for (const row of existingRows) {
    const rowCode = normalizeContactDirectoryCode({ value: row.code });
    if (!defaultsByCode.has(rowCode)) continue;
    if (row.isActive) continue;
    await delegate.update({
      where: { id: row.id },
      data: { isActive: true },
      select: { id: true }
    });
    reactivated += 1;
  }

  const refreshedRows = await delegate.findMany({
    where: { tenantId },
    select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
  });

  const missingDefaults = resolveMissingInsurerLineDefaults(
    refreshedRows.map((row) => ({ code: row.code, name: row.name }))
  );

  let created = 0;
  for (const defaultRow of missingDefaults) {
    const codeBase = normalizeContactDirectoryCode({ value: defaultRow.id, fallbackName: defaultRow.label });
    const code = resolveUniqueContactDirectoryCode({
      baseCode: codeBase,
      existingCodes: refreshedRows.map((row) => row.code)
    });
    if (!code) continue;

    try {
      await delegate.create({
        data: {
          tenantId,
          code,
          name: defaultRow.label,
          sortOrder: (INSURER_LINE_SEED.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
          isSystem: true,
          isActive: true
        },
        select: { id: true }
      });
      refreshedRows.push({
        id: `created_insurer_line_${code}_${created}`,
        tenantId,
        code,
        name: defaultRow.label,
        description: null,
        sortOrder: (INSURER_LINE_SEED.findIndex((item) => item.id === defaultRow.id) + 1 || 1) * 10,
        isActive: true
      });
      created += 1;
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_INSURER_LINE_DEFAULTS_LOADED",
      entityType: "ClientInsurerLineDirectory",
      entityId: tenantId,
      metadata: { tenantId, created, reactivated }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/aseguradoras/nuevo");
  return { ok: true, created, reactivated };
}

export async function actionSaveClientContactDepartmentJobTitles(input: {
  departmentId: string;
  jobTitleIds: string[];
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const departmentDelegate = getClientContactDirectoryDepartmentDelegateOrThrow();
  const jobTitleDelegate = getClientContactDirectoryJobTitleDelegateOrThrow();
  const correlationDelegate = getClientContactDirectoryCorrelationDelegateOrThrow();

  const departmentId = normalizeRequired(input.departmentId, "Área requerida.");
  const requestedJobTitleIds = Array.from(
    new Set((Array.isArray(input.jobTitleIds) ? input.jobTitleIds : []).map((item) => normalizeOptional(item)).filter(Boolean) as string[])
  );

  const department = await departmentDelegate.findUnique({
    where: { id: departmentId },
    select: { id: true, tenantId: true, name: true, isActive: true }
  });
  if (!department || department.tenantId !== tenantId) throw new Error("Área no encontrada.");

  if (requestedJobTitleIds.length > 0) {
    const existingJobTitles = await jobTitleDelegate.findMany({
      where: {
        tenantId,
        id: { in: requestedJobTitleIds }
      },
      select: { id: true, tenantId: true, code: true, name: true, description: true, sortOrder: true, isActive: true }
    });

    if (existingJobTitles.length !== requestedJobTitleIds.length) {
      throw new Error("Uno o más cargos seleccionados no existen para este tenant.");
    }
  }

  const existingLinks = await correlationDelegate.findMany({
    where: {
      tenantId,
      departmentId
    },
    select: {
      id: true,
      jobTitleId: true,
      isActive: true
    }
  });

  for (const jobTitleId of requestedJobTitleIds) {
    await correlationDelegate.upsert({
      where: {
        tenantId_departmentId_jobTitleId: {
          tenantId,
          departmentId,
          jobTitleId
        }
      },
      update: {
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        tenantId,
        departmentId,
        jobTitleId,
        isActive: true
      },
      select: { id: true }
    });
  }

  if (requestedJobTitleIds.length > 0) {
    await correlationDelegate.updateMany({
      where: {
        tenantId,
        departmentId,
        jobTitleId: { notIn: requestedJobTitleIds }
      },
      data: {
        isActive: false
      }
    });
  } else {
    await correlationDelegate.updateMany({
      where: {
        tenantId,
        departmentId
      },
      data: {
        isActive: false
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CONTACT_DEPARTMENT_JOB_TITLES_UPDATED",
      entityType: "ClientContactDepartmentDirectory",
      entityId: departmentId,
      metadata: {
        tenantId,
        before: existingLinks.filter((row) => row.isActive).map((row) => row.jobTitleId),
        after: requestedJobTitleIds
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/empresas/nuevo");
  return { ok: true };
}

function normalizeRequiredRuleWeight(value: number | undefined) {
  const raw = Number.isFinite(value) ? Number(value) : 5;
  return Math.min(10, Math.max(1, Math.floor(raw)));
}

async function assertDocumentTypeItem(documentTypeId: string) {
  const documentType = await prisma.clientCatalogItem.findFirst({
    where: { id: documentTypeId, type: ClientCatalogType.DOCUMENT_TYPE },
    select: { id: true }
  });
  if (!documentType) throw new Error("Tipo de documento inválido.");
}

export async function actionCreateRequiredDocumentRule(input: {
  clientType: ClientProfileType;
  documentTypeId: string;
  isRequired?: boolean;
  requiresApproval?: boolean;
  requiresExpiry?: boolean;
  weight?: number;
  isActive?: boolean;
}) {
  const user = await requireAdminUser();
  const documentTypeId = normalizeRequired(input.documentTypeId, "Tipo de documento requerido.");
  const weight = normalizeRequiredRuleWeight(input.weight);
  await assertDocumentTypeItem(documentTypeId);
  const requiredDocRules = getClientRequiredDocumentRuleDelegateOrThrow();

  const existing = await runRequiredDocRulesOperation("clients.requiredDocs.rules.findUnique", () =>
    requiredDocRules.findUnique({
      where: { clientType_documentTypeId: { clientType: input.clientType, documentTypeId } },
      select: { id: true }
    })
  );
  if (existing) {
    throw new Error("Ya existe una regla para ese tipo de cliente y tipo de documento.");
  }

  const created = await runRequiredDocRulesOperation("clients.requiredDocs.rules.create", () =>
    requiredDocRules.create({
      data: {
        clientType: input.clientType,
        documentTypeId,
        isRequired: input.isRequired ?? true,
        requiresApproval: input.requiresApproval ?? true,
        requiresExpiry: input.requiresExpiry ?? false,
        weight,
        isActive: input.isActive ?? true
      },
      select: { id: true, clientType: true }
    })
  );

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_REQUIRED_DOC_RULE_CREATED",
      entityType: "ClientRequiredDocumentRule",
      entityId: created.id,
      metadata: {
        clientType: input.clientType,
        documentTypeId,
        isRequired: input.isRequired ?? true,
        requiresApproval: input.requiresApproval ?? true,
        requiresExpiry: input.requiresExpiry ?? false,
        weight,
        isActive: input.isActive ?? true
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes");
  revalidatePath(getClientListPath(created.clientType));
  return { id: created.id };
}

export async function actionUpdateRequiredDocumentRule(input: {
  id: string;
  isRequired?: boolean;
  requiresApproval?: boolean;
  requiresExpiry?: boolean;
  weight?: number;
  isActive?: boolean;
}) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Regla inválida.");
  const requiredDocRules = getClientRequiredDocumentRuleDelegateOrThrow();

  const existing = await runRequiredDocRulesOperation("clients.requiredDocs.rules.findUnique", () =>
    requiredDocRules.findUnique({
      where: { id },
      select: {
        id: true,
        clientType: true,
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: true,
        isActive: true
      }
    })
  );
  if (!existing) throw new Error("Regla no encontrada.");

  const nextWeight = input.weight === undefined ? existing.weight : normalizeRequiredRuleWeight(input.weight);
  const update = {
    isRequired: input.isRequired ?? existing.isRequired,
    requiresApproval: input.requiresApproval ?? existing.requiresApproval,
    requiresExpiry: input.requiresExpiry ?? existing.requiresExpiry,
    weight: nextWeight,
    isActive: input.isActive ?? existing.isActive
  };

  await runRequiredDocRulesOperation("clients.requiredDocs.rules.update", () =>
    requiredDocRules.update({
      where: { id },
      data: update
    })
  );

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_REQUIRED_DOC_RULE_UPDATED",
      entityType: "ClientRequiredDocumentRule",
      entityId: id,
      before: {
        isRequired: existing.isRequired,
        requiresApproval: existing.requiresApproval,
        requiresExpiry: existing.requiresExpiry,
        weight: existing.weight,
        isActive: existing.isActive
      } as Prisma.InputJsonValue,
      after: update as Prisma.InputJsonValue
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes");
  revalidatePath(getClientListPath(existing.clientType));
  return { ok: true };
}

export async function actionSetClientCatalogItemActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Item inválido.");

  const existing = await prisma.clientCatalogItem.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  });
  if (!existing) throw new Error("Item no encontrado.");

  const updated = await prisma.clientCatalogItem.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
    select: { id: true, isActive: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_CATALOG_STATUS_CHANGED",
      entityType: "ClientCatalogItem",
      entityId: id,
      metadata: { before: existing.isActive, after: updated.isActive }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/personas");
  revalidatePath("/admin/clientes/empresas");
  revalidatePath("/admin/clientes/instituciones");
  revalidatePath("/admin/clientes/aseguradoras");
  return { ok: true };
}

export async function actionUpdateClientCatalogItem(input: { id: string; name: string; description?: string }) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Item inválido.");
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const description = normalizeOptional(input.description);

  const existing = await prisma.clientCatalogItem.findUnique({
    where: { id },
    select: { id: true, name: true, description: true }
  });
  if (!existing) throw new Error("Item no encontrado.");

  try {
    await prisma.clientCatalogItem.update({
      where: { id },
      data: { name, description }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_CATALOG_UPDATED",
        entityType: "ClientCatalogItem",
        entityId: id,
        before: existing as any,
        after: { name, description } as any
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Ya existe un item con ese nombre.");
    throw err;
  }
}

export async function actionCreateClientAcquisitionSource(input: {
  name: string;
  code?: string;
  category?: string;
}) {
  const user = await requireAdminUser();
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const code = normalizeOptional(input.code) ? normalizeSourceToken(input.code) : null;
  const category = normalizeOptional(input.category);

  try {
    const created = await prisma.clientAcquisitionSource.create({
      data: {
        name,
        code,
        category,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_ACQUISITION_SOURCE_CREATED",
        entityType: "ClientAcquisitionSource",
        entityId: created.id,
        metadata: { name, code, category }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("Ya existe un canal con ese nombre o código.");
    }
    throw err;
  }
}

export async function actionUpdateClientAcquisitionSource(input: {
  id: string;
  name: string;
  code?: string;
  category?: string;
}) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Canal inválido.");
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const code = normalizeOptional(input.code) ? normalizeSourceToken(input.code) : null;
  const category = normalizeOptional(input.category);

  const existing = await prisma.clientAcquisitionSource.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, category: true }
  });
  if (!existing) throw new Error("Canal no encontrado.");

  try {
    await prisma.clientAcquisitionSource.update({
      where: { id },
      data: { name, code, category }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_ACQUISITION_SOURCE_UPDATED",
        entityType: "ClientAcquisitionSource",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code, category } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("Ya existe un canal con ese nombre o código.");
    }
    throw err;
  }
}

export async function actionSetClientAcquisitionSourceActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Canal inválido.");
  const isActive = Boolean(input.isActive);

  const existing = await prisma.clientAcquisitionSource.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  });
  if (!existing) throw new Error("Canal no encontrado.");

  await prisma.clientAcquisitionSource.update({
    where: { id },
    data: { isActive }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_ACQUISITION_SOURCE_STATUS_CHANGED",
      entityType: "ClientAcquisitionSource",
      entityId: id,
      metadata: { before: existing.isActive, after: isActive }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true };
}

export async function actionCreateClientAcquisitionDetailOption(input: {
  sourceId: string;
  name: string;
  code?: string;
}) {
  const user = await requireAdminUser();
  const sourceId = normalizeRequired(input.sourceId, "Canal requerido.");
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const code = normalizeOptional(input.code) ? normalizeSourceToken(input.code) : normalizeSourceToken(name);

  const source = await prisma.clientAcquisitionSource.findUnique({
    where: { id: sourceId },
    select: { id: true }
  });
  if (!source) throw new Error("Canal no encontrado.");

  try {
    const created = await prisma.clientAcquisitionDetailOption.create({
      data: {
        sourceId,
        name,
        code,
        isActive: true
      },
      select: { id: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_ACQUISITION_DETAIL_CREATED",
        entityType: "ClientAcquisitionDetailOption",
        entityId: created.id,
        metadata: { sourceId, name, code }
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { id: created.id };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("Ya existe un detalle con ese código para este canal.");
    }
    throw err;
  }
}

export async function actionUpdateClientAcquisitionDetailOption(input: {
  id: string;
  name: string;
  code?: string;
}) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Detalle inválido.");
  const name = normalizeRequired(input.name, "Nombre requerido.");
  const code = normalizeOptional(input.code) ? normalizeSourceToken(input.code) : normalizeSourceToken(name);

  const existing = await prisma.clientAcquisitionDetailOption.findUnique({
    where: { id },
    select: { id: true, sourceId: true, name: true, code: true }
  });
  if (!existing) throw new Error("Detalle no encontrado.");

  try {
    await prisma.clientAcquisitionDetailOption.update({
      where: { id },
      data: { name, code }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_ACQUISITION_DETAIL_UPDATED",
        entityType: "ClientAcquisitionDetailOption",
        entityId: id,
        before: existing as Prisma.InputJsonValue,
        after: { name, code } as Prisma.InputJsonValue
      }
    });

    revalidatePath("/admin/clientes/configuracion");
    return { ok: true };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("Ya existe un detalle con ese código para este canal.");
    }
    throw err;
  }
}

export async function actionSetClientAcquisitionDetailOptionActive(input: { id: string; isActive: boolean }) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Detalle inválido.");
  const isActive = Boolean(input.isActive);

  const existing = await prisma.clientAcquisitionDetailOption.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  });
  if (!existing) throw new Error("Detalle no encontrado.");

  await prisma.clientAcquisitionDetailOption.update({
    where: { id },
    data: { isActive }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_ACQUISITION_DETAIL_STATUS_CHANGED",
      entityType: "ClientAcquisitionDetailOption",
      entityId: id,
      metadata: { before: existing.isActive, after: isActive }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true };
}

export async function actionSetGeoNodeActive(input: {
  level: "country" | "admin1" | "admin2" | "admin3";
  id: string;
  isActive: boolean;
}) {
  const user = await requireAdminUser();
  const id = normalizeRequired(input.id, "Elemento geográfico inválido.");
  const isActive = Boolean(input.isActive);

  if (input.level === "country") {
    const existing = await prisma.geoCountry.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!existing) throw new Error("País no encontrado.");
    await prisma.geoCountry.update({ where: { id }, data: { isActive } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_GEO_COUNTRY_STATUS_CHANGED",
        entityType: "GeoCountry",
        entityId: id,
        metadata: { before: existing.isActive, after: isActive }
      }
    });
  } else if (input.level === "admin1") {
    const existing = await prisma.geoAdmin1.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!existing) throw new Error("Región no encontrada.");
    await prisma.geoAdmin1.update({ where: { id }, data: { isActive } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_GEO_ADMIN1_STATUS_CHANGED",
        entityType: "GeoAdmin1",
        entityId: id,
        metadata: { before: existing.isActive, after: isActive }
      }
    });
  } else if (input.level === "admin2") {
    const existing = await prisma.geoAdmin2.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!existing) throw new Error("Ciudad/Municipio no encontrado.");
    await prisma.geoAdmin2.update({ where: { id }, data: { isActive } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_GEO_ADMIN2_STATUS_CHANGED",
        entityType: "GeoAdmin2",
        entityId: id,
        metadata: { before: existing.isActive, after: isActive }
      }
    });
  } else {
    const existing = await prisma.geoAdmin3.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!existing) throw new Error("Subdivisión no encontrada.");
    await prisma.geoAdmin3.update({ where: { id }, data: { isActive } });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorRole: user.roles?.[0] ?? null,
        action: "CLIENT_GEO_ADMIN3_STATUS_CHANGED",
        entityType: "GeoAdmin3",
        entityId: id,
        metadata: { before: existing.isActive, after: isActive }
      }
    });
  }

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true };
}

export async function actionUpdateClientProfilePhoto(input: {
  clientId: string;
  photoUrl?: string | null;
  photoAssetId?: string | null;
  originalName?: string | null;
}) {
  const user = await requireProfileEditorUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");
  const photoUrl = normalizeOptional(input.photoUrl);
  const photoAssetId = photoUrl ? normalizeOptional(input.photoAssetId) : null;
  const originalName = normalizeOptional(input.originalName);

  const existing = await prisma.clientProfile.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true, type: true, photoUrl: true, photoAssetId: true }
  });
  if (!existing) throw new Error("Cliente no encontrado.");

  if (photoAssetId) {
    const asset = await prisma.fileAsset.findUnique({
      where: { id: photoAssetId },
      select: { id: true, mimeType: true }
    });
    if (!asset) throw new Error("El archivo de foto no existe.");
    if (!asset.mimeType.startsWith("image/")) {
      throw new Error("La foto debe ser un archivo de imagen.");
    }
  }

  if ((existing.photoUrl ?? null) === photoUrl && (existing.photoAssetId ?? null) === photoAssetId) {
    return { ok: true, id: existing.id };
  }

  await prisma.clientProfile.update({
    where: { id: clientId },
    data: {
      photoUrl,
      photoAssetId
    },
    select: { id: true }
  });

  await logClientAudit({
    actorUserId: user.id,
    actorRole: user.roles?.[0] ?? null,
    clientId,
    action: "CLIENT_PROFILE_PHOTO_UPDATED",
    before: {
      photoUrl: existing.photoUrl,
      photoAssetId: existing.photoAssetId
    } as Prisma.JsonObject,
    after: {
      photoUrl,
      photoAssetId,
      originalName
    } as Prisma.JsonObject
  });

  revalidatePath("/admin/clientes");
  revalidatePath(getClientListPath(existing.type));
  revalidatePath(`/admin/clientes/${clientId}`);
  return { ok: true, id: clientId };
}

export async function actionUpdateClientBasics(input: {
  clientId: string;
  type: ClientProfileType;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  dpi?: string;
  companyName?: string;
  tradeName?: string;
  institutionTypeId?: string;
  nit?: string;
  phone?: string;
  phoneCountryIso2?: string;
  email?: string;
  address?: string;
  city?: string;
  department?: string;
  country?: string;
  statusId?: string;
}) {
  const user = await requireAdminUser();
  const clientId = normalizeRequired(input.clientId, "Cliente inválido.");

  const existing = await prisma.clientProfile.findFirst({
    where: { id: clientId, deletedAt: null },
    select: {
      id: true,
      type: true,
      firstName: true,
      middleName: true,
      lastName: true,
      secondLastName: true,
      dpi: true,
      companyName: true,
      tradeName: true,
      institutionTypeId: true,
      nit: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      department: true,
      country: true,
      statusId: true
    }
  });
  if (!existing) throw new Error("Cliente no encontrado.");
  if (existing.type !== input.type) throw new Error("Tipo de cliente no coincide.");

  const email = normalizeOptional(input.email);
  if (email && !isValidEmail(email)) throw new Error("Correo inválido.");

  const update: Record<string, any> = {
    phone: normalizeOptional(input.phone),
    email,
    address: normalizeOptional(input.address),
    city: normalizeOptional(input.city),
    department: normalizeOptional(input.department),
    country: normalizeOptional(input.country),
    statusId: normalizeOptional(input.statusId)
  };

  if (input.type === ClientProfileType.PERSON) {
    const dpi = normalizeOptional(input.dpi);
    if (dpi) {
      const parsed = dpiSchema.safeParse(dpi);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "DPI inválido.");
    }
    update.firstName = normalizeOptional(input.firstName);
    update.middleName = normalizeOptional(input.middleName);
    update.lastName = normalizeOptional(input.lastName);
    update.secondLastName = normalizeOptional(input.secondLastName);
    update.dpi = dpi;
  }

  if (input.type === ClientProfileType.COMPANY) {
    update.companyName = normalizeOptional(input.companyName);
    update.tradeName = normalizeOptional(input.tradeName);
    update.nit = normalizeOptional(input.nit);
  }

  if (input.type === ClientProfileType.INSURER) {
    update.companyName = normalizeOptional(input.companyName);
    update.tradeName = normalizeOptional(input.tradeName);
    update.nit = normalizeOptional(input.nit);
  }

  if (input.type === ClientProfileType.INSTITUTION) {
    update.companyName = normalizeOptional(input.companyName);
    update.nit = normalizeOptional(input.nit);
    const institutionTypeId = normalizeOptional(input.institutionTypeId);
    if (institutionTypeId) {
      const ok = await prisma.clientCatalogItem.findFirst({
        where: { id: institutionTypeId, type: ClientCatalogType.INSTITUTION_TYPE, isActive: true },
        select: { id: true }
      });
      if (!ok) throw new Error("Tipo de institución inválido o inactivo.");
    }
    update.institutionTypeId = institutionTypeId;
  }

  try {
    const updated = await prisma.clientProfile.update({
      where: { id: clientId },
      data: update,
      select: { id: true }
    });

    await logClientAudit({
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      clientId,
      action: "CLIENT_UPDATED",
      before: existing as any,
      after: update as any
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/personas");
    revalidatePath("/admin/clientes/empresas");
    revalidatePath("/admin/clientes/aseguradoras");
    revalidatePath("/admin/clientes/instituciones");
    revalidatePath(`/admin/clientes/${clientId}`);
    return { ok: true, id: updated.id };
  } catch (err: any) {
    if (err?.code === "P2002") throw new Error("Duplicado: DPI o NIT ya existe.");
    throw err;
  }
}

export async function actionUpdateClientRulesConfig(input: {
  alertDays30: number;
  alertDays15: number;
  alertDays7: number;
  healthProfileWeight?: number;
  healthDocsWeight?: number;
}) {
  const user = await requireAdminUser();
  const alertDays30 = Math.max(1, Math.floor(input.alertDays30));
  const alertDays15 = Math.max(1, Math.floor(input.alertDays15));
  const alertDays7 = Math.max(1, Math.floor(input.alertDays7));
  const healthProfileWeight = Math.min(95, Math.max(5, Math.floor(input.healthProfileWeight ?? 70)));
  const healthDocsWeight = Math.min(95, Math.max(5, Math.floor(input.healthDocsWeight ?? 30)));

  let updated: { id: string };
  let persistedWeights = true;

  try {
    updated = await prisma.clientRulesConfig.upsert({
      where: { id: "global" },
      create: { id: "global", alertDays30, alertDays15, alertDays7, healthProfileWeight, healthDocsWeight },
      update: { alertDays30, alertDays15, alertDays7, healthProfileWeight, healthDocsWeight },
      select: { id: true }
    });
  } catch (error) {
    if (isRulesConfigWeightsUnavailableError(error)) {
      warnDevRulesConfigWeightsUnavailable("clients.rulesConfig.upsert", error);
      updated = await prisma.clientRulesConfig.upsert({
        where: { id: "global" },
        create: { id: "global", alertDays30, alertDays15, alertDays7 },
        update: { alertDays30, alertDays15, alertDays7 },
        select: { id: true }
      });
      persistedWeights = false;
    } else {
      throw error;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_RULES_UPDATED",
      entityType: "ClientRulesConfig",
      entityId: updated.id,
      metadata: { alertDays30, alertDays15, alertDays7, healthProfileWeight, healthDocsWeight, persistedWeights }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true };
}

export async function actionUpdateClientsDateFormat(input: {
  clientsDateFormat: string;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);
  const clientsDateFormat = normalizeClientsDateFormat(input.clientsDateFormat);

  const snapshot = await updateTenantClientsDateFormat({
    tenantId,
    clientsDateFormat,
    updatedByUserId: user.id
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_DATE_FORMAT_UPDATED",
      entityType: "TenantClientsConfig",
      entityId: tenantId,
      metadata: {
        tenantId,
        clientsDateFormat: snapshot.clientsDateFormat
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/personas/nuevo");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/clientes/reportes");
  return { ok: true, clientsDateFormat: snapshot.clientsDateFormat };
}

export async function actionUpdateClientsOperatingCountryConfig(input: {
  isOperatingCountryPinned: boolean;
  operatingCountryId?: string | null;
  operatingCountryDefaultsScopes?: unknown;
}) {
  const user = await requireAdminUser();
  const tenantId = tenantIdFromUser(user);

  const snapshot = await updateOperatingCountryDefaults({
    tenantId,
    isOperatingCountryPinned: Boolean(input.isOperatingCountryPinned),
    operatingCountryId: input.operatingCountryId ?? null,
    scopes: input.operatingCountryDefaultsScopes,
    updatedByUserId: user.id
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: "CLIENT_OPERATING_COUNTRY_CONFIG_UPDATED",
      entityType: "TenantClientsConfig",
      entityId: tenantId,
      metadata: {
        tenantId,
        isOperatingCountryPinned: snapshot.isOperatingCountryPinned,
        operatingCountryId: snapshot.operatingCountryId,
        scopes: snapshot.scopes
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  revalidatePath("/admin/clientes/personas/nuevo");
  revalidatePath("/admin/clientes/empresas/nuevo");
  revalidatePath("/admin/clientes/instituciones/nuevo");
  revalidatePath("/admin/clientes/aseguradoras/nuevo");
  revalidatePath("/admin/clientes");

  return {
    ok: true,
    isOperatingCountryPinned: snapshot.isOperatingCountryPinned,
    operatingCountryId: snapshot.operatingCountryId,
    scopes: snapshot.scopes
  };
}

export async function actionSetClientsConfigRegistryDeprecated(input: {
  key: string;
  deprecated: boolean;
}) {
  const user = await requireAdminUser();
  const key = String(input.key ?? "").trim();
  if (!key) throw new Error("Entrada de configuración requerida.");

  const entry = CLIENTS_CONFIG_REGISTRY.find((item) => item.key === key);
  if (!entry) throw new Error("Entrada de configuración no encontrada.");
  if (input.deprecated && !canDeprecateClientsConfigEntry(entry)) {
    throw new Error("Solo se puede deprecar una entrada sin uso activo y marcada como deprecable.");
  }

  const cookieStore = await cookies();
  const current = parseClientsConfigDeprecatedCookie(cookieStore.get(CLIENTS_CONFIG_DEPRECATED_COOKIE)?.value ?? null);
  const nextSet = new Set(current);
  if (input.deprecated) {
    nextSet.add(key);
  } else {
    nextSet.delete(key);
  }
  const next = Array.from(nextSet).sort((a, b) => a.localeCompare(b));

  cookieStore.set(CLIENTS_CONFIG_DEPRECATED_COOKIE, serializeClientsConfigDeprecatedCookie(next), {
    path: "/admin/clientes/configuracion",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production"
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenantIdFromUser(user),
      actorUserId: user.id,
      actorRole: user.roles?.[0] ?? null,
      action: input.deprecated ? "CLIENT_CONFIG_REGISTRY_DEPRECATED" : "CLIENT_CONFIG_REGISTRY_RESTORED",
      entityType: "ClientsConfigRegistry",
      entityId: key,
      metadata: {
        key,
        label: entry.label,
        section: entry.section,
        deprecated: Boolean(input.deprecated),
        deprecatedKeys: next
      }
    }
  });

  revalidatePath("/admin/clientes/configuracion");
  return { ok: true, key, deprecated: Boolean(input.deprecated), deprecatedKeys: next };
}
