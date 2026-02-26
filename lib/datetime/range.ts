import { parseIsoDateString } from "@/lib/datetime/parse";

function toDate(value: Date | string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const asIsoDate = parseIsoDateString(value);
  if (asIsoDate) return asIsoDate;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

function getTimezoneOffset(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUTC - date.getTime();
}

function zonedDate(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number },
  timeZone: string
) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond ?? 0
  );
  const offset = getTimezoneOffset(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function zonedStartOfDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return zonedDate(
    { year: parts.year, month: parts.month, day: parts.day, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZone
  );
}

export function zonedEndOfDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const nextDayStart = zonedDate(
    { year: parts.year, month: parts.month, day: parts.day + 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZone
  );
  return new Date(nextDayStart.getTime() - 1);
}

export function buildDateRangeForDay(params: {
  day: Date | string;
  timeZone: string;
}): { from: Date; to: Date } | null {
  const parsed = toDate(params.day);
  if (!parsed) return null;
  return {
    from: zonedStartOfDay(parsed, params.timeZone),
    to: zonedEndOfDay(parsed, params.timeZone)
  };
}

export function buildRange(params: {
  from?: Date | string | null;
  to?: Date | string | null;
  timeZone: string;
}): { from: Date | null; to: Date | null } {
  const fromParsed = params.from ? toDate(params.from) : null;
  const toParsed = params.to ? toDate(params.to) : null;

  if (!fromParsed && !toParsed) {
    return { from: null, to: null };
  }

  const from = fromParsed ? zonedStartOfDay(fromParsed, params.timeZone) : null;
  const to = toParsed ? zonedEndOfDay(toParsed, params.timeZone) : null;

  if (from && to && from.getTime() > to.getTime()) {
    return { from: zonedStartOfDay(toParsed!, params.timeZone), to: zonedEndOfDay(fromParsed!, params.timeZone) };
  }

  return { from, to };
}
