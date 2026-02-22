import "server-only";

import { OperationalArea, QueueItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { getTicketDateKey } from "@/lib/reception/ticketing.service";
import { RECEPTION_AREA_LABELS } from "@/lib/reception/constants";
import { classifyQueueSla } from "@/lib/reception/sla-config";
import { getReceptionSlaPolicy } from "@/lib/reception/sla-settings.service";
import type { SlaAlert, SlaSeverity } from "@/lib/reception/dashboard.types";

const QUEUE_SATURATION_WARNING = 15;
const QUEUE_SATURATION_CRITICAL = 25;

const DOCTOR_LOAD_WARNING = 3;
const DOCTOR_LOAD_CRITICAL = 5;

function diffMinutes(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

function getThresholdForSeverity(params: {
  status: QueueItemStatus;
  severity: SlaSeverity;
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
  calledWarningMin: number;
  pausedWarningMin: number;
}) {
  if (params.status === QueueItemStatus.WAITING) {
    return params.severity === "CRITICAL" ? params.waitingCriticalMin : params.waitingWarningMin;
  }
  if (params.status === QueueItemStatus.CALLED) {
    return params.severity === "CRITICAL" ? Math.min(240, params.calledWarningMin * 2) : params.calledWarningMin;
  }
  if (params.status === QueueItemStatus.IN_SERVICE) {
    return params.severity === "CRITICAL"
      ? params.inServiceMaxMin
      : Math.max(1, Math.round(params.inServiceMaxMin * 0.8));
  }
  if (params.status === QueueItemStatus.PAUSED) {
    return params.severity === "CRITICAL" ? Math.min(240, params.pausedWarningMin * 2) : params.pausedWarningMin;
  }
  return 0;
}

export async function getSlaAlerts(input: { siteId: string }): Promise<SlaAlert[]> {
  const dateKey = getTicketDateKey();
  const now = new Date();
  const policy = await getReceptionSlaPolicy(input.siteId);

  let queueItems: Array<{
    id: string;
    status: QueueItemStatus;
    enqueuedAt: Date;
    calledAt: Date | null;
    startedAt: Date | null;
    pausedAt: Date | null;
    visitId: string;
    assignedToUserId: string | null;
    queue: { area: OperationalArea };
  }> = [];

  try {
    queueItems = await prisma.queueItem.findMany({
      where: {
        queue: { siteId: input.siteId },
        visit: { ticketDateKey: dateKey },
        status: {
          in: [QueueItemStatus.WAITING, QueueItemStatus.CALLED, QueueItemStatus.IN_SERVICE, QueueItemStatus.PAUSED]
        }
      },
      select: {
        id: true,
        status: true,
        enqueuedAt: true,
        calledAt: true,
        startedAt: true,
        pausedAt: true,
        visitId: true,
        assignedToUserId: true,
        queue: { select: { area: true } }
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getSlaAlerts", error);
      return [];
    }
    throw error;
  }

  const alerts: SlaAlert[] = [];

  const waitingByArea = new Map<OperationalArea, number>();
  const inServiceByDoctor = new Map<string, number>();

  for (const item of queueItems) {
    const thresholds = policy.areaThresholds[item.queue.area] ?? policy.thresholds;

    if (item.status === QueueItemStatus.WAITING) {
      const minutes = diffMinutes(item.enqueuedAt, now);
      const sla = classifyQueueSla({ status: item.status, minutesInState: minutes, thresholds });

      if (sla === "warning" || sla === "critical") {
        const severity: SlaSeverity = sla === "critical" ? "CRITICAL" : "WARNING";
        const threshold = getThresholdForSeverity({ status: item.status, severity, ...thresholds });
        const areaLabel = RECEPTION_AREA_LABELS[item.queue.area] ?? item.queue.area;
        alerts.push({
          type: "WAITING_TOO_LONG",
          severity,
          visitId: item.visitId,
          queueItemId: item.id,
          area: item.queue.area,
          minutesExcedidos: minutes - threshold,
          message: `Paciente en espera ${minutes} min en ${areaLabel}.`
        });
      }

      waitingByArea.set(item.queue.area, (waitingByArea.get(item.queue.area) ?? 0) + 1);
      continue;
    }

    if (item.status === QueueItemStatus.CALLED && item.calledAt) {
      const minutes = diffMinutes(item.calledAt, now);
      const sla = classifyQueueSla({ status: item.status, minutesInState: minutes, thresholds });
      if (sla === "warning" || sla === "critical") {
        const severity: SlaSeverity = sla === "critical" ? "CRITICAL" : "WARNING";
        const threshold = getThresholdForSeverity({ status: item.status, severity, ...thresholds });
        alerts.push({
          type: "CALLED_TOO_LONG",
          severity,
          visitId: item.visitId,
          queueItemId: item.id,
          area: item.queue.area,
          minutesExcedidos: minutes - threshold,
          message: `Paciente llamado sin iniciar atención (${minutes} min).`
        });
      }
      continue;
    }

    if (item.status === QueueItemStatus.IN_SERVICE && item.startedAt) {
      const minutes = diffMinutes(item.startedAt, now);
      const sla = classifyQueueSla({ status: item.status, minutesInState: minutes, thresholds });

      if (sla === "warning" || sla === "critical") {
        const severity: SlaSeverity = sla === "critical" ? "CRITICAL" : "WARNING";
        const threshold = getThresholdForSeverity({ status: item.status, severity, ...thresholds });
        const areaLabel = RECEPTION_AREA_LABELS[item.queue.area] ?? item.queue.area;
        alerts.push({
          type: "IN_SERVICE_TOO_LONG",
          severity,
          visitId: item.visitId,
          queueItemId: item.id,
          area: item.queue.area,
          minutesExcedidos: minutes - threshold,
          message: `Atención en curso ${minutes} min en ${areaLabel}.`
        });
      }

      if (item.assignedToUserId) {
        inServiceByDoctor.set(item.assignedToUserId, (inServiceByDoctor.get(item.assignedToUserId) ?? 0) + 1);
      }
      continue;
    }

    if (item.status === QueueItemStatus.PAUSED && item.pausedAt) {
      const minutes = diffMinutes(item.pausedAt, now);
      const sla = classifyQueueSla({ status: item.status, minutesInState: minutes, thresholds });
      if (sla === "warning" || sla === "critical") {
        const severity: SlaSeverity = sla === "critical" ? "CRITICAL" : "WARNING";
        const threshold = getThresholdForSeverity({ status: item.status, severity, ...thresholds });
        alerts.push({
          type: "PAUSED_TOO_LONG",
          severity,
          visitId: item.visitId,
          queueItemId: item.id,
          area: item.queue.area,
          minutesExcedidos: minutes - threshold,
          message: `Turno en pausa ${minutes} min.`
        });
      }
    }
  }

  for (const [area, count] of waitingByArea.entries()) {
    const areaLabel = RECEPTION_AREA_LABELS[area] ?? area;
    if (count >= QUEUE_SATURATION_CRITICAL) {
      alerts.push({
        type: "QUEUE_SATURATED",
        severity: "CRITICAL",
        area,
        count,
        message: `Cola saturada en ${areaLabel} (${count} en espera).`
      });
    } else if (count >= QUEUE_SATURATION_WARNING) {
      alerts.push({
        type: "QUEUE_SATURATED",
        severity: "WARNING",
        area,
        count,
        message: `Cola con alta espera en ${areaLabel} (${count} en espera).`
      });
    }
  }

  for (const [userId, count] of inServiceByDoctor.entries()) {
    if (count >= DOCTOR_LOAD_CRITICAL) {
      alerts.push({
        type: "PHYSICIAN_OVERLOAD",
        severity: "CRITICAL",
        userId,
        count,
        message: `Médico con carga crítica (${count} atenciones en curso).`
      });
    } else if (count >= DOCTOR_LOAD_WARNING) {
      alerts.push({
        type: "PHYSICIAN_OVERLOAD",
        severity: "WARNING",
        userId,
        count,
        message: `Médico con alta carga (${count} atenciones en curso).`
      });
    }
  }

  return alerts;
}
