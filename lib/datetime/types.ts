export const DATE_FORMAT_VALUES = ["DMY", "MDY", "YMD"] as const;
export type DateFormat = (typeof DATE_FORMAT_VALUES)[number];

export const TIME_FORMAT_VALUES = ["H12", "H24"] as const;
export type TimeFormat = (typeof TIME_FORMAT_VALUES)[number];

export const WEEK_START_VALUES = ["MON", "SUN"] as const;
export type WeekStartsOn = (typeof WEEK_START_VALUES)[number];

export const DEFAULT_TENANT_TIMEZONE = "America/Guatemala";

export type TenantDateTimeConfig = {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
  weekStartsOn: WeekStartsOn;
};

export type TenantDateTimeConfigSnapshot = TenantDateTimeConfig & {
  tenantId: string;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export const TENANT_DATETIME_DEFAULTS: TenantDateTimeConfig = {
  dateFormat: "DMY",
  timeFormat: "H24",
  timezone: DEFAULT_TENANT_TIMEZONE,
  weekStartsOn: "MON"
};

function isDateFormat(value: string): value is DateFormat {
  return DATE_FORMAT_VALUES.includes(value as DateFormat);
}

function isTimeFormat(value: string): value is TimeFormat {
  return TIME_FORMAT_VALUES.includes(value as TimeFormat);
}

function isWeekStartsOn(value: string): value is WeekStartsOn {
  return WEEK_START_VALUES.includes(value as WeekStartsOn);
}

export function normalizeDateFormat(value: unknown): DateFormat {
  const normalized = String(value ?? "").trim().toUpperCase();
  return isDateFormat(normalized) ? normalized : TENANT_DATETIME_DEFAULTS.dateFormat;
}

export function normalizeTimeFormat(value: unknown): TimeFormat {
  const normalized = String(value ?? "").trim().toUpperCase();
  return isTimeFormat(normalized) ? normalized : TENANT_DATETIME_DEFAULTS.timeFormat;
}

export function normalizeWeekStartsOn(value: unknown): WeekStartsOn {
  const normalized = String(value ?? "").trim().toUpperCase();
  return isWeekStartsOn(normalized) ? normalized : TENANT_DATETIME_DEFAULTS.weekStartsOn;
}

export function normalizeTimezone(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return normalized.length >= 3 ? normalized : TENANT_DATETIME_DEFAULTS.timezone;
}

export function normalizeTenantDateTimeConfig(input: Partial<TenantDateTimeConfig> | null | undefined): TenantDateTimeConfig {
  return {
    dateFormat: normalizeDateFormat(input?.dateFormat),
    timeFormat: normalizeTimeFormat(input?.timeFormat),
    timezone: normalizeTimezone(input?.timezone),
    weekStartsOn: normalizeWeekStartsOn(input?.weekStartsOn)
  };
}

export function buildTenantDateTimeConfigDefaults(tenantId: string): TenantDateTimeConfigSnapshot {
  const normalized = normalizeTenantDateTimeConfig(TENANT_DATETIME_DEFAULTS);
  return {
    tenantId,
    ...normalized,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}
