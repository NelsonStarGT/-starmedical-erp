import type { InventoryBiweeklyMode, InventoryScheduleType } from "@/lib/types/inventario";

const ONE_DAY = 24 * 60 * 60 * 1000;

type ScheduleRange = { dateFrom: Date; dateTo: Date; label: string };

export function evaluateSchedule(
  setting: any,
  now: Date
): { shouldSend: boolean; range: ScheduleRange } {
  const timezone = setting.timezone || "America/Guatemala";
  const scheduleType = resolveScheduleType(setting);
  const range = resolveRange(scheduleType, now, timezone, setting);
  const nowParts = getZonedParts(now, timezone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const sendMinutes =
    scheduleType === "ONE_TIME"
      ? parseSendMinutes(setting.oneTimeTime || setting.sendTime)
      : parseSendMinutes(setting.sendTime);

  if (setting.lastSentAt && isSameDayZoned(new Date(setting.lastSentAt), now, timezone)) {
    return { shouldSend: false, range };
  }

  if (scheduleType !== "ONE_TIME" && nowMinutes < sendMinutes) {
    return { shouldSend: false, range };
  }

  if (scheduleType === "ONE_TIME") {
    if (setting.lastSentAt) return { shouldSend: false, range };
    if (!setting.oneTimeDate || !setting.oneTimeTime) return { shouldSend: false, range };
    const scheduledDate = zonedStartOfDay(new Date(setting.oneTimeDate), timezone);
    const scheduledParts = getZonedParts(scheduledDate, timezone);
    const isSameDay =
      nowParts.year === scheduledParts.year && nowParts.month === scheduledParts.month && nowParts.day === scheduledParts.day;
    if (!isSameDay && now.getTime() < scheduledDate.getTime()) return { shouldSend: false, range };
    if (!isSameDay && now.getTime() > zonedEndOfDay(scheduledDate, timezone).getTime()) return { shouldSend: false, range };
    const scheduledMinutes = parseSendMinutes(setting.oneTimeTime);
    if (!isSameDay || nowMinutes < scheduledMinutes) return { shouldSend: false, range };
  } else if (scheduleType === "BIWEEKLY") {
    const mode: InventoryBiweeklyMode =
      (setting.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS" ? "EVERY_15_DAYS" : "FIXED_DAYS";
    if (mode === "EVERY_15_DAYS") {
      if (!setting.startDate) return { shouldSend: false, range };
      const start = zonedStartOfDay(new Date(setting.startDate), timezone);
      const today = zonedStartOfDay(now, timezone);
      const diff = Math.floor((today.getTime() - start.getTime()) / ONE_DAY);
      if (diff < 0) return { shouldSend: false, range };
      if (diff % 15 !== 0) return { shouldSend: false, range };
    } else {
      const days = parseFixedDays(setting.fixedDays);
      const daysInMonth = getDaysInMonth(nowParts.year, nowParts.month);
      const isLastDay = nowParts.day === daysInMonth;
      const match = days.includes(nowParts.day) || (isLastDay && days.includes("LAST"));
      if (!match) return { shouldSend: false, range };
    }
  } else {
    const daysInMonth = getDaysInMonth(nowParts.year, nowParts.month);
    const isLastDay = nowParts.day === daysInMonth;
    const useLastDay = setting.useLastDay !== false;
    const monthlyDayRaw =
      typeof setting.monthlyDay === "number" ? setting.monthlyDay : setting.monthlyDay ? Number(setting.monthlyDay) : null;
    if (useLastDay && !isLastDay) return { shouldSend: false, range };
    if (!useLastDay) {
      if (!monthlyDayRaw) return { shouldSend: false, range };
      if (nowParts.day !== monthlyDayRaw) return { shouldSend: false, range };
    }
  }

  return { shouldSend: true, range };
}

export function computeRangeForSetting(setting: any, now: Date): ScheduleRange {
  const timezone = setting.timezone || "America/Guatemala";
  const scheduleType = resolveScheduleType(setting);
  return resolveRange(scheduleType, now, timezone, setting);
}

export function resolveScheduleType(setting: any): InventoryScheduleType {
  const raw = setting.scheduleType as InventoryScheduleType;
  if (raw === "MONTHLY" || raw === "BIWEEKLY" || raw === "ONE_TIME") return raw;
  if (setting.frequency === "MONTHLY") return "MONTHLY";
  return "BIWEEKLY";
}

export function resolveRange(
  scheduleType: InventoryScheduleType,
  now: Date,
  timezone: string,
  setting?: any
): ScheduleRange {
  const end = zonedEndOfDay(now, timezone);
  if (scheduleType === "ONE_TIME") {
    const target = setting?.oneTimeDate
      ? zonedStartOfDay(new Date(setting.oneTimeDate), timezone)
      : zonedStartOfDay(now, timezone);
    const targetEnd = zonedEndOfDay(target, timezone);
    return { dateFrom: target, dateTo: targetEnd, label: "Única" };
  }
  if (scheduleType === "MONTHLY") {
    const parts = getZonedParts(now, timezone);
    const start = zonedDate(
      { year: parts.year, month: parts.month, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
      timezone
    );
    return { dateFrom: start, dateTo: end, label: "Mensual" };
  }
  const startOfToday = zonedStartOfDay(now, timezone);
  const start = zonedAddDays(startOfToday, -14);
  return { dateFrom: start, dateTo: end, label: "Quincenal" };
}

export function parseRecipients(setting: any) {
  const seen = new Set<string>();
  if (setting.email) {
    const email = String(setting.email).trim();
    if (email) seen.add(email);
  }
  const sources = [setting.recipientsJson, setting.recipients];
  sources.forEach((raw) => {
    if (!raw) return;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((r) => {
            const email = String(r).trim();
            if (email) seen.add(email);
          });
          return;
        }
      } catch {
        // ignore JSON errors and try split
      }
      raw
        .split(/[;,]/)
        .map((r) => r.trim())
        .filter(Boolean)
        .forEach((email) => seen.add(email));
    }
  });
  return Array.from(seen);
}

export function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function parseFixedDays(raw?: string | null): Array<number | "LAST"> {
  if (!raw) return [15, "LAST"];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.toUpperCase() === "LAST" ? "LAST" : Number(p)))
    .filter((p) => p === "LAST" || (!Number.isNaN(p) && p > 0 && p < 32));
}

function parseSendMinutes(value?: string | null) {
  const fallback = 23 * 60 + 30;
  if (!value || typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return hours * 60 + minutes;
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
    hour12: false
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

function isSameDayZoned(a: Date, b: Date, timeZone: string) {
  const pa = getZonedParts(a, timeZone);
  const pb = getZonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
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

function zonedStartOfDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return zonedDate({ year: parts.year, month: parts.month, day: parts.day, hour: 0, minute: 0, second: 0, millisecond: 0 }, timeZone);
}

function zonedEndOfDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return zonedDate(
    { year: parts.year, month: parts.month, day: parts.day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    timeZone
  );
}

function zonedAddDays(date: Date, delta: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
