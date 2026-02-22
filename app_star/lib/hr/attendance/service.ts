import { AttendanceRecordSource, AttendanceStatus, HrEmployeeStatus, HrSettings, LeaveStatus, OvertimeRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeAttendanceFromLogs, buildShiftWindow } from "./calculator";
import { serializeAttendanceDay } from "./serializers";
import { ensureOnboardingForPayroll } from "@/lib/hr/transitionGuards";
import { enqueueAttendanceEmails } from "./notifications";

type Tx = PrismaClient | Prisma.TransactionClient;

const MINUTES = 60 * 1000;
const DEFAULT_TIMEZONE = "America/Guatemala";
const DEFAULT_START_TIME = "08:00";
const DEFAULT_LATE_TOLERANCE = 10;

const startOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateParts = (value: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(value);
  const filled = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(filled.year),
    month: Number(filled.month),
    day: Number(filled.day),
    hour: Number(filled.hour),
    minute: Number(filled.minute),
    second: Number(filled.second)
  };
};

const offsetMinutesFor = (date: Date, timeZone: string) => {
  const parts = toDateParts(date, timeZone);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUTC - date.getTime()) / MINUTES;
};

export const formatDateInZone = (value: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

const buildZonedDate = (dateStr: string, timeStr: string, timeZone: string) => {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const [hourStr, minuteStr] = timeStr.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) {
    throw { status: 400, body: { error: "Fecha u hora inválida" } };
  }
  const base = Date.UTC(year, month - 1, day, hour, minute);
  const offset = offsetMinutesFor(new Date(base), timeZone);
  return new Date(base - offset * MINUTES);
};

const startOfDayTz = (dateStr: string, timeZone: string) => buildZonedDate(dateStr, "00:00", timeZone);

const toDecimal = (value: number | null | undefined) => new Prisma.Decimal(value || 0);

async function resolvePrimaryContext(tx: Tx, employeeId: string) {
  const employee = await tx.hrEmployee.findUnique({
    where: { id: employeeId },
    include: {
      branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 },
      engagements: { where: { status: HrEmployeeStatus.ACTIVE }, orderBy: { startDate: "desc" }, take: 1 }
    }
  });

  const primaryBranchId = employee?.branchAssignments?.[0]?.branchId || null;
  const primaryLegalEntityId = employee?.engagements?.[0]?.legalEntityId || employee?.primaryLegalEntityId || null;
  return { primaryBranchId, primaryLegalEntityId };
}

