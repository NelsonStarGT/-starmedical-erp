import { addMinutes, differenceInMinutes, parse } from "date-fns";
import {
  AttendanceIncidentSeverity,
  AttendanceIncidentType,
  AttendanceProcessedStatus,
  AttendanceRawEvent,
  AttendanceShift,
  EmployeeSiteAssignment
} from "@prisma/client";

const MINUTE = 60 * 1000;

type DayComputation = {
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lunchMinutes: number;
  effectiveMinutes: number;
  lateMinutes: number;
  status: AttendanceProcessedStatus;
  incidentTypes: AttendanceIncidentType[];
  needsApproval: boolean;
  shiftId?: string | null;
};

const dedupe = (list: AttendanceIncidentType[]) => Array.from(new Set(list));

export function severityFor(type: AttendanceIncidentType): AttendanceIncidentSeverity {
  if (type === "OUT_OF_ZONE" || type === "OVERTIME_UNAUTHORIZED") return AttendanceIncidentSeverity.HIGH;
  if (type === "FACE_MISMATCH" || type === "MISSING_PUNCH" || type === "LATE") return AttendanceIncidentSeverity.MEDIUM;
  return AttendanceIncidentSeverity.LOW;
}

function parseShiftTime(date: Date, time: string) {
  const [hourStr, minuteStr] = time.split(":");
  const hours = parseInt(hourStr || "0", 10);
  const minutes = parseInt(minuteStr || "0", 10);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes, 0, 0));
}

export function selectShiftForDay(params: {
  date: Date;
  siteId: string | null;
  employeeId: string;
  assignments: (EmployeeSiteAssignment & { shift: AttendanceShift })[];
  shifts: AttendanceShift[];
}) {
  const { date, siteId, employeeId, assignments, shifts } = params;
  if (!siteId) return null;
  const activeAssignments = assignments.filter(
    (a) =>
      a.siteId === siteId &&
      a.employeeId === employeeId &&
      a.startDate.getTime() <= date.getTime() &&
      (!a.endDate || a.endDate.getTime() >= date.getTime())
  );
  if (activeAssignments.length) {
    const chosen = activeAssignments.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
    return chosen.shift;
  }
  const siteShifts = shifts.filter((s) => s.siteId === siteId);
  const defaultShift = siteShifts.find((s) => s.isDefaultForSite) || siteShifts[0] || null;
  return defaultShift;
}

export function computeDayFromRaw(params: { date: Date; rawEvents: AttendanceRawEvent[]; shift?: AttendanceShift | null }): DayComputation {
  const events = [...params.rawEvents].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  let firstIn: Date | null = null;
  let lastOut: Date | null = null;
  let grossMinutes = 0;
  let breakMinutes = 0;
  let overtimeMinutes = 0;
  let lateMinutes = 0;
  let lunchMinutes = 0;
  let effectiveMinutes = 0;
  let openIn: Date | null = null;
  let breakStart: Date | null = null;
  const incidentTypes: AttendanceIncidentType[] = [];

  const shift = params.shift || null;
  const shiftStart = shift ? parseShiftTime(params.date, shift.startTime) : null;
  const shiftEnd = shift ? parseShiftTime(params.date, shift.endTime) : null;

  const hasManualImport = events.some((e) => e.source === "MANUAL_IMPORT");
  if (hasManualImport) incidentTypes.push(AttendanceIncidentType.MANUAL_REVIEW);
  if (events.some((e) => e.zoneStatus === "OUT_OF_ZONE")) incidentTypes.push(AttendanceIncidentType.OUT_OF_ZONE);

  for (const ev of events) {
    if (ev.type === "CHECK_IN") {
      if (!firstIn) firstIn = ev.occurredAt;
      if (openIn) incidentTypes.push(AttendanceIncidentType.SEQUENCE_ERROR);
      openIn = ev.occurredAt;
    }
    if (ev.type === "CHECK_OUT") {
      if (openIn) {
        grossMinutes += Math.max(0, Math.round((ev.occurredAt.getTime() - openIn.getTime()) / MINUTE));
        lastOut = ev.occurredAt;
        openIn = null;
      } else {
        incidentTypes.push(AttendanceIncidentType.MISSING_PUNCH);
      }
    }
    if (ev.type === "BREAK_OUT") {
      if (breakStart) incidentTypes.push(AttendanceIncidentType.SEQUENCE_ERROR);
      breakStart = ev.occurredAt;
    }
    if (ev.type === "BREAK_IN") {
      if (breakStart) {
        breakMinutes += Math.max(0, Math.round((ev.occurredAt.getTime() - breakStart.getTime()) / MINUTE));
        breakStart = null;
      } else {
        incidentTypes.push(AttendanceIncidentType.SEQUENCE_ERROR);
      }
    }
  }

  if (openIn) incidentTypes.push(AttendanceIncidentType.MISSING_PUNCH);
  if (breakStart) incidentTypes.push(AttendanceIncidentType.SEQUENCE_ERROR);

  const workedMinutes = Math.max(0, grossMinutes - breakMinutes);

  if (shift && firstIn) {
    const toleranceEnd = addMinutes(shiftStart!, shift.toleranceMinutes);
    if (firstIn.getTime() > toleranceEnd.getTime()) {
      lateMinutes = Math.max(0, differenceInMinutes(firstIn, shiftStart!));
      incidentTypes.push(AttendanceIncidentType.LATE);
    }
  }

  if (shift && lastOut && shiftEnd) {
    const extra = Math.max(0, differenceInMinutes(lastOut, shiftEnd));
    if (extra > 0) {
      if (shift.overtimeAllowed) {
        overtimeMinutes = extra;
      } else {
        incidentTypes.push(AttendanceIncidentType.OVERTIME_UNAUTHORIZED);
      }
    }
  }

  if (shift?.lunchMinutes) {
    lunchMinutes = shift.lunchMinutes;
    effectiveMinutes = Math.max(0, workedMinutes - (shift.lunchPaid ? 0 : lunchMinutes));
  } else {
    effectiveMinutes = workedMinutes;
  }

  const uniqueIncidents = dedupe(incidentTypes);
  let status: AttendanceProcessedStatus = AttendanceProcessedStatus.OK;
  if (uniqueIncidents.includes(AttendanceIncidentType.OUT_OF_ZONE)) status = AttendanceProcessedStatus.OUT_OF_ZONE;
  else if (uniqueIncidents.includes(AttendanceIncidentType.MISSING_PUNCH)) status = AttendanceProcessedStatus.MISSING_PUNCH;
  else if (uniqueIncidents.length > 0) status = AttendanceProcessedStatus.MANUAL_REVIEW;

  const needsApproval =
    uniqueIncidents.includes(AttendanceIncidentType.MANUAL_REVIEW) ||
    uniqueIncidents.includes(AttendanceIncidentType.OVERTIME_UNAUTHORIZED) ||
    uniqueIncidents.includes(AttendanceIncidentType.OUT_OF_ZONE) ||
    uniqueIncidents.includes(AttendanceIncidentType.MISSING_PUNCH);

  return {
    firstIn,
    lastOut,
    workedMinutes,
    breakMinutes,
    overtimeMinutes,
    lunchMinutes,
    effectiveMinutes,
    lateMinutes,
    status,
    incidentTypes: uniqueIncidents,
    needsApproval,
    shiftId: shift?.id || null
  };
}
