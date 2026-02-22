import type { OperationalArea, QueueItemStatus } from "@prisma/client";
import { RECEPTION_AREAS } from "@/lib/reception/constants";

export const RECEPTION_SLA_MIN = 1;
export const RECEPTION_SLA_MAX = 240;

export const RECEPTION_SLA_RECOMMENDED = {
  applyToAllAreas: true,
  waitingWarningMin: 20,
  waitingCriticalMin: 40,
  inServiceMaxMin: 60,
  calledWarningMin: 10,
  pausedWarningMin: 15
} as const;

export type ReceptionSlaThresholds = {
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
  calledWarningMin: number;
  pausedWarningMin: number;
};

export type ReceptionSlaPolicy = {
  branchId: string;
  applyToAllAreas: boolean;
  thresholds: ReceptionSlaThresholds;
  areaThresholds: Record<OperationalArea, ReceptionSlaThresholds>;
  updatedAt: string | null;
};

export type ReceptionSlaAreaDraft = {
  area: OperationalArea;
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
};

export type ReceptionSlaSimpleDraft = {
  applyToAllAreas: boolean;
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
};

export function assertSlaRange(name: string, value: number) {
  if (!Number.isFinite(value) || value < RECEPTION_SLA_MIN || value > RECEPTION_SLA_MAX) {
    throw new Error(`${name} debe estar entre ${RECEPTION_SLA_MIN} y ${RECEPTION_SLA_MAX}.`);
  }
}

export function sanitizeSlaSimpleDraft(input: ReceptionSlaSimpleDraft): ReceptionSlaSimpleDraft {
  const waitingWarningMin = Math.round(Number(input.waitingWarningMin));
  const waitingCriticalMin = Math.round(Number(input.waitingCriticalMin));
  const inServiceMaxMin = Math.round(Number(input.inServiceMaxMin));

  assertSlaRange("Espera warning", waitingWarningMin);
  assertSlaRange("Espera critical", waitingCriticalMin);
  assertSlaRange("Atención en curso", inServiceMaxMin);

  if (waitingCriticalMin < waitingWarningMin) {
    throw new Error("Espera critical debe ser mayor o igual a espera warning.");
  }

  return {
    applyToAllAreas: Boolean(input.applyToAllAreas),
    waitingWarningMin,
    waitingCriticalMin,
    inServiceMaxMin
  };
}

export function sanitizeSlaAreaDraft(input: ReceptionSlaAreaDraft): ReceptionSlaAreaDraft {
  const waitingWarningMin = Math.round(Number(input.waitingWarningMin));
  const waitingCriticalMin = Math.round(Number(input.waitingCriticalMin));
  const inServiceMaxMin = Math.round(Number(input.inServiceMaxMin));

  assertSlaRange("Espera warning", waitingWarningMin);
  assertSlaRange("Espera critical", waitingCriticalMin);
  assertSlaRange("Atención en curso", inServiceMaxMin);

  if (waitingCriticalMin < waitingWarningMin) {
    throw new Error("Espera critical debe ser mayor o igual a espera warning.");
  }

  return {
    area: input.area,
    waitingWarningMin,
    waitingCriticalMin,
    inServiceMaxMin
  };
}

export function buildBaseThresholds(input?: Partial<ReceptionSlaThresholds> | null): ReceptionSlaThresholds {
  return {
    waitingWarningMin: input?.waitingWarningMin ?? RECEPTION_SLA_RECOMMENDED.waitingWarningMin,
    waitingCriticalMin: input?.waitingCriticalMin ?? RECEPTION_SLA_RECOMMENDED.waitingCriticalMin,
    inServiceMaxMin: input?.inServiceMaxMin ?? RECEPTION_SLA_RECOMMENDED.inServiceMaxMin,
    calledWarningMin: input?.calledWarningMin ?? RECEPTION_SLA_RECOMMENDED.calledWarningMin,
    pausedWarningMin: input?.pausedWarningMin ?? RECEPTION_SLA_RECOMMENDED.pausedWarningMin
  };
}

export function buildAreaThresholdMap(input: {
  applyToAllAreas: boolean;
  base: ReceptionSlaThresholds;
  areaOverrides?: Array<ReceptionSlaAreaDraft>;
}): Record<OperationalArea, ReceptionSlaThresholds> {
  const overrides = new Map(input.areaOverrides?.map((row) => [row.area, row]) ?? []);

  const result = {} as Record<OperationalArea, ReceptionSlaThresholds>;
  for (const area of RECEPTION_AREAS) {
    const override = overrides.get(area);
    result[area] =
      !input.applyToAllAreas && override
        ? {
            waitingWarningMin: override.waitingWarningMin,
            waitingCriticalMin: override.waitingCriticalMin,
            inServiceMaxMin: override.inServiceMaxMin,
            calledWarningMin: input.base.calledWarningMin,
            pausedWarningMin: input.base.pausedWarningMin
          }
        : { ...input.base };
  }
  return result;
}

export function classifyQueueSla(input: {
  status: QueueItemStatus | null;
  minutesInState: number;
  thresholds: ReceptionSlaThresholds;
}): "normal" | "warning" | "critical" {
  const status = input.status;
  const minutes = Math.max(0, Math.round(input.minutesInState));

  if (!status) return "normal";

  if (status === "WAITING") {
    if (minutes >= input.thresholds.waitingCriticalMin) return "critical";
    if (minutes >= input.thresholds.waitingWarningMin) return "warning";
    return "normal";
  }

  if (status === "CALLED") {
    const warning = input.thresholds.calledWarningMin;
    const critical = Math.min(RECEPTION_SLA_MAX, warning * 2);
    if (minutes >= critical) return "critical";
    if (minutes >= warning) return "warning";
    return "normal";
  }

  if (status === "IN_SERVICE") {
    const critical = input.thresholds.inServiceMaxMin;
    const warning = Math.max(RECEPTION_SLA_MIN, Math.round(critical * 0.8));
    if (minutes >= critical) return "critical";
    if (minutes >= warning) return "warning";
    return "normal";
  }

  if (status === "PAUSED") {
    const warning = input.thresholds.pausedWarningMin;
    const critical = Math.min(RECEPTION_SLA_MAX, warning * 2);
    if (minutes >= critical) return "critical";
    if (minutes >= warning) return "warning";
    return "normal";
  }

  return "normal";
}