export async function processAttendanceDay(params: { employeeId: string; date: Date; tx?: Tx }) {
  const client = params.tx || prisma;
  const date = startOfDay(params.date);

  const run = async (tx: Prisma.TransactionClient) => {
    const [assignment, existing, leaveRequest] = await Promise.all([
      tx.employeeShiftAssignment.findFirst({
        where: {
          employeeId: params.employeeId,
          isActive: true,
          OR: [{ startDate: null }, { startDate: { lte: date } }],
          AND: [{ OR: [{ endDate: null }, { endDate: { gte: date } }] }]
        },
        include: { ShiftTemplate: true },
        orderBy: { startDate: "desc" }
      }),
      tx.attendanceDay.findUnique({ where: { employeeId_date: { employeeId: params.employeeId, date } } }),
      tx.leaveRequest.findFirst({
        where: {
          employeeId: params.employeeId,
          status: LeaveStatus.APPROVED,
          startDate: { lte: new Date(date.getTime() + 24 * 60 * MINUTES) },
          endDate: { gte: date }
        }
      })
    ]);

    const shift = assignment?.ShiftTemplate || null;
    const window = buildShiftWindow(date, shift);
    const logs = await tx.timeClockLog.findMany({
      where: {
        employeeId: params.employeeId,
        timestamp: {
          gte: new Date(window.start.getTime() - 90 * MINUTES),
          lte: new Date(window.end.getTime() + 240 * MINUTES)
        }
      },
      orderBy: { timestamp: "asc" }
    });

    const computed = computeAttendanceFromLogs({
      date,
      shift,
      logs: logs.map((log) => ({ timestamp: log.timestamp, type: log.type })),
      leaveApproved: Boolean(leaveRequest)
    });

    const { primaryBranchId, primaryLegalEntityId } = await resolvePrimaryContext(tx, params.employeeId);
    const logBranchId = logs.find((log) => log.branchId)?.branchId || null;
    const logLegalEntityId = logs.find((log) => log.legalEntityId)?.legalEntityId || null;

    const approvalState = existing
      ? {
          isApproved: existing.isApproved,
          approvedAt: existing.approvedAt,
          approvedById: existing.approvedById
        }
      : { isApproved: false, approvedAt: null, approvedById: null };

    const attendance = await tx.attendanceDay.upsert({
      where: { employeeId_date: { employeeId: params.employeeId, date } },
      update: {
        shiftTemplateId: assignment?.shiftTemplateId || null,
        branchId: logBranchId || primaryBranchId,
        legalEntityId: logLegalEntityId || primaryLegalEntityId,
        checkIn: computed.checkIn,
        checkOut: computed.checkOut,
        totalHours: toDecimal(computed.totalHours),
        regularHours: toDecimal(computed.regularHours),
        overtimeHours: toDecimal(computed.overtimeHours),
        tardyMinutes: computed.tardyMinutes,
        status: computed.status,
        color: computed.color,
        notes: computed.notes.join("; "),
        ...approvalState
      },
      create: {
        employeeId: params.employeeId,
        date,
        shiftTemplateId: assignment?.shiftTemplateId || null,
        branchId: logBranchId || primaryBranchId,
        legalEntityId: logLegalEntityId || primaryLegalEntityId,
        checkIn: computed.checkIn,
        checkOut: computed.checkOut,
        totalHours: toDecimal(computed.totalHours),
        regularHours: toDecimal(computed.regularHours),
        overtimeHours: toDecimal(computed.overtimeHours),
        tardyMinutes: computed.tardyMinutes,
        status: computed.status,
        color: computed.color,
        notes: computed.notes.join("; "),
        ...approvalState
      }
    });

    if (computed.overtimeHours > 0) {
      const existingOt = await tx.overtimeRequest.findUnique({
        where: { attendanceDayId: attendance.id }
      });

      await tx.overtimeRequest.upsert({
        where: { attendanceDayId: attendance.id },
        update: {
          employeeId: params.employeeId,
          calculatedHours: toDecimal(computed.overtimeHours),
          requestedHours: existingOt?.requestedHours || toDecimal(computed.overtimeHours),
          status: existingOt?.status || OvertimeRequestStatus.PENDING
        },
        create: {
          employeeId: params.employeeId,
          attendanceDayId: attendance.id,
          calculatedHours: toDecimal(computed.overtimeHours),
          requestedHours: toDecimal(computed.overtimeHours),
          status: OvertimeRequestStatus.PENDING
        }
      });
    }

    return serializeAttendanceDay(attendance);
  };

  if ("$transaction" in client) {
    return (client as PrismaClient).$transaction((tx) => run(tx));
  }

  return run(client as Prisma.TransactionClient);
}

type AttendanceRecordWithRelations = Prisma.AttendanceRecordGetPayload<{
  include: {
    employee: { select: { id: true; firstName: true; lastName: true; employeeCode: true; email: true } };
    branch: { select: { id: true; name: true } };
  };
}>;

const formatMaybeDate = (value?: Date | null) => (value ? value.toISOString() : null);

export async function loadSettings(tx: Tx) {
  return tx.hrSettings.findUnique({ where: { id: 1 } });
}

async function fetchEmployeeGuarded(tx: Tx, employeeId: string) {
  const employee = await tx.hrEmployee.findUnique({
    where: { id: employeeId },
    include: { branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 } }
  });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado", code: "EMPLOYEE_NOT_FOUND" } };
  ensureOnboardingForPayroll(employee.onboardingStatus);
  if (employee.status === HrEmployeeStatus.TERMINATED || employee.status === HrEmployeeStatus.ARCHIVED) {
    throw { status: 409, body: { error: "Empleado no elegible (estado terminado/archivado)", code: "EMPLOYEE_TERMINATED" } };
  }
  return employee;
}

function computeRecordStatus(record: { checkInAt: Date | null; checkOutAt: Date | null; date: Date }, settings: HrSettings | null, timeZone: string) {
  if (!record.checkInAt && !record.checkOutAt) return "AUSENTE";
  const tolerance = Number(settings?.attendanceLateToleranceMinutes ?? DEFAULT_LATE_TOLERANCE);
  const startTime = (settings?.attendanceStartTime || DEFAULT_START_TIME).slice(0, 5);
  const reference = buildZonedDate(formatDateInZone(record.date, timeZone), startTime, timeZone);
  const lateCutoff = reference.getTime() + tolerance * MINUTES;
  if (record.checkInAt && record.checkInAt.getTime() > lateCutoff) {
    return "TARDE";
  }
  if (!record.checkOutAt) return "INCOMPLETO";
  return "PRESENTE";
}

