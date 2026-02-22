import { z } from "zod";

export const attendanceEventSchema = z.object({
  employeeId: z.string().trim().min(1),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  occurredAt: z.string().datetime(),
  note: z.string().trim().optional()
});

export const attendanceEventUpdateSchema = z.object({
  occurredAt: z.string().datetime().optional(),
  note: z.string().trim().optional()
});

export const attendanceRawIngestSchema = z.object({
  employeeId: z.string().trim().min(1),
  siteId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
  type: z.enum(["CHECK_IN", "CHECK_OUT", "BREAK_OUT", "BREAK_IN"]),
  occurredAt: z.string().datetime().optional(),
  deviceTime: z.string().datetime().optional(),
  source: z.enum(["SELFIE_WEB", "BIOMETRIC", "MANUAL_IMPORT"]),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
  accuracy: z.number().nonnegative().optional(),
  zoneStatus: z.enum(["IN_ZONE", "OUT_OF_ZONE", "UNKNOWN"]).optional(),
  photoUrl: z.string().url().optional(),
  photoHash: z.string().optional(),
  photoBase64: z.string().trim().optional(),
  faceStatus: z.enum(["VERIFIED", "MISMATCH", "NO_REFERENCE", "LOW_CONFIDENCE"]).optional(),
  faceScore: z.number().nonnegative().optional(),
  rawPayload: z.record(z.any()).optional(),
  importBatchId: z.string().optional()
});

export const dayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.string().optional()
});

export const processDayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteId: z.string().optional(),
  reprocess: z.enum(["true", "false"]).optional()
});

export const processedDayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  siteId: z.string().optional()
});

export const attendanceIncidentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  siteId: z.string().optional(),
  employeeId: z.string().optional(),
  type: z.string().optional(),
  resolved: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
});

export const attendanceShiftSchema = z.object({
  siteId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  toleranceMinutes: z.number().int().min(0).max(240),
  lunchMinutes: z.number().int().min(0).max(240).nullable().optional(),
  lunchPaid: z.boolean().optional(),
  overtimeAllowed: z.boolean().optional()
});

export const attendanceShiftUpdateSchema = attendanceShiftSchema.partial();

export const assignmentSchema = z.object({
  employeeId: z.string().trim().min(1),
  siteId: z.string().trim().min(1),
  shiftId: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isPrimary: z.boolean().optional()
});

export const assignmentUpdateSchema = assignmentSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "No hay campos a actualizar"
});

export const rangeQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// Compat para logs existentes
export const manualLogSchema = z.object({
  employeeId: z.string().trim().min(1),
  timestamp: z.string().datetime(),
  source: z.string().optional(),
  note: z.string().optional(),
  notes: z.string().optional(),
  type: z.string().optional()
});

export const timeClockLogFiltersSchema = z.object({
  search: z.string().optional(),
  employeeId: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const manualAttendanceSchema = z.object({
  employeeId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  checkOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  branchId: z.string().optional(),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
  allowBoth: z.boolean().optional()
}).superRefine((data, ctx) => {
  const hasIn = Boolean(data.checkIn);
  const hasOut = Boolean(data.checkOut);
  if (!hasIn && !hasOut) {
    ctx.addIssue({ code: "custom", message: "Hora requerida", path: ["checkIn"] });
  }
  if (hasIn && hasOut && !data.allowBoth) {
    ctx.addIssue({ code: "custom", message: "No se permite registrar entrada y salida a la vez", path: ["checkOut"] });
  }
});

export const markAttendanceSchema = z.object({
  employeeId: z.string().trim().min(1),
  branchId: z.string().optional(),
  notes: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length ? v : undefined))
});

export const attendanceListQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  status: z.enum(["PRESENTE", "TARDE", "AUSENTE", "INCOMPLETO"]).optional(),
  source: z.enum(["MANUAL", "KIOSK", "IMPORT", "AI"]).optional()
});

export const attendanceTodayQuerySchema = z.object({
  employeeId: z.string().optional(),
  branchId: z.string().optional()
});

export const parseAttendanceInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Texto requerido"),
  timezone: z.string().optional()
});
