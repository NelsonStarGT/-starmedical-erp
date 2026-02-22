export type PortalAvailabilityStatus = "GREEN" | "YELLOW" | "RED";

export type PortalAvailabilitySlot = {
  startISO: string;
  endISO: string;
  status: PortalAvailabilityStatus;
  remainingPercent: number;
  isOccupied: boolean;
};

export type PortalAvailabilityDaySummary = {
  totalSlots: number;
  occupiedSlots: number;
  remainingSlots: number;
  status: PortalAvailabilityStatus;
};

export type PortalAvailabilityRules = {
  slotMinutes: number;
  startHour: number;
  endHour: number;
};

export type PortalAvailabilityResult = {
  slots: PortalAvailabilitySlot[];
  daySummary: PortalAvailabilityDaySummary;
  rules: PortalAvailabilityRules;
};

export type PortalAvailabilityAppointmentInput = {
  start: Date;
  durationMin: number;
};

export type PortalAvailabilityTimeRange = {
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
};

export type BranchBusinessHoursWindow = {
  validFrom: Date;
  validTo: Date | null;
  scheduleJson: unknown;
  slotMinutesDefault: number | null;
  isActive?: boolean;
};

const DEFAULT_SLOT_MINUTES = 30;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 17;
const DEFAULT_GREEN_THRESHOLD = 0.6;
const DEFAULT_YELLOW_THRESHOLD = 0.2;

function normalizeSlotMinutes(value: number) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) return DEFAULT_SLOT_MINUTES;
  return Math.min(Math.max(rounded, 5), 240);
}

function normalizeThreshold(input: number | undefined, fallback: number) {
  if (typeof input !== "number" || Number.isNaN(input)) return fallback;
  if (input < 0 || input > 1) return fallback;
  return input;
}

function normalizeTimeRange(range: PortalAvailabilityTimeRange) {
  const startHour = Math.max(0, Math.min(23, Math.floor(range.startHour)));
  const endHour = Math.max(0, Math.min(23, Math.floor(range.endHour)));
  const startMinute = Math.max(0, Math.min(59, Math.floor(range.startMinute ?? 0)));
  const endMinute = Math.max(0, Math.min(59, Math.floor(range.endMinute ?? 0)));
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) return null;
  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    startTotal,
    endTotal
  };
}

function buildSlotWindows(params: {
  day: Date;
  slotMinutes: number;
  startHour: number;
  endHour: number;
  timeRanges?: PortalAvailabilityTimeRange[];
}) {
  const slotMs = params.slotMinutes * 60_000;

  const normalizedRanges = (params.timeRanges || [])
    .map((range) => normalizeTimeRange(range))
    .filter((range): range is NonNullable<typeof range> => Boolean(range));

  const rangesToUse = normalizedRanges.length
    ? normalizedRanges
    : [
        {
          startHour: params.startHour,
          startMinute: 0,
          endHour: params.endHour,
          endMinute: 0,
          startTotal: params.startHour * 60,
          endTotal: params.endHour * 60
        }
      ];

  const slots: Array<{ start: Date; end: Date }> = [];

  for (const range of rangesToUse) {
    const rangeStart = new Date(params.day);
    rangeStart.setHours(range.startHour, range.startMinute, 0, 0);

    const rangeEnd = new Date(params.day);
    rangeEnd.setHours(range.endHour, range.endMinute, 0, 0);

    for (let cursor = rangeStart.getTime(); cursor < rangeEnd.getTime(); cursor += slotMs) {
      const start = new Date(cursor);
      const end = new Date(Math.min(cursor + slotMs, rangeEnd.getTime()));
      if (end.getTime() <= start.getTime()) continue;
      slots.push({ start, end });
    }
  }

  return slots.sort((left, right) => left.start.getTime() - right.start.getTime());
}

