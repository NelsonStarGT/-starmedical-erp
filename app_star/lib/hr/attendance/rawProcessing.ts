import { addDays } from "date-fns";
import {
  AttendanceFaceStatus,
  AttendanceIncident,
  AttendanceIncidentSeverity,
  AttendanceIncidentType,
  AttendanceProcessedDay,
  AttendanceProcessedStatus,
  AttendanceRawEvent,
  AttendanceRawEventSource,
  AttendanceRawEventType,
  AttendanceZoneStatus,
  Prisma,
  PrismaClient
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateSequence } from "./events";
import { computeDayFromRaw, selectShiftForDay, severityFor } from "./engine";

type Tx = PrismaClient | Prisma.TransactionClient;

export type RawEventInput = {
  id?: string;
  employeeId: string;
  type: AttendanceRawEventType;
  occurredAt: Date;
  siteId?: string | null;
  customerId?: string | null;
  zoneStatus?: AttendanceZoneStatus | null;
  faceStatus?: AttendanceFaceStatus | null;
};

export type ProcessedDayComputation = {
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lunchMinutes: number;
  effectiveMinutes: number;
  lateMinutes: number;
  status: AttendanceProcessedStatus;
  incidents: AttendanceIncidentType[];
  needsApproval: boolean;
  shiftId?: string | null;
};

const MINUTE_IN_MS = 60 * 1000;

const diffMinutes = (start: Date, end: Date) => Math.max(0, Math.round((end.getTime() - start.getTime()) / MINUTE_IN_MS));

const dedupe = (items: AttendanceIncidentType[]) => Array.from(new Set(items));

const startOfUtcDay = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export function computeProcessedDayFromRaw(rawEvents: RawEventInput[]): ProcessedDayComputation {
  const date = rawEvents[0]?.occurredAt ? startOfUtcDay(rawEvents[0].occurredAt) : startOfUtcDay(new Date());
  const mapped: AttendanceRawEvent[] = rawEvents.map((ev) => ({
    id: ev.id || "",
    employeeId: ev.employeeId,
    occurredAt: ev.occurredAt,
    type: ev.type,
    source: AttendanceRawEventSource.SELFIE_WEB,
    status: "NEW",
    errorMessage: null,
    branchId: null,
    biometricId: null,
    siteId: ev.siteId || null,
    customerId: ev.customerId || null,
    zoneStatus: ev.zoneStatus || null,
    faceStatus: ev.faceStatus || null,
    faceScore: null,
    lat: null,
    lng: null,
    accuracy: null,
    photoUrl: null,
    photoHash: null,
    payloadJson: null,
    deviceTime: null,
    rawPayload: null,
    importBatchId: null,
    createdByUserId: null,
    createdAt: ev.occurredAt
  }));
  const computed = computeDayFromRaw({ date, rawEvents: mapped, shift: null });
  return {
    firstIn: computed.firstIn,
    lastOut: computed.lastOut,
    workedMinutes: computed.workedMinutes,
    breakMinutes: computed.breakMinutes,
    overtimeMinutes: computed.overtimeMinutes,
    lunchMinutes: computed.lunchMinutes,
    effectiveMinutes: computed.effectiveMinutes,
    lateMinutes: computed.lateMinutes,
    status: computed.status,
    incidents: computed.incidentTypes,
    needsApproval: computed.needsApproval,
    shiftId: null
  };
}

async function upsertIncidents(params: {
  tx: Prisma.TransactionClient;
  employeeId: string;
  date: Date;
  siteId?: string | null;
  customerId?: string | null;
  incidentTypes: AttendanceIncidentType[];
  rawEventId?: string | null;
  processedDayId?: string | null;
}) {
  const { tx, incidentTypes, employeeId, date, siteId, customerId, rawEventId, processedDayId } = params;
  const payloads = dedupe(incidentTypes);
  const results: AttendanceIncident[] = [];
  for (const type of payloads) {
    const severity = severityFor(type);
    const result = await tx.attendanceIncident.upsert({
      where: { employeeId_date_type: { employeeId, date, type } },
      update: {
        severity,
        siteId: siteId || null,
        customerId: customerId || null,
        rawEventId: rawEventId || undefined,
        processedDayId: processedDayId || undefined,
        resolved: false,
        resolvedAt: null,
        resolvedByUserId: null
      },
      create: {
        employeeId,
        date,
        type,
        severity,
        siteId: siteId || null,
        customerId: customerId || null,
        rawEventId: rawEventId || null,
        processedDayId: processedDayId || null,
        resolved: false
      }
    });
    results.push(result);
  }
  return results;
}

