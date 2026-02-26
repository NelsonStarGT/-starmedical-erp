import {
  normalizeDateFormat,
  normalizeTimeFormat,
  type DateFormat,
  type TimeFormat,
  type TenantDateTimeConfig
} from "@/lib/datetime/types";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function buildDateFromParts(year: number, month: number, day: number): Date | null {
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function resolveDateFormat(input?: DateFormat | TenantDateTimeConfig | null): DateFormat {
  if (!input) return normalizeDateFormat(undefined);
  return normalizeDateFormat(typeof input === "string" ? input : input.dateFormat);
}

function resolveTimeFormat(input?: TimeFormat | TenantDateTimeConfig | null): TimeFormat {
  if (!input) return normalizeTimeFormat(undefined);
  return normalizeTimeFormat(typeof input === "string" ? input : input.timeFormat);
}

export function toIsoDateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateString(value?: string | null): Date | null {
  const normalized = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;
  return buildDateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function getDatePlaceholder(formatInput?: DateFormat | TenantDateTimeConfig | null) {
  const format = resolveDateFormat(formatInput);
  if (format === "MDY") return "mm/dd/aaaa";
  if (format === "YMD") return "aaaa-mm-dd";
  return "dd/mm/aaaa";
}

export function maskDateInput(rawValue: string, formatInput?: DateFormat | TenantDateTimeConfig | null) {
  const format = resolveDateFormat(formatInput);
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";

  if (format === "YMD") {
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDate(inputValue: string, formatInput?: DateFormat | TenantDateTimeConfig | null): Date | null {
  const format = resolveDateFormat(formatInput);
  const normalized = String(inputValue ?? "").trim();
  if (!normalized) return null;
  const masked = maskDateInput(normalized, format);

  if (format === "YMD") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(masked);
    if (!match) return null;
    return buildDateFromParts(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(masked);
  if (!match) return null;

  const part1 = Number(match[1]);
  const part2 = Number(match[2]);
  const year = Number(match[3]);

  if (format === "MDY") {
    return buildDateFromParts(year, part1, part2);
  }

  return buildDateFromParts(year, part2, part1);
}

function to24Hour(params: { hours: number; suffix?: "AM" | "PM" | null }): number {
  const suffix = params.suffix || null;
  const hours = params.hours;
  if (!suffix) return hours;
  if (suffix === "AM") return hours === 12 ? 0 : hours;
  return hours === 12 ? 12 : hours + 12;
}

export function maskTimeInput(rawValue: string, formatInput?: TimeFormat | TenantDateTimeConfig | null) {
  const format = resolveTimeFormat(formatInput);
  if (format === "H12") {
    const upper = rawValue.toUpperCase().replace(/\s+/g, " ").trim();
    const hasSuffix = upper.endsWith(" AM") || upper.endsWith(" PM") || upper.endsWith("AM") || upper.endsWith("PM");
    const suffix = upper.match(/(AM|PM)$/)?.[1] ?? "";
    const digits = upper.replace(/\D/g, "").slice(0, 4);
    if (!digits) return suffix ? suffix : "";
    let base = "";
    if (digits.length <= 2) base = digits;
    else base = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    if (hasSuffix && suffix) return `${base} ${suffix}`.trim();
    return base;
  }

  const digits = rawValue.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseTime(inputValue: string, formatInput?: TimeFormat | TenantDateTimeConfig | null) {
  const format = resolveTimeFormat(formatInput);
  const normalized = String(inputValue ?? "").trim().toUpperCase();
  if (!normalized) return null;

  if (format === "H12") {
    const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/.exec(normalized);
    if (!match) return null;
    const rawHours = Number(match[1]);
    const minutes = Number(match[2] ?? "0");
    const suffix = (match[3] as "AM" | "PM" | undefined) ?? undefined;
    if (!Number.isFinite(rawHours) || !Number.isFinite(minutes)) return null;
    if (rawHours < 1 || rawHours > 12) return null;
    if (minutes < 0 || minutes > 59) return null;
    const hours24 = to24Hour({ hours: rawHours, suffix: suffix ?? null });
    return {
      hours24,
      minutes,
      text24: `${pad2(hours24)}:${pad2(minutes)}`,
      suffix: suffix ?? null
    };
  }

  const match = /^(\d{1,2})(?::?(\d{2}))$/.exec(normalized.replace(/\s+/g, ""));
  if (!match) return null;
  const hours24 = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours24) || !Number.isFinite(minutes)) return null;
  if (hours24 < 0 || hours24 > 23 || minutes < 0 || minutes > 59) return null;

  return {
    hours24,
    minutes,
    text24: `${pad2(hours24)}:${pad2(minutes)}`,
    suffix: null
  };
}

export function parseDateTime(input: {
  date: string;
  time: string;
  dateFormat?: DateFormat | TenantDateTimeConfig | null;
  timeFormat?: TimeFormat | TenantDateTimeConfig | null;
}): Date | null {
  const date = parseDate(input.date, input.dateFormat);
  const parsedTime = parseTime(input.time, input.timeFormat);
  if (!date || !parsedTime) return null;
  const output = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parsedTime.hours24,
    parsedTime.minutes,
    0,
    0
  );
  if (Number.isNaN(output.getTime())) return null;
  return output;
}