export function parsePortalAvailabilityDate(input: string): Date | null {
  const normalized = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function selectVigenteBranchBusinessHours<T extends BranchBusinessHoursWindow>(
  rows: T[],
  date: Date
): T | null {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sorted = [...rows].sort((left, right) => right.validFrom.getTime() - left.validFrom.getTime());
  for (const row of sorted) {
    const isRowActive = typeof row.isActive === "boolean" ? row.isActive : true;
    if (!isRowActive) continue;
    if (row.validFrom.getTime() > dayEnd.getTime()) continue;
    if (row.validTo && row.validTo.getTime() < dayStart.getTime()) continue;
    return row;
  }

  return null;
}

export function resolvePortalAvailabilityStatus(
  remainingPercent: number,
  thresholds?: { greenThreshold?: number; yellowThreshold?: number }
): PortalAvailabilityStatus {
  const greenThreshold = normalizeThreshold(thresholds?.greenThreshold, DEFAULT_GREEN_THRESHOLD);
  const yellowThreshold = normalizeThreshold(thresholds?.yellowThreshold, DEFAULT_YELLOW_THRESHOLD);

  if (remainingPercent > greenThreshold) return "GREEN";
  if (remainingPercent >= yellowThreshold) return "YELLOW";
  return "RED";
}

export function buildEmptyPortalAvailability(params: {
  slotMinutes?: number;
  startHour?: number;
  endHour?: number;
}): PortalAvailabilityResult {
  const slotMinutes = normalizeSlotMinutes(params.slotMinutes ?? DEFAULT_SLOT_MINUTES);
  const startHour = typeof params.startHour === "number" ? params.startHour : DEFAULT_START_HOUR;
  const endHour = typeof params.endHour === "number" ? params.endHour : DEFAULT_END_HOUR;

  return {
    slots: [],
    daySummary: {
      totalSlots: 0,
      occupiedSlots: 0,
      remainingSlots: 0,
      status: "RED"
    },
    rules: {
      slotMinutes,
      startHour,
      endHour
    }
  };
}

export function buildPortalAvailability(params: {
  date: Date;
  slotMinutes: number;
  startHour: number;
  endHour: number;
  timeRanges?: PortalAvailabilityTimeRange[];
  occupiedAppointments: PortalAvailabilityAppointmentInput[];
  thresholds?: {
    greenThreshold?: number;
    yellowThreshold?: number;
  };
}): PortalAvailabilityResult {
  const slotMinutes = normalizeSlotMinutes(params.slotMinutes);
  const day = new Date(params.date);
  day.setHours(0, 0, 0, 0);

  const slots = buildSlotWindows({
    day,
    slotMinutes,
    startHour: params.startHour,
    endHour: params.endHour,
    timeRanges: params.timeRanges
  });

  const occupiedIndexes = new Set<number>();
  for (const appointment of params.occupiedAppointments) {
    const appointmentStartMs = appointment.start.getTime();
    if (Number.isNaN(appointmentStartMs)) continue;
    const durationMin = normalizeSlotMinutes(appointment.durationMin || slotMinutes);
    const appointmentEndMs = appointmentStartMs + durationMin * 60_000;

    slots.forEach((slot, index) => {
      const overlaps = slot.start.getTime() < appointmentEndMs && slot.end.getTime() > appointmentStartMs;
      if (overlaps) occupiedIndexes.add(index);
    });
  }

  const totalSlots = slots.length;
  const occupiedSlots = Math.min(occupiedIndexes.size, totalSlots);
  const remainingSlots = Math.max(totalSlots - occupiedSlots, 0);
  const remainingPercent = totalSlots > 0 ? remainingSlots / totalSlots : 0;
  const dayStatus = resolvePortalAvailabilityStatus(remainingPercent, params.thresholds);

  return {
    slots: slots.map((slot, index) => {
      const isOccupied = occupiedIndexes.has(index);
      return {
        startISO: slot.start.toISOString(),
        endISO: slot.end.toISOString(),
        status: isOccupied ? "RED" : dayStatus,
        remainingPercent,
        isOccupied
      };
    }),
    daySummary: {
      totalSlots,
      occupiedSlots,
      remainingSlots,
      status: dayStatus
    },
    rules: {
      slotMinutes,
      startHour: params.startHour,
      endHour: params.endHour
    }
  };
}