export async function ingestRawAttendanceEvent(params: {
  data: {
    employeeId: string;
    siteId?: string | null;
    customerId?: string | null;
    occurredAt?: Date | null;
    deviceTime?: Date | null;
    type: AttendanceRawEventType;
    source: AttendanceRawEventSource;
    lat?: number | null;
    lng?: number | null;
    accuracy?: number | null;
    zoneStatus?: AttendanceZoneStatus | null;
    photoUrl?: string | null;
    photoHash?: string | null;
    faceStatus?: AttendanceFaceStatus | null;
    faceScore?: number | null;
    rawPayload?: Record<string, any> | null;
    importBatchId?: string | null;
  };
  createdByUserId?: string | null;
  tx?: Tx;
}) {
  const client = params.tx || prisma;
  const occurredAt = params.data.occurredAt ? new Date(params.data.occurredAt) : new Date();
  const deviceTime = params.data.deviceTime ? new Date(params.data.deviceTime) : null;
  const day = startOfUtcDay(occurredAt);
  const dayEnd = addDays(day, 1);

  const run = async (tx: Prisma.TransactionClient) => {
    const employee = await tx.hrEmployee.findUnique({ where: { id: params.data.employeeId }, select: { id: true } });
    if (!employee) {
      throw { status: 404, body: { error: "Empleado no encontrado" } };
    }

    const existing = await tx.attendanceRawEvent.findMany({
      where: { employeeId: params.data.employeeId, occurredAt: { gte: day, lt: dayEnd } },
      select: { occurredAt: true, type: true }
    });

    const created = await tx.attendanceRawEvent.create({
      data: {
        employeeId: params.data.employeeId,
        siteId: params.data.siteId || null,
        customerId: params.data.customerId || null,
        occurredAt,
        deviceTime,
        type: params.data.type,
        source: params.data.source,
        lat: params.data.lat ?? null,
        lng: params.data.lng ?? null,
        accuracy: params.data.accuracy ?? null,
        zoneStatus: params.data.zoneStatus || null,
        photoUrl: params.data.photoUrl || null,
        photoHash: params.data.photoHash || null,
        faceStatus: params.data.faceStatus || null,
        faceScore: params.data.faceScore ?? null,
        rawPayload: params.data.rawPayload || undefined,
        importBatchId: params.data.importBatchId || null,
        createdByUserId: params.createdByUserId || null
      }
    });

    const incidentTypes: AttendanceIncidentType[] = [];
    if (params.data.zoneStatus === "OUT_OF_ZONE") incidentTypes.push(AttendanceIncidentType.OUT_OF_ZONE);
    if (params.data.faceStatus && params.data.faceStatus !== "VERIFIED") incidentTypes.push(AttendanceIncidentType.FACE_MISMATCH);
    if (params.data.type === "CHECK_IN" || params.data.type === "CHECK_OUT") {
      const sequenceEvents = existing.filter((ev) => ev.type === "CHECK_IN" || ev.type === "CHECK_OUT");
      try {
        validateSequence(sequenceEvents as any, { type: params.data.type as any, occurredAt });
      } catch {
        incidentTypes.push(AttendanceIncidentType.SEQUENCE_ERROR);
      }
    }

    const incidents = incidentTypes.length
      ? await upsertIncidents({
          tx,
          employeeId: params.data.employeeId,
          date: day,
          siteId: params.data.siteId,
          customerId: params.data.customerId,
          rawEventId: created.id,
          incidentTypes
        })
      : [];

    return { created, incidents };
  };

  if ("$transaction" in client) {
    return (client as PrismaClient).$transaction((tx) => run(tx));
  }
  return run(client as Prisma.TransactionClient);
}

