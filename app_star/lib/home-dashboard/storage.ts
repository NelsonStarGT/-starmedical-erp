import type { Prisma } from "@prisma/client";
import {
  DEFAULT_HOME_DASHBOARD_SETTINGS,
  normalizeHomeDashboardSettings,
  type HomeDashboardSettings
} from "@/lib/home-dashboard/config";

type HomeDashboardByRoleMap = Record<string, HomeDashboardSettings>;

type AppIdentityMeta = {
  brandName?: string | null;
};

type OpeningHoursEnvelope = {
  __smConfigVersion: 1;
  schedule?: Prisma.InputJsonValue | null;
  homeDashboard?: HomeDashboardSettings;
  homeDashboardByRole?: HomeDashboardByRoleMap;
  appIdentity?: AppIdentityMeta;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnvelope(value: unknown): value is OpeningHoursEnvelope {
  return isRecord(value) && value.__smConfigVersion === 1;
}

export function readOpeningHoursSchedule(openingHours: unknown): unknown {
  if (isEnvelope(openingHours)) {
    return openingHours.schedule ?? null;
  }
  return openingHours ?? null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

function normalizeRoleKey(roleName: string): string {
  return roleName.trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeHomeDashboardByRole(input: unknown): HomeDashboardByRoleMap {
  if (!isRecord(input)) return {};
  const entries = Object.entries(input).flatMap(([key, value]) => {
    const normalizedKey = normalizeRoleKey(String(key || ""));
    if (!normalizedKey) return [];
    return [[normalizedKey, normalizeHomeDashboardSettings(value)] as const];
  });
  return Object.fromEntries(entries);
}

export function readHomeDashboardSnapshot(openingHours: unknown): {
  global: HomeDashboardSettings;
  byRole: HomeDashboardByRoleMap;
} {
  if (!isEnvelope(openingHours)) {
    return {
      global: { ...DEFAULT_HOME_DASHBOARD_SETTINGS },
      byRole: {}
    };
  }

  return {
    global: normalizeHomeDashboardSettings(openingHours.homeDashboard || DEFAULT_HOME_DASHBOARD_SETTINGS),
    byRole: normalizeHomeDashboardByRole(openingHours.homeDashboardByRole)
  };
}

export function readHomeDashboardSettings(openingHours: unknown, roleNames?: string[]): HomeDashboardSettings {
  const snapshot = readHomeDashboardSnapshot(openingHours);
  const normalizedRoles = Array.isArray(roleNames) ? roleNames.map((role) => normalizeRoleKey(role)).filter(Boolean) : [];
  for (const role of normalizedRoles) {
    const roleSettings = snapshot.byRole[role];
    if (roleSettings) {
      return roleSettings;
    }
  }
  return snapshot.global;
}

export function mergeOpeningHoursWithSchedule(existingOpeningHours: unknown, schedule: unknown): OpeningHoursEnvelope {
  const snapshot = readHomeDashboardSnapshot(existingOpeningHours);
  const previousAppIdentity = readAppIdentityMeta(existingOpeningHours);
  return {
    __smConfigVersion: 1,
    schedule: toJsonValue(schedule),
    homeDashboard: snapshot.global,
    homeDashboardByRole: snapshot.byRole,
    appIdentity: previousAppIdentity
  };
}

export function mergeOpeningHoursWithHomeDashboard(
  existingOpeningHours: unknown,
  settings: unknown,
  options?: { roleName?: string | null }
): OpeningHoursEnvelope {
  const roleName = options?.roleName ? normalizeRoleKey(options.roleName) : null;
  const normalizedSettings = normalizeHomeDashboardSettings(settings);
  const snapshot = readHomeDashboardSnapshot(existingOpeningHours);
  const previousSchedule = readOpeningHoursSchedule(existingOpeningHours);
  const previousAppIdentity = readAppIdentityMeta(existingOpeningHours);
  const nextByRole = {
    ...snapshot.byRole
  };
  let nextGlobal = snapshot.global;

  if (roleName) {
    nextByRole[roleName] = normalizedSettings;
  } else {
    nextGlobal = normalizedSettings;
  }

  return {
    __smConfigVersion: 1,
    schedule: toJsonValue(previousSchedule),
    homeDashboard: nextGlobal,
    homeDashboardByRole: nextByRole,
    appIdentity: previousAppIdentity
  };
}

export function readAppIdentityMeta(openingHours: unknown): AppIdentityMeta {
  if (!isEnvelope(openingHours) || !isRecord(openingHours.appIdentity)) {
    return { brandName: null };
  }

  const brandName = openingHours.appIdentity.brandName;
  if (typeof brandName !== "string" || !brandName.trim()) {
    return { brandName: null };
  }
  return { brandName: brandName.trim() };
}

export function mergeOpeningHoursWithAppIdentity(
  existingOpeningHours: unknown,
  appIdentity: AppIdentityMeta
): OpeningHoursEnvelope {
  const snapshot = readHomeDashboardSnapshot(existingOpeningHours);
  const previousSchedule = readOpeningHoursSchedule(existingOpeningHours);
  const currentIdentity = readAppIdentityMeta(existingOpeningHours);
  const nextIdentity: AppIdentityMeta = {
    brandName:
      typeof appIdentity.brandName === "string"
        ? appIdentity.brandName.trim() || null
        : (currentIdentity.brandName ?? null)
  };

  return {
    __smConfigVersion: 1,
    schedule: toJsonValue(previousSchedule),
    homeDashboard: snapshot.global,
    homeDashboardByRole: snapshot.byRole,
    appIdentity: nextIdentity
  };
}
