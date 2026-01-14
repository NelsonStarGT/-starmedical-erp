import { z } from "zod";
import { TIME_CLOCK_SOURCES, TIME_CLOCK_TYPES } from "@/types/hr";

const optionalString = z.string().trim().optional().nullable();

export const manualLogSchema = z.object({
  employeeId: z.string().trim().min(1, "Empleado requerido"),
  timestamp: z.string().trim().min(1, "Fecha requerida"),
  type: z.enum(TIME_CLOCK_TYPES),
  notes: optionalString
});

export const timeClockLogFiltersSchema = z.object({
  search: z.string().trim().optional(),
  employeeId: optionalString,
  date: optionalString,
  source: z.enum(TIME_CLOCK_SOURCES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15)
});

export const processAttendanceSchema = z.object({
  employeeId: z.string().trim().min(1, "Empleado requerido"),
  date: z.string().trim().min(1, "Fecha requerida")
});

export const overtimeReviewSchema = z.object({
  requestId: z.string().trim().min(1, "Solicitud requerida"),
  action: z.enum(["APPROVE", "REJECT"]),
  requestedHours: z.coerce.number().nonnegative().optional(),
  notes: optionalString
});

export const closeProcessSchema = z.object({
  date: z.string().trim().min(4, "Fecha requerida"),
  branchId: z.string().trim().optional().nullable(),
  legalEntityId: z.string().trim().optional().nullable()
});

export const closeStatusSchema = z.object({
  date: z.string().trim().min(4, "Fecha requerida"),
  branchId: z.string().trim().optional().nullable()
});

export const closeResolveSchema = z.object({
  attendanceId: z.string().trim().min(1),
  action: z.enum(["ADD_OUT", "ADD_NOTE", "LINK_LEAVE"]),
  checkOut: optionalString,
  note: optionalString,
  leaveId: optionalString
});
