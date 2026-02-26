import { normalizeTenantId } from "@/lib/tenant";

export type OperatingCountryDefaultsScopes = {
  phone: boolean;
  identity: boolean;
  residence: boolean;
  geo: boolean;
};

export type OperatingCountryDefaultsSnapshot = {
  tenantId: string;
  isOperatingCountryPinned: boolean;
  operatingCountryId: string | null;
  operatingCountryCode: string | null;
  operatingCountryName: string | null;
  operatingCountryCallingCode: string | null;
  admin1Label: string | null;
  admin2Label: string | null;
  admin3Label: string | null;
  scopes: OperatingCountryDefaultsScopes;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export const DEFAULT_OPERATING_COUNTRY_SCOPES: OperatingCountryDefaultsScopes = {
  phone: true,
  identity: true,
  residence: true,
  geo: true
};

export function normalizeOperatingCountryScopes(input: unknown): OperatingCountryDefaultsScopes {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_OPERATING_COUNTRY_SCOPES };
  }

  const raw = input as Partial<Record<keyof OperatingCountryDefaultsScopes, unknown>>;
  return {
    phone: typeof raw.phone === "boolean" ? raw.phone : DEFAULT_OPERATING_COUNTRY_SCOPES.phone,
    identity: typeof raw.identity === "boolean" ? raw.identity : DEFAULT_OPERATING_COUNTRY_SCOPES.identity,
    residence: typeof raw.residence === "boolean" ? raw.residence : DEFAULT_OPERATING_COUNTRY_SCOPES.residence,
    geo: typeof raw.geo === "boolean" ? raw.geo : DEFAULT_OPERATING_COUNTRY_SCOPES.geo
  };
}

export function buildOperatingCountryDefaults(
  tenantIdInput: unknown
): OperatingCountryDefaultsSnapshot {
  return {
    tenantId: normalizeTenantId(tenantIdInput),
    isOperatingCountryPinned: false,
    operatingCountryId: null,
    operatingCountryCode: null,
    operatingCountryName: null,
    operatingCountryCallingCode: null,
    admin1Label: null,
    admin2Label: null,
    admin3Label: null,
    scopes: { ...DEFAULT_OPERATING_COUNTRY_SCOPES },
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function isEmptyDraftValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

export function applyDefaultsToDraft<T extends Record<string, unknown>>(
  state: T,
  defaults: Partial<T>
): T {
  let changed = false;
  const nextState = { ...state } as T;

  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const fallback = defaults[key];
    if (isEmptyDraftValue(fallback)) continue;
    if (!isEmptyDraftValue(state[key])) continue;
    nextState[key] = fallback as T[keyof T];
    changed = true;
  }

  return changed ? nextState : state;
}

