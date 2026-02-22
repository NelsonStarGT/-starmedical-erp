import { parseHourRange, type BranchSchedule, type WeekdayKey, WEEKDAY_KEYS } from "@/lib/config-central/schemas";

export type TimeRange = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  value: string;
};

const WEEKDAY_BY_INDEX: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function resolveWeekdayKey(date: Date): WeekdayKey {
  return WEEKDAY_BY_INDEX[date.getDay()] || "mon";
}

export function normalizeScheduleForStorage(schedule: BranchSchedule): BranchSchedule {
  const normalized = {} as BranchSchedule;
  for (const key of WEEKDAY_KEYS) {
    normalized[key] = (schedule[key] || []).map((value) => value.trim()).filter(Boolean);
  }
  return normalized;
}

export function scheduleHasAnyRange(schedule: BranchSchedule): boolean {
  return WEEKDAY_KEYS.some((day) => (schedule[day] || []).length > 0);
}

export type ScheduleOverlapIssue = {
  day: WeekdayKey;
  left: string;
  right: string;
};

export function findOverlappingScheduleRanges(schedule: BranchSchedule): ScheduleOverlapIssue[] {
  const issues: ScheduleOverlapIssue[] = [];

  for (const day of WEEKDAY_KEYS) {
    const parsedRanges = (schedule[day] || [])
      .map((raw) => parseHourRange(raw))
      .filter((range): range is NonNullable<typeof range> => Boolean(range))
      .sort((a, b) => {
        const aStart = a.startHour * 60 + a.startMinute;
        const bStart = b.startHour * 60 + b.startMinute;
        return aStart - bStart;
      });

    for (let index = 1; index < parsedRanges.length; index += 1) {
      const left = parsedRanges[index - 1]!;
      const right = parsedRanges[index]!;
      const leftEnd = left.endHour * 60 + left.endMinute;
      const rightStart = right.startHour * 60 + right.startMinute;
      if (rightStart < leftEnd) {
        issues.push({
          day,
          left: left.value,
          right: right.value
        });
      }
    }
  }

  return issues;
}

export function extractScheduleRangesForDate(scheduleJson: unknown, date: Date): TimeRange[] {
  if (!scheduleJson || typeof scheduleJson !== "object") return [];

  const schedule = scheduleJson as Partial<Record<WeekdayKey, unknown>>;
  const dayKey = resolveWeekdayKey(date);
  const dayEntries = Array.isArray(schedule[dayKey]) ? (schedule[dayKey] as unknown[]) : [];
  const parsed: TimeRange[] = [];

  for (const raw of dayEntries) {
    if (typeof raw !== "string") continue;
    const range = parseHourRange(raw);
    if (!range) continue;
    parsed.push(range);
  }

  return parsed.sort((a, b) => {
    const aStart = a.startHour * 60 + a.startMinute;
    const bStart = b.startHour * 60 + b.startMinute;
    return aStart - bStart;
  });
}

export function dateRangesOverlap(
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null
): boolean {
  const leftEndMs = leftEnd ? leftEnd.getTime() : Number.POSITIVE_INFINITY;
  const rightEndMs = rightEnd ? rightEnd.getTime() : Number.POSITIVE_INFINITY;

  return leftStart.getTime() <= rightEndMs && rightStart.getTime() <= leftEndMs;
}

export function parseDateInput(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida.");
  }
  return parsed;
}