function serializeRecord(record: AttendanceRecordWithRelations, settings: HrSettings | null, timeZone: string) {
  const status = computeRecordStatus(
    { checkInAt: record.checkInAt, checkOutAt: record.checkOutAt, date: record.date },
    settings,
    timeZone
  );
  return {
    id: record.id,
    employeeId: record.employeeId,
    branchId: record.branchId,
    date: record.date.toISOString(),
    checkInAt: formatMaybeDate(record.checkInAt),
    checkOutAt: formatMaybeDate(record.checkOutAt),
    source: record.source,
    notes: record.notes,
    status,
    timezone: timeZone,
    employee: record.employee,
    branch: record.branch
  };
}

function assertCheckWindow(checkInAt?: Date | null, checkOutAt?: Date | null) {
  if (checkInAt && checkOutAt && checkOutAt.getTime() < checkInAt.getTime()) {
    throw { status: 400, body: { error: "La hora de salida no puede ser antes de la entrada", code: "INVALID_TIME_RANGE" } };
  }
}

export async function upsertManualAttendance(params: {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  branchId?: string | null;
  createdByUserId?: string | null;
  allowBoth?: boolean;
}) {
  const settings = await loadSettings(prisma);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const dayStart = startOfDayTz(params.date, timeZone);
  const checkInAt = params.checkIn ? buildZonedDate(params.date, params.checkIn, timeZone) : null;
  const checkOutAt = params.checkOut ? buildZonedDate(params.date, params.checkOut, timeZone) : null;
  if (checkInAt && checkOutAt && !params.allowBoth) {
    throw { status: 400, body: { error: "No se permite registrar entrada y salida a la vez", code: "DOUBLE_MARK" } };
  }
  assertCheckWindow(checkInAt, checkOutAt);

  const record = await prisma.$transaction(async (tx) => {
    const employee = await fetchEmployeeGuarded(tx, params.employeeId);
    const existing = await tx.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      include: { employee: true, branch: true }
    });

    if (checkOutAt && !checkInAt && !existing?.checkInAt) {
      throw { status: 409, body: { error: "No se puede registrar salida sin entrada", code: "MISSING_CHECKIN" } };
    }
    if (checkInAt && existing?.checkInAt) {
      throw { status: 409, body: { error: "Entrada ya registrada para hoy", code: "CHECKIN_EXISTS" } };
    }
    if (checkOutAt && existing?.checkOutAt) {
      throw { status: 409, body: { error: "Salida ya registrada para hoy", code: "CHECKOUT_EXISTS" } };
    }

    const branchId = employee.branchAssignments?.[0]?.branchId ?? existing?.branchId ?? params.branchId ?? null;
    const finalCheckIn = checkInAt ?? existing?.checkInAt ?? null;
    const finalCheckOut = checkOutAt ?? existing?.checkOutAt ?? null;
    assertCheckWindow(finalCheckIn, finalCheckOut);

    const saved = await tx.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      update: {
        checkInAt: finalCheckIn,
        checkOutAt: finalCheckOut,
        branchId,
        source: AttendanceRecordSource.MANUAL,
        notes: params.notes ?? existing?.notes ?? null,
        createdByUserId: params.createdByUserId ?? existing?.createdByUserId ?? null
      },
      create: {
        employeeId: params.employeeId,
        branchId,
        date: dayStart,
        checkInAt: finalCheckIn,
        checkOutAt: finalCheckOut,
        source: AttendanceRecordSource.MANUAL,
        notes: params.notes ?? null,
        createdByUserId: params.createdByUserId ?? null
      },
      include: { employee: true, branch: true }
    });
    return saved;
  });

  return serializeRecord(record, settings, timeZone);
}

