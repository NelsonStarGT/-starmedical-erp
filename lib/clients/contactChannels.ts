import { Prisma, ClientEmailCategory, ClientPhoneCategory } from "@prisma/client";
import { sanitizeLocalNumber } from "@/lib/clients/phoneValidation";
import { isValidEmail } from "@/lib/utils";

export type ClientPhoneChannelInput = {
  category?: ClientPhoneCategory | string | null;
  relationType?: ClientPhoneRelationType | string | null;
  value?: string | null;
  countryIso2?: string | null;
  canCall?: boolean | null;
  canWhatsapp?: boolean | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type ClientEmailChannelInput = {
  category?: ClientEmailCategory | string | null;
  value?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type NormalizedClientPhoneChannel = {
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

export type NormalizedClientEmailChannel = {
  category: ClientEmailCategory;
  valueRaw: string;
  valueNormalized: string;
  isPrimary: boolean;
  isActive: boolean;
};

type ClientPhoneRelationType = "TITULAR" | "CONYUGE" | "HIJO_A" | "MADRE" | "PADRE" | "ENCARGADO" | "OTRO";

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

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePhoneValue(value: string) {
  return sanitizeLocalNumber(value);
}

function normalizeE164Value(value: string) {
  const raw = value.trim();
  if (!raw.startsWith("+")) return null;
  const digits = sanitizeLocalNumber(raw);
  return digits ? `+${digits}` : null;
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

export function normalizeClientPhoneChannels(input: {
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
    const e164 = normalizeE164Value(rawNumber);
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
      const fallbackE164 = fallbackRaw ? normalizeE164Value(fallbackRaw) : null;
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

export function normalizeClientEmailChannels(input: {
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

export function pickPrimaryPhoneChannel(channels: NormalizedClientPhoneChannel[]) {
  return channels.find((row) => row.isPrimary) ?? channels[0] ?? null;
}

export function pickPrimaryEmailChannel(channels: NormalizedClientEmailChannel[]) {
  return channels.find((row) => row.isPrimary) ?? channels[0] ?? null;
}
