import { ClientLocationType } from "@prisma/client";

type PrimaryReadable = {
  isPrimary?: boolean | null;
  isActive?: boolean | null;
};

type PhoneReadable = PrimaryReadable & {
  number?: string | null;
  e164?: string | null;
};

type EmailReadable = PrimaryReadable & {
  valueRaw?: string | null;
  valueNormalized?: string | null;
};

type IdentifierReadable = PrimaryReadable & {
  value?: string | null;
};

type LocationReadable = PrimaryReadable & {
  type?: ClientLocationType | null;
  address?: string | null;
  addressLine1?: string | null;
  country?: string | null;
  department?: string | null;
  city?: string | null;
  freeState?: string | null;
  freeCity?: string | null;
  postalCode?: string | null;
};

function normalizeText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function filterActiveRows<T extends PrimaryReadable>(rows: T[] | null | undefined): T[] {
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.filter((row) => row.isActive !== false);
}

export function getPrimaryPhone<T extends PhoneReadable>(rows: T[] | null | undefined): T | null {
  const active = filterActiveRows(rows);
  if (!active.length) return null;
  return active.find((row) => row.isPrimary) ?? active[0] ?? null;
}

export function getPrimaryPhoneValue(rows: PhoneReadable[] | null | undefined): string | null {
  const primary = getPrimaryPhone(rows);
  if (!primary) return null;
  return normalizeText(primary.e164) ?? normalizeText(primary.number);
}

export function getPrimaryEmail<T extends EmailReadable>(rows: T[] | null | undefined): T | null {
  const active = filterActiveRows(rows).filter((row) => normalizeText(row.valueRaw) || normalizeText(row.valueNormalized));
  if (!active.length) return null;
  return active.find((row) => row.isPrimary) ?? active[0] ?? null;
}

export function getPrimaryEmailValue(rows: EmailReadable[] | null | undefined): string | null {
  const primary = getPrimaryEmail(rows);
  if (!primary) return null;
  return normalizeText(primary.valueRaw) ?? normalizeText(primary.valueNormalized);
}

export function getPrimaryIdentifierValue(rows: IdentifierReadable[] | null | undefined): string | null {
  const active = filterActiveRows(rows).filter((row) => normalizeText(row.value));
  if (!active.length) return null;
  return normalizeText((active.find((row) => row.isPrimary) ?? active[0])?.value);
}

export type ResidenceSnapshot = {
  addressLine1: string | null;
  country: string | null;
  department: string | null;
  city: string | null;
  postalCode: string | null;
};

const RESIDENCE_TYPES = new Set<ClientLocationType>([
  ClientLocationType.HOME,
  ClientLocationType.MAIN,
  ClientLocationType.GENERAL
]);

export function getResidenceSnapshot(rows: LocationReadable[] | null | undefined): ResidenceSnapshot {
  const active = filterActiveRows(rows);
  if (!active.length) {
    return {
      addressLine1: null,
      country: null,
      department: null,
      city: null,
      postalCode: null
    };
  }

  const residenceRows = active.filter((row) => row.type && RESIDENCE_TYPES.has(row.type));
  const source = residenceRows.length ? residenceRows : active;
  const primary = source.find((row) => row.isPrimary) ?? source[0] ?? null;

  if (!primary) {
    return {
      addressLine1: null,
      country: null,
      department: null,
      city: null,
      postalCode: null
    };
  }

  return {
    addressLine1: normalizeText(primary.addressLine1) ?? normalizeText(primary.address),
    country: normalizeText(primary.country),
    department: normalizeText(primary.department) ?? normalizeText(primary.freeState),
    city: normalizeText(primary.city) ?? normalizeText(primary.freeCity),
    postalCode: normalizeText(primary.postalCode)
  };
}
