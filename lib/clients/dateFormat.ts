export const CLIENTS_DATE_FORMAT_VALUES = ["DMY", "MDY", "YMD"] as const;

export type ClientsDateFormat = (typeof CLIENTS_DATE_FORMAT_VALUES)[number];

export const CLIENTS_DATE_FORMAT_DEFAULT: ClientsDateFormat = "DMY";

export const CLIENTS_DATE_FORMAT_OPTIONS: Array<{ value: ClientsDateFormat; label: string }> = [
  { value: "DMY", label: "DD/MM/AAAA" },
  { value: "MDY", label: "MM/DD/AAAA" },
  { value: "YMD", label: "AAAA-MM-DD" }
];

function isDateFormat(value: string): value is ClientsDateFormat {
  return CLIENTS_DATE_FORMAT_VALUES.includes(value as ClientsDateFormat);
}

export function normalizeClientsDateFormat(value: unknown): ClientsDateFormat {
  const normalized = String(value ?? "").trim().toUpperCase();
  return isDateFormat(normalized) ? normalized : CLIENTS_DATE_FORMAT_DEFAULT;
}

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

export function toIsoDateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDateString(value?: string | null) {
  const normalized = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return buildDateFromParts(year, month, day);
}

export function getClientsDatePlaceholder(format: ClientsDateFormat) {
  if (format === "MDY") return "mm/dd/aaaa";
  if (format === "YMD") return "aaaa-mm-dd";
  return "dd/mm/aaaa";
}

export function getClientsDatePreview(format: ClientsDateFormat, date = new Date(2026, 11, 31)) {
  return formatDateForClients(date, format);
}

export function formatDateForClients(date: Date, format: ClientsDateFormat) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  if (format === "MDY") return `${month}/${day}/${year}`;
  if (format === "YMD") return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatIsoDateForClients(value: string, format: ClientsDateFormat) {
  const parsed = parseIsoDateString(value);
  if (!parsed) return "";
  return formatDateForClients(parsed, format);
}

export function maskClientsDateInput(rawValue: string, format: ClientsDateFormat) {
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

export function parseClientsDateInput(inputValue: string, format: ClientsDateFormat): Date | null {
  const normalized = String(inputValue ?? "").trim();
  if (!normalized) return null;
  const masked = maskClientsDateInput(normalized, format);

  if (format === "YMD") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(masked);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return buildDateFromParts(year, month, day);
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