export async function markCheckIn(params: { employeeId: string; branchId?: string | null; actorUserId?: string | null; notes?: string; now?: Date }) {
  const settings = await loadSettings(prisma);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const now = params.now || new Date();
  const dateStr = formatDateInZone(now, timeZone);
  const dayStart = startOfDayTz(dateStr, timeZone);

  const record = await prisma.$transaction(async (tx) => {
    const employee = await fetchEmployeeGuarded(tx, params.employeeId);
    const existing = await tx.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      include: { employee: true, branch: true }
    });

    if (existing?.checkInAt) {
      throw { status: 409, body: { error: "Entrada ya registrada para hoy", code: "CHECKIN_EXISTS" } };
    }
    if (existing?.checkOutAt) {
      throw { status: 409, body: { error: "Salida ya registrada para hoy", code: "CHECKOUT_ALREADY_SET" } };
    }

    const branchId = employee.branchAssignments?.[0]?.branchId ?? existing?.branchId ?? params.branchId ?? null;

    return tx.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      update: {
        checkInAt: now,
        branchId,
        source: AttendanceRecordSource.KIOSK,
        notes: params.notes ?? undefined,
        createdByUserId: params.actorUserId ?? undefined
      },
      create: {
        employeeId: params.employeeId,
        branchId,
        date: dayStart,
        checkInAt: now,
        checkOutAt: null,
        source: AttendanceRecordSource.KIOSK,
        notes: params.notes ?? null,
        createdByUserId: params.actorUserId ?? null
      },
      include: { employee: true, branch: true }
    });
  });

  void enqueueAttendanceEmails(record.id, "CHECK_IN");
  return serializeRecord(record, settings, timeZone);
}

export async function markCheckOut(params: { employeeId: string; branchId?: string | null; actorUserId?: string | null; notes?: string; now?: Date }) {
  const settings = await loadSettings(prisma);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const now = params.now || new Date();
  const dateStr = formatDateInZone(now, timeZone);
  const dayStart = startOfDayTz(dateStr, timeZone);

  const record = await prisma.$transaction(async (tx) => {
    const employee = await fetchEmployeeGuarded(tx, params.employeeId);
    const existing = await tx.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      include: { employee: true, branch: true }
    });

    if (!existing || !existing.checkInAt) {
      throw { status: 409, body: { error: "No se puede registrar salida sin entrada", code: "MISSING_CHECKIN" } };
    }
    if (existing.checkOutAt) {
      throw { status: 409, body: { error: "Salida ya registrada para hoy", code: "CHECKOUT_EXISTS" } };
    }

    const branchId = employee.branchAssignments?.[0]?.branchId ?? existing.branchId ?? params.branchId ?? null;

    return tx.attendanceRecord.update({
      where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
      data: {
        checkOutAt: now,
        branchId,
        source: existing.source || AttendanceRecordSource.KIOSK,
        notes: params.notes ?? existing.notes ?? null,
        createdByUserId: params.actorUserId ?? existing.createdByUserId ?? null
      },
      include: { employee: true, branch: true }
    });
  });

  void enqueueAttendanceEmails(record.id, "CHECK_OUT");
  return serializeRecord(record, settings, timeZone);
}

export async function listAttendanceRecords(params: {
  from: string;
  to: string;
  employeeId?: string;
  branchId?: string | null;
  status?: "PRESENTE" | "TARDE" | "AUSENTE" | "INCOMPLETO";
  source?: AttendanceRecordSource | null;
}) {
  const settings = await loadSettings(prisma);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const fromDate = startOfDayTz(params.from, timeZone);
  const toDate = startOfDayTz(params.to, timeZone);
  const end = new Date(toDate);
  end.setDate(end.getDate() + 1);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: fromDate, lt: end },
      ...(params.employeeId ? { employeeId: params.employeeId } : {}),
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.source ? { source: params.source } : {})
    },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } }, branch: { select: { id: true, name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  const serialized = records.map((record) => serializeRecord(record, settings, timeZone));
  return params.status ? serialized.filter((row) => row.status === params.status) : serialized;
}

export async function getAttendanceForDay(params: { employeeId: string; date?: string; branchId?: string | null }) {
  const settings = await loadSettings(prisma);
  const timeZone = settings?.defaultTimezone || DEFAULT_TIMEZONE;
  const dateStr = params.date || formatDateInZone(new Date(), timeZone);
  const dayStart = startOfDayTz(dateStr, timeZone);

  const record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: params.employeeId, date: dayStart } },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, email: true } }, branch: { select: { id: true, name: true } } }
  });

  if (!record) {
    return { status: "AUSENTE", date: dayStart.toISOString(), timezone: timeZone, record: null };
  }
  return serializeRecord(record as AttendanceRecordWithRelations, settings, timeZone);
}
