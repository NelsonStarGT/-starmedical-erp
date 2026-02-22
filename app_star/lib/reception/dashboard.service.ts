import "server-only";

import {
  AppointmentStatus,
  ClientProfileType,
  OperationalArea,
  QueueItemStatus,
  VisitStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { ACTIVE_QUEUE_ITEM_STATUSES } from "@/lib/reception/queue-guards";
import { classifyQueueSla } from "@/lib/reception/sla-config";
import { getReceptionSlaPolicy } from "@/lib/reception/sla-settings.service";
import { getTicketDateKey } from "@/lib/reception/ticketing.service";
import { extractScheduleRangesForDate } from "@/lib/config-central/hours";
import { isCentralConfigCompatError, warnDevCentralCompat } from "@/lib/config-central";
import { selectVigenteBranchBusinessHours } from "@/lib/portal/appointmentsAvailability";
import type {
  AvailabilitySnapshot,
  QueueOverviewItem,
  ReceptionDashboardAreaSummary,
  ReceptionDashboardLiteSnapshot,
  ReceptionDashboardTopWaitingItem,
  QueueStatusCounts,
  ReceptionRecentEvent,
  ReceptionUpcomingAppointment,
  ReceptionWorklistItem,
  VisitStatusCounts,
  WorklistFilters
} from "@/lib/reception/dashboard.types";

const ACTIVE_VISIT_STATUSES: VisitStatus[] = [
  VisitStatus.ARRIVED,
  VisitStatus.CHECKED_IN,
  VisitStatus.IN_QUEUE,
  VisitStatus.CALLED,
  VisitStatus.IN_SERVICE,
  VisitStatus.IN_DIAGNOSTIC,
  VisitStatus.READY_FOR_DISCHARGE,
  VisitStatus.ON_HOLD
];

const AREAS: OperationalArea[] = [
  OperationalArea.CONSULTATION,
  OperationalArea.LAB,
  OperationalArea.XRAY,
  OperationalArea.ULTRASOUND,
  OperationalArea.URGENT_CARE
];

function toMinutes(deltaMs: number): number {
  return Math.max(0, Math.round(deltaMs / 60000));
}

function getLocalDayRange(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  const start = new Date(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  const end = new Date(year, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999);
  return { start, end };
}

function buildPatientDisplayName(firstName?: string | null, lastName?: string | null): string {
  const cleanFirst = (firstName ?? "").trim();
  const cleanLast = (lastName ?? "").trim();
  if (!cleanFirst && !cleanLast) return "Paciente";
  if (!cleanLast) return cleanFirst || "Paciente";
  return `${cleanFirst} ${cleanLast.charAt(0).toUpperCase()}.`;
}

export async function getVisitStatusCounts(input: { siteId: string }): Promise<VisitStatusCounts> {
  const dateKey = getTicketDateKey();
  try {
    const grouped = await prisma.visit.groupBy({
      by: ["status"],
      where: {
        siteId: input.siteId,
        ticketDateKey: dateKey,
        status: { in: ACTIVE_VISIT_STATUSES }
      },
      _count: { _all: true }
    });

    const counts = new Map(grouped.map((row) => [row.status, row._count._all]));

    const arrived = counts.get(VisitStatus.ARRIVED) ?? 0;
    const checkedIn = counts.get(VisitStatus.CHECKED_IN) ?? 0;
    const inQueue = counts.get(VisitStatus.IN_QUEUE) ?? 0;
    const called = counts.get(VisitStatus.CALLED) ?? 0;
    const inService = counts.get(VisitStatus.IN_SERVICE) ?? 0;
    const inDiagnostic = counts.get(VisitStatus.IN_DIAGNOSTIC) ?? 0;
    const readyForDischarge = counts.get(VisitStatus.READY_FOR_DISCHARGE) ?? 0;
    const onHold = counts.get(VisitStatus.ON_HOLD) ?? 0;

    return {
      siteId: input.siteId,
      dateKey,
      arrived,
      checkedIn,
      inQueue,
      called,
      inService,
      inDiagnostic,
      readyForDischarge,
      onHold,
      totalActive:
        arrived +
        checkedIn +
        inQueue +
        called +
        inService +
        inDiagnostic +
        readyForDischarge +
        onHold
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getVisitStatusCounts", error);
      return {
        siteId: input.siteId,
        dateKey,
        arrived: 0,
        checkedIn: 0,
        inQueue: 0,
        called: 0,
        inService: 0,
        inDiagnostic: 0,
        readyForDischarge: 0,
        onHold: 0,
        totalActive: 0
      };
    }
    throw error;
  }
}

export async function getQueueStatusCounts(input: { siteId: string }): Promise<QueueStatusCounts> {
  const dateKey = getTicketDateKey();
  try {
    const grouped = await prisma.queueItem.groupBy({
      by: ["status"],
      where: {
        queue: { siteId: input.siteId },
        visit: { ticketDateKey: dateKey },
        status: {
          in: [
            QueueItemStatus.WAITING,
            QueueItemStatus.CALLED,
            QueueItemStatus.IN_SERVICE,
            QueueItemStatus.COMPLETED
          ]
        }
      },
      _count: { _all: true }
    });

    const counts = new Map(grouped.map((row) => [row.status, row._count._all]));

    return {
      siteId: input.siteId,
      dateKey,
      waiting: counts.get(QueueItemStatus.WAITING) ?? 0,
      called: counts.get(QueueItemStatus.CALLED) ?? 0,
      inService: counts.get(QueueItemStatus.IN_SERVICE) ?? 0,
      completed: counts.get(QueueItemStatus.COMPLETED) ?? 0
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getQueueStatusCounts", error);
      return {
        siteId: input.siteId,
        dateKey,
        waiting: 0,
        called: 0,
        inService: 0,
        completed: 0
      };
    }
    throw error;
  }
}

export async function getQueueOverview(input: { siteId: string }): Promise<QueueOverviewItem[]> {
  const dateKey = getTicketDateKey();
  try {
    const queues = await prisma.queue.findMany({
      where: {
        siteId: input.siteId,
        area: { in: AREAS }
      },
      select: {
        id: true,
        area: true
      }
    });

    const queueIds = queues.map((queue) => queue.id);
    const counts = queueIds.length
      ? await prisma.queueItem.groupBy({
          by: ["queueId", "status"],
          where: {
            queueId: { in: queueIds },
            visit: { ticketDateKey: dateKey }
          },
          _count: { _all: true }
        })
      : [];

    const waitingItems = queueIds.length
      ? await prisma.queueItem.findMany({
          where: {
            queueId: { in: queueIds },
            status: QueueItemStatus.WAITING,
            visit: { ticketDateKey: dateKey }
          },
          select: {
            queueId: true,
            enqueuedAt: true
          }
        })
      : [];

    const calledItems = queueIds.length
      ? await prisma.queueItem.findMany({
          where: {
            queueId: { in: queueIds },
            status: QueueItemStatus.CALLED,
            visit: { ticketDateKey: dateKey }
          },
          orderBy: { calledAt: "desc" },
          select: {
            queueId: true,
            calledAt: true,
            visit: { select: { ticketCode: true } },
            queue: { select: { area: true } }
          }
        })
      : [];

    const countsByQueue = new Map<string, Record<string, number>>();
    for (const row of counts) {
      const current = countsByQueue.get(row.queueId) ?? {};
      current[row.status] = row._count._all;
      countsByQueue.set(row.queueId, current);
    }

    const waitByQueue = new Map<string, number[]>();
    const now = Date.now();
    for (const item of waitingItems) {
      const bucket = waitByQueue.get(item.queueId) ?? [];
      bucket.push(now - item.enqueuedAt.getTime());
      waitByQueue.set(item.queueId, bucket);
    }

    const lastCalledByArea = new Map<OperationalArea, string | null>();
    for (const item of calledItems) {
      if (!item.queue?.area) continue;
      if (!lastCalledByArea.has(item.queue.area)) {
        lastCalledByArea.set(item.queue.area, item.visit?.ticketCode ?? null);
      }
    }

    return AREAS.map((area) => {
      const queue = queues.find((row) => row.area === area);
      const queueId = queue?.id;
      const statusCounts = queueId ? countsByQueue.get(queueId) ?? {} : {};

      const waitTimes = queueId ? waitByQueue.get(queueId) ?? [] : [];
      const avgWait =
        waitTimes.length > 0
          ? Math.round(waitTimes.reduce((sum, ms) => sum + ms, 0) / waitTimes.length / 60000)
          : null;

      return {
        area,
        totalEnCola: statusCounts[QueueItemStatus.WAITING] ?? 0,
        llamados: statusCounts[QueueItemStatus.CALLED] ?? 0,
        enAtencion: statusCounts[QueueItemStatus.IN_SERVICE] ?? 0,
        pausados: statusCounts[QueueItemStatus.PAUSED] ?? 0,
        tiempoPromedioEspera: avgWait,
        ticketActualLlamado: lastCalledByArea.get(area) ?? null
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getQueueOverview", error);
      return AREAS.map((area) => ({
        area,
        totalEnCola: 0,
        llamados: 0,
        enAtencion: 0,
        pausados: 0,
        tiempoPromedioEspera: null,
        ticketActualLlamado: null
      }));
    }
    throw error;
  }
}

export async function getReceptionWorklist(input: {
  siteId: string;
  filters?: WorklistFilters;
}): Promise<ReceptionWorklistItem[]> {
  const dateKey = getTicketDateKey();
  try {
    const slaPolicy = await getReceptionSlaPolicy(input.siteId);
    const where: Prisma.VisitWhereInput = {
      siteId: input.siteId,
      ticketDateKey: dateKey,
      status: { in: ACTIVE_VISIT_STATUSES }
    };

    if (input.filters?.status) {
      where.status = input.filters.status;
    }

    if (input.filters?.priority) {
      where.priority = input.filters.priority;
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { statusChangedAt: "desc" },
      select: {
        id: true,
        appointmentId: true,
        ticketCode: true,
        currentArea: true,
        status: true,
        priority: true,
        statusChangedAt: true,
        visitVitals: { select: { id: true } },
        appointment: {
          select: {
            companyId: true,
            receptionVitals: { select: { id: true } }
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            affiliationsAsPerson: {
              where: {
                deletedAt: null,
                entityType: { in: [ClientProfileType.COMPANY, ClientProfileType.INSTITUTION, ClientProfileType.INSURER] }
              },
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: {
                role: true,
                status: true,
                entity: {
                  select: {
                    id: true,
                    companyName: true,
                    tradeName: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        queueItems: {
          where: { status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            assignedToUserId: true,
            roomId: true,
            enqueuedAt: true,
            calledAt: true,
            startedAt: true,
            pausedAt: true,
            queue: {
              select: { area: true }
            }
          }
        }
      }
    });

    const appointmentCompanyIds = Array.from(
      new Set(
        visits
          .map((visit) => visit.appointment?.companyId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const appointmentCompanies = appointmentCompanyIds.length
      ? await prisma.clientProfile.findMany({
          where: { id: { in: appointmentCompanyIds } },
          select: { id: true, companyName: true, tradeName: true, firstName: true, lastName: true }
        })
      : [];

    const appointmentCompanyById = new Map(
      appointmentCompanies.map((row) => [
        row.id,
        row.companyName || row.tradeName || [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "Empresa"
      ])
    );

    const now = Date.now();

    const items = visits.map<ReceptionWorklistItem>((visit) => {
      const queueItem = visit.queueItems[0] ?? null;
      const areaActual = queueItem?.queue.area ?? visit.currentArea;
      const timeReference = queueItem
        ? queueItem.status === "CALLED"
          ? queueItem.calledAt ?? queueItem.enqueuedAt
          : queueItem.status === "IN_SERVICE"
            ? queueItem.startedAt ?? queueItem.calledAt ?? queueItem.enqueuedAt
            : queueItem.status === "PAUSED"
              ? queueItem.pausedAt ?? queueItem.enqueuedAt
              : queueItem.enqueuedAt
        : visit.statusChangedAt;
      const timeInState = toMinutes(now - timeReference.getTime());
      const thresholds = slaPolicy.areaThresholds[areaActual] ?? slaPolicy.thresholds;
      const slaState = classifyQueueSla({
        status: queueItem?.status ?? null,
        minutesInState: timeInState,
        thresholds
      });

      const affiliation = visit.patient.affiliationsAsPerson[0] ?? null;
      const affiliationEntityName = affiliation?.entity
        ? affiliation.entity.companyName ||
          affiliation.entity.tradeName ||
          [affiliation.entity.firstName, affiliation.entity.lastName].filter(Boolean).join(" ").trim() ||
          "Empresa"
        : null;
      const appointmentCompanyId = visit.appointment?.companyId ?? null;
      const appointmentCompanyName = appointmentCompanyId ? appointmentCompanyById.get(appointmentCompanyId) ?? null : null;
      const companyId = appointmentCompanyId ?? affiliation?.entity?.id ?? null;
      const companyName = appointmentCompanyName ?? affiliationEntityName;
      const authorizationStatus = affiliation?.status ?? null;
      const convenioPlan = affiliation?.role ?? null;
      const vitalsStatus =
        visit.visitVitals?.id || visit.appointment?.receptionVitals?.id ? ("COMPLETE" as const) : ("PENDING" as const);

      const nextAction = (() => {
        if (vitalsStatus === "PENDING") return "Registrar signos";
        if ((queueItem?.status === "WAITING" || visit.status === "IN_QUEUE") && slaState === "critical") return "Llamar";
        if (queueItem?.status === "CALLED") return "Iniciar atención";
        if (queueItem?.status === "IN_SERVICE") return "Finalizar atención";
        if (!queueItem) return "Encolar";
        return "Monitorear";
      })();

      return {
        visitId: visit.id,
        queueItemId: queueItem?.id ?? null,
        ticketCode: visit.ticketCode ?? null,
        patientDisplayName: buildPatientDisplayName(visit.patient?.firstName, visit.patient?.lastName),
        areaActual,
        estadoVisita: visit.status,
        estadoCola: queueItem?.status ?? null,
        prioridad: visit.priority,
        tiempoEnEstado: timeInState,
        slaState,
        vitalsStatus,
        companyId,
        companyName: companyName ?? null,
        convenioPlan,
        authorizationStatus,
        nextAction,
        assignedRoomId: queueItem?.roomId ?? null,
        assignedUserId: queueItem?.assignedToUserId ?? null
      };
    });

    let filtered = items;
    if (input.filters?.area) {
      filtered = filtered.filter((item) => item.areaActual === input.filters!.area);
    }
    if (input.filters?.minMinutesInState && input.filters.minMinutesInState > 0) {
      filtered = filtered.filter((item) => item.tiempoEnEstado >= input.filters!.minMinutesInState!);
    }
    if (input.filters?.companyOnly) {
      filtered = filtered.filter((item) => Boolean(item.companyId));
    }
    if (input.filters?.companyClientId) {
      filtered = filtered.filter((item) => item.companyId === input.filters?.companyClientId);
    }
    if (input.filters?.onlyPendingAuthorization) {
      filtered = filtered.filter(
        (item) => Boolean(item.authorizationStatus) && item.authorizationStatus !== "ACTIVE"
      );
    }

    return filtered;
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getReceptionWorklist", error);
      return [];
    }
    throw error;
  }
}

export async function getReceptionDashboardLite(input: { siteId: string }): Promise<ReceptionDashboardLiteSnapshot> {
  const [worklist, upcomingAppointments60m] = await Promise.all([
    getReceptionWorklist({ siteId: input.siteId }),
    (async () => {
      const now = new Date();
      const plus60 = new Date(now.getTime() + 60 * 60000);
      return prisma.appointment.count({
        where: {
          branchId: input.siteId,
          date: { gte: now, lte: plus60 },
          status: { notIn: [AppointmentStatus.CANCELADA, AppointmentStatus.NO_SHOW, AppointmentStatus.ATENDIDA] }
        }
      });
    })()
  ]);

  const monitored = worklist.filter((row) => Boolean(row.estadoCola));
  const waitingRows = worklist.filter((row) => row.estadoCola === QueueItemStatus.WAITING);
  const warningCount = monitored.filter((row) => row.slaState === "warning").length;
  const criticalCount = monitored.filter((row) => row.slaState === "critical").length;
  const totalMonitored = monitored.length || 1;
  const avgWaitTodayMin =
    waitingRows.length > 0
      ? Math.round(waitingRows.reduce((acc, row) => acc + row.tiempoEnEstado, 0) / waitingRows.length)
      : 0;

  const areaSummary: ReceptionDashboardAreaSummary[] = AREAS.map((area) => {
    const rows = waitingRows.filter((row) => row.areaActual === area);
    const waitingCount = rows.length;
    const avgWaitMin = waitingCount
      ? Math.round(rows.reduce((acc, row) => acc + row.tiempoEnEstado, 0) / waitingCount)
      : 0;
    const maxWaitMin = waitingCount ? Math.max(...rows.map((row) => row.tiempoEnEstado)) : 0;
    return {
      area,
      waitingCount,
      avgWaitMin,
      maxWaitMin
    };
  });

  const bottleneckAreas = [...areaSummary]
    .filter((row) => row.waitingCount > 0)
    .sort((a, b) => {
      if (b.waitingCount !== a.waitingCount) return b.waitingCount - a.waitingCount;
      return b.avgWaitMin - a.avgWaitMin;
    })
    .slice(0, 2)
    .map((row) => ({
      area: row.area,
      waitingCount: row.waitingCount,
      avgWaitMin: row.avgWaitMin
    }));

  const topWaiting: ReceptionDashboardTopWaitingItem[] = [...waitingRows]
    .sort((a, b) => b.tiempoEnEstado - a.tiempoEnEstado)
    .slice(0, 10)
    .map((row) => ({
      visitId: row.visitId,
      queueItemId: row.queueItemId ?? row.visitId,
      ticketCode: row.ticketCode,
      patientDisplayName: row.patientDisplayName,
      area: row.areaActual,
      minutesWaiting: row.tiempoEnEstado,
      slaState: row.slaState
    }));

  return {
    siteId: input.siteId,
    generatedAt: new Date().toISOString(),
    kpis: {
      patientsInSala: worklist.length,
      avgWaitTodayMin,
      warningPercent: Number(((warningCount / totalMonitored) * 100).toFixed(1)),
      criticalPercent: Number(((criticalCount / totalMonitored) * 100).toFixed(1)),
      inServiceCount: worklist.filter((row) => row.estadoCola === QueueItemStatus.IN_SERVICE).length,
      bottleneckAreas,
      upcomingAppointments60m
    },
    topWaiting,
    areaSummary
  };
}

export async function getAvailabilitySnapshot(input: { siteId: string }): Promise<AvailabilitySnapshot> {
  const dateKey = getTicketDateKey();
  try {
    const items = await prisma.queueItem.findMany({
      where: {
        status: QueueItemStatus.IN_SERVICE,
        assignedToUserId: { not: null },
        queue: { siteId: input.siteId },
        visit: { ticketDateKey: dateKey }
      },
      select: {
        assignedToUserId: true
      }
    });

    const counts = new Map<string, number>();
    for (const item of items) {
      const userId = item.assignedToUserId;
      if (!userId) continue;
      counts.set(userId, (counts.get(userId) ?? 0) + 1);
    }

    const { start, end } = getLocalDayRange(dateKey);
    const scheduled = await prisma.appointment.findMany({
      where: {
        branchId: input.siteId,
        date: { gte: start, lte: end },
        status: { notIn: [AppointmentStatus.CANCELADA, AppointmentStatus.NO_SHOW] }
      },
      select: { specialistId: true }
    });

    const scheduledDoctors = new Set(scheduled.map((row) => row.specialistId).filter(Boolean));

    let branchHoursConfigured = false;
    let branchHoursMessage: string | null = null;
    try {
      const hoursRows = await prisma.branchBusinessHours.findMany({
        where: {
          branchId: input.siteId,
          isActive: true,
          validFrom: { lte: end },
          OR: [{ validTo: null }, { validTo: { gte: start } }]
        },
        orderBy: [{ validFrom: "desc" }],
        take: 25,
        select: {
          id: true,
          validFrom: true,
          validTo: true,
          isActive: true,
          scheduleJson: true,
          slotMinutesDefault: true
        }
      });

      const vigente = selectVigenteBranchBusinessHours(hoursRows, new Date());
      if (!vigente) {
        branchHoursMessage = "Sin horario vigente publicado para la sede activa.";
      } else {
        const ranges = extractScheduleRangesForDate(vigente.scheduleJson, new Date());
        if (ranges.length === 0) {
          branchHoursMessage = "La sede activa no tiene bloques horarios configurados para hoy.";
        } else {
          branchHoursConfigured = true;
        }
      }
    } catch (error) {
      if (isCentralConfigCompatError(error)) {
        warnDevCentralCompat("reception.availability.branchHours", error);
        branchHoursConfigured = false;
        branchHoursMessage = "Horario de sucursal no disponible. Revisa Configuración Central.";
      } else {
        throw error;
      }
    }

    return {
      siteId: input.siteId,
      dateKey,
      busyDoctors: counts.size,
      availableDoctors: Math.max(0, scheduledDoctors.size - counts.size),
      absentDoctors: 0,
      roomsAvailable: 0,
      roomsOccupied: 0,
      branchHoursConfigured,
      branchHoursMessage,
      visitsInServiceByDoctor: Array.from(counts.entries()).map(([userId, count]) => ({
        userId,
        count
      }))
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getAvailabilitySnapshot", error);
      return {
        siteId: input.siteId,
        dateKey,
        busyDoctors: 0,
        availableDoctors: 0,
        absentDoctors: 0,
        roomsAvailable: 0,
        roomsOccupied: 0,
        branchHoursConfigured: false,
        branchHoursMessage: "No se pudo validar el horario de la sede.",
        visitsInServiceByDoctor: []
      };
    }
    throw error;
  }
}

export async function getReceptionUpcomingAppointments(input: {
  siteId: string;
  limit?: number;
  includePastMinutes?: number;
}): Promise<ReceptionUpcomingAppointment[]> {
  const dateKey = getTicketDateKey();
  try {
    const { start, end } = getLocalDayRange(dateKey);
    const now = new Date();
    const limit = input.limit ?? 10;
    const includePastMinutes = input.includePastMinutes ?? 60;
    const windowStart = new Date(Math.max(start.getTime(), now.getTime() - includePastMinutes * 60000));

    const appointments = await prisma.appointment.findMany({
      where: {
        branchId: input.siteId,
        date: { gte: windowStart, lte: end }
      },
      orderBy: { date: "asc" },
      take: limit,
      select: {
        id: true,
        date: true,
        durationMin: true,
        status: true,
        patientId: true,
        specialistId: true,
        type: { select: { name: true } },
        room: { select: { name: true } },
        visits: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, ticketCode: true }
        }
      }
    });

    const patientIds = Array.from(new Set(appointments.map((row) => row.patientId)));
    const specialistIds = Array.from(new Set(appointments.map((row) => row.specialistId)));

    const [patients, specialists] = await Promise.all([
      prisma.clientProfile.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, firstName: true, lastName: true, phone: true }
      }),
      prisma.user.findMany({
        where: { id: { in: specialistIds } },
        select: { id: true, name: true, email: true }
      })
    ]);

    const patientById = new Map(patients.map((row) => [row.id, row]));
    const specialistById = new Map(specialists.map((row) => [row.id, row]));

    return appointments.map((row) => {
      const patient = patientById.get(row.patientId);
      const specialist = specialistById.get(row.specialistId);
      const patientName = buildPatientDisplayName(patient?.firstName, patient?.lastName);

      return {
        id: row.id,
        scheduledAt: row.date.toISOString(),
        durationMin: row.durationMin,
        status: row.status,
        patientId: row.patientId,
        patientName,
        patientPhone: patient?.phone ?? null,
        specialistId: row.specialistId,
        specialistName: specialist?.name ?? specialist?.email ?? null,
        typeName: row.type?.name ?? null,
        roomName: row.room?.name ?? null,
        visitId: row.visits[0]?.id ?? null,
        visitTicketCode: row.visits[0]?.ticketCode ?? null
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getReceptionUpcomingAppointments", error);
      return [];
    }
    throw error;
  }
}

export async function getReceptionRecentEvents(input: { siteId: string; limit?: number }): Promise<ReceptionRecentEvent[]> {
  const dateKey = getTicketDateKey();
  const limit = input.limit ?? 18;

  try {
    const events = await prisma.visitEvent.findMany({
      where: {
        visit: { siteId: input.siteId, ticketDateKey: dateKey }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventType: true,
        note: true,
        area: true,
        createdAt: true,
        actorUser: { select: { name: true, email: true } },
        visit: { select: { id: true, ticketCode: true } }
      }
    });

    return events.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      eventType: row.eventType,
      note: row.note ?? null,
      actorName: row.actorUser?.name ?? row.actorUser?.email ?? null,
      area: row.area ?? null,
      visitId: row.visit.id,
      ticketCode: row.visit.ticketCode ?? null
    }));
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getReceptionRecentEvents", error);
      return [];
    }
    throw error;
  }
}
