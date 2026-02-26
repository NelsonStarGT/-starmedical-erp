import {
  normalizeDateFormat,
  normalizeTenantDateTimeConfig,
  normalizeTimeFormat,
  type DateFormat,
  type TenantDateTimeConfig,
  type TimeFormat
} from "@/lib/datetime/types";
import { parseIsoDateString } from "@/lib/datetime/parse";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function resolveDateFormat(input?: DateFormat | TenantDateTimeConfig | null): DateFormat {
  if (!input) return normalizeDateFormat(undefined);
  return normalizeDateFormat(typeof input === "string" ? input : input.dateFormat);
}

function resolveTimeFormat(input?: TimeFormat | TenantDateTimeConfig | null): TimeFormat {
  if (!input) return normalizeTimeFormat(undefined);
  return normalizeTimeFormat(typeof input === "string" ? input : input.timeFormat);
}

function toDate(input: Date | string | number) {
  const parsed = input instanceof Date ? input : new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(input: Date | string | number, formatInput?: DateFormat | TenantDateTimeConfig | null) {
  const format = resolveDateFormat(formatInput);
  const date = toDate(input);
  if (!date) return "";
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  if (format === "MDY") return `${month}/${day}/${year}`;
  if (format === "YMD") return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatIsoDate(value: string, formatInput?: DateFormat | TenantDateTimeConfig | null) {
  const parsed = parseIsoDateString(value);
  if (!parsed) return "";
  return formatDate(parsed, formatInput);
}

export function formatTime(input: Date | string | number, formatInput?: TimeFormat | TenantDateTimeConfig | null) {
  const format = resolveTimeFormat(formatInput);
  const date = toDate(input);
  if (!date) return "";
  const hh = date.getHours();
  const mm = pad2(date.getMinutes());

  if (format === "H12") {
    const suffix = hh >= 12 ? "PM" : "AM";
    const normalizedHours = hh % 12 || 12;
    return `${pad2(normalizedHours)}:${mm} ${suffix}`;
  }

  return `${pad2(hh)}:${mm}`;
}

export function formatDateTime(
  input: Date | string | number,
  configInput?: Partial<TenantDateTimeConfig> | null,
  locale = "es-GT"
) {
  const date = toDate(input);
  if (!date) return "";

  const config = normalizeTenantDateTimeConfig(configInput || undefined);
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: config.timeFormat === "H12"
  });

  // Reformat date part according to selected tenant format while keeping timezone time.
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod");

  const dateText =
    config.dateFormat === "MDY"
      ? `${month}/${day}/${year}`
      : config.dateFormat === "YMD"
        ? `${year}-${month}-${day}`
        : `${day}/${month}/${year}`;

  if (config.timeFormat === "H12") {
    return `${dateText} ${hour}:${minute} ${dayPeriod || ""}`.trim();
  }

  return `${dateText} ${hour}:${minute}`;
}

export function toDateTimeInputValue(input?: Date | string | null): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseDateTimeLocalToIso(localValue: string): string | null {
  if (!localValue) return null;
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) return null;
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