export async function processAttendanceDayFromRaw(params: { date: Date; siteId?: string | null; tx?: Tx; reprocess?: boolean }) {
  const client = params.tx || prisma;
  const date = startOfUtcDay(params.date);
  const end = addDays(date, 1);
  const where: Prisma.AttendanceRawEventWhereInput = { occurredAt: { gte: date, lt: end } };
  if (params.siteId) where.siteId = params.siteId;

  const run = async (tx: Prisma.TransactionClient) => {
    const rawEvents = await tx.attendanceRawEvent.findMany({
      where,
      orderBy: { occurredAt: "asc" }
    });
    const byEmployee = new Map<string, AttendanceRawEvent[]>();
    rawEvents.forEach((ev) => {
      if (!ev.employeeId) return;
      const list = byEmployee.get(ev.employeeId) || [];
      list.push(ev);
      byEmployee.set(ev.employeeId, list);
    });

    const siteIds = Array.from(new Set(rawEvents.map((r) => r.siteId).filter(Boolean) as string[]));
    const siteShifts = await tx.attendanceShift.findMany({
      where: siteIds.length ? { siteId: { in: siteIds } } : undefined,
      orderBy: { createdAt: "desc" }
    });
    const employeeIds = Array.from(byEmployee.keys());
    const assignments =
      siteIds.length && employeeIds.length
        ? await tx.employeeSiteAssignment.findMany({
            where: {
              siteId: { in: siteIds },
              employeeId: { in: employeeIds },
              startDate: { lte: end },
              OR: [{ endDate: null }, { endDate: { gte: date } }]
            },
            include: { shift: true }
          })
        : [];

    const results: { employeeId: string; processed: AttendanceProcessedDay; incidents: AttendanceIncident[]; computation: ProcessedDayComputation }[] = [];

    for (const [employeeId, events] of byEmployee.entries()) {
      const siteId = params.siteId || events[0]?.siteId || null;
      const shift = selectShiftForDay({ date, siteId, employeeId, assignments, shifts: siteShifts });
      const computationRaw = computeDayFromRaw({ date, rawEvents: events, shift });
      const computation: ProcessedDayComputation = {
        firstIn: computationRaw.firstIn,
        lastOut: computationRaw.lastOut,
        workedMinutes: computationRaw.workedMinutes,
        breakMinutes: computationRaw.breakMinutes,
        overtimeMinutes: computationRaw.overtimeMinutes,
        lunchMinutes: computationRaw.lunchMinutes,
        effectiveMinutes: computationRaw.effectiveMinutes,
        lateMinutes: computationRaw.lateMinutes,
        status: computationRaw.status,
        incidents: computationRaw.incidentTypes,
        needsApproval: computationRaw.needsApproval,
        shiftId: computationRaw.shiftId
      };
      const customerId = events[0]?.customerId || null;

      if (params.reprocess) {
        await tx.attendanceIncident.deleteMany({ where: { employeeId, date } });
      }

      const processed = await tx.attendanceProcessedDay.upsert({
        where: { employeeId_date: { employeeId, date } },
        update: {
          siteId,
          customerId,
          firstIn: computation.firstIn,
          lastOut: computation.lastOut,
          workedMinutes: computation.workedMinutes,
          breakMinutes: computation.breakMinutes,
          overtimeMinutes: computation.overtimeMinutes,
          lunchMinutes: computation.lunchMinutes,
          effectiveMinutes: computation.effectiveMinutes,
          lateMinutes: computation.lateMinutes,
          status: computation.status,
          needsApproval: computation.needsApproval,
          shiftId: computation.shiftId || null
        },
        create: {
          employeeId,
          date,
          siteId,
          customerId,
          firstIn: computation.firstIn,
          lastOut: computation.lastOut,
          workedMinutes: computation.workedMinutes,
          breakMinutes: computation.breakMinutes,
          overtimeMinutes: computation.overtimeMinutes,
          lunchMinutes: computation.lunchMinutes,
          effectiveMinutes: computation.effectiveMinutes,
          lateMinutes: computation.lateMinutes,
          status: computation.status,
          needsApproval: computation.needsApproval,
          shiftId: computation.shiftId || null
        }
      });

      const incidents = computation.incidents.length
        ? await upsertIncidents({
            tx,
            employeeId,
            date,
            siteId,
            customerId,
            processedDayId: processed.id,
            incidentTypes: computation.incidents
          })
        : [];

      results.push({ employeeId, processed, incidents, computation });
    }

    return results;
  };

  if ("$transaction" in client) {
    return (client as PrismaClient).$transaction((tx) => run(tx));
  }
  return run(client as Prisma.TransactionClient);
}
