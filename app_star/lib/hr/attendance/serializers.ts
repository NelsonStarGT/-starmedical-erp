import type { AttendanceColor, AttendanceStatus, Prisma } from "@prisma/client";
import type { AttendanceDay, OvertimeRequest, TimeClockLogEntry } from "@/types/hr";

export function serializeLog(
  log: Prisma.TimeClockLogGetPayload<{
    include: { HrEmployee: true; TimeClockDevice: true; Branch: true };
  }>
): TimeClockLogEntry {
  const employeeName = log.HrEmployee ? `${log.HrEmployee.firstName} ${log.HrEmployee.lastName}`.trim() : undefined;
  return {
    id: log.id,
    employeeId: log.employeeId,
    employeeName,
    employeeCode: log.HrEmployee?.employeeCode,
    deviceId: log.deviceId || undefined,
    deviceName: log.TimeClockDevice?.name,
    branchId: log.branchId || log.TimeClockDevice?.branchId || undefined,
    branchName: log.Branch?.name || log.TimeClockDevice?.location || undefined,
    legalEntityId: log.legalEntityId || log.TimeClockDevice?.legalEntityId || undefined,
    timestamp: log.timestamp.toISOString(),
    type: log.type,
    source: log.source,
    notes: log.notes
  };
}

type AttendanceDayRecord = {
  id: string;
  employeeId: string;
  date: Date;
  shiftTemplateId: string | null;
  branchId: string | null;
  legalEntityId: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: Prisma.Decimal | null;
  regularHours: Prisma.Decimal | null;
  overtimeHours: Prisma.Decimal | null;
  tardyMinutes: number | null;
  status: AttendanceStatus;
  color: AttendanceColor;
  notes: string | null;
  isApproved: boolean;
  approvedById: string | null;
  approvedAt: Date | null;
};

export function serializeAttendanceDay(day: AttendanceDayRecord): AttendanceDay {
  return {
    id: day.id,
    employeeId: day.employeeId,
    date: day.date.toISOString(),
    shiftTemplateId: day.shiftTemplateId,
    branchId: day.branchId,
    legalEntityId: day.legalEntityId,
    checkIn: day.checkIn ? day.checkIn.toISOString() : null,
    checkOut: day.checkOut ? day.checkOut.toISOString() : null,
    totalHours: day.totalHours?.toString() || null,
    regularHours: day.regularHours?.toString() || null,
    overtimeHours: day.overtimeHours?.toString() || null,
    tardyMinutes: day.tardyMinutes,
    status: day.status,
    color: day.color,
    notes: day.notes,
    isApproved: day.isApproved,
    approvedById: day.approvedById,
    approvedAt: day.approvedAt?.toISOString() || null
  };
}

export function serializeOvertimeRequest(
  request: Prisma.OvertimeRequestGetPayload<{
    include: { attendanceDay: true; HrEmployee: true };
  }>
): OvertimeRequest {
  return {
    id: request.id,
    employeeId: request.employeeId,
    attendanceDayId: request.attendanceDayId,
    calculatedHours: request.calculatedHours.toString(),
    requestedHours: request.requestedHours.toString(),
    status: request.status,
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt?.toISOString() || null,
    notes: request.notes,
    attendanceDay: serializeAttendanceDay(request.attendanceDay),
    employeeName: request.HrEmployee ? `${request.HrEmployee.firstName} ${request.HrEmployee.lastName}`.trim() : null,
    employeeCode: request.HrEmployee?.employeeCode
  };
}
