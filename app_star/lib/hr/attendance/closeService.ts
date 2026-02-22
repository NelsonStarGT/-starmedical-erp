import { AttendanceCloseStatus, AttendanceStatus, OvertimeRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { buildShiftWindow, computeAttendanceFromLogs } from "./calculator";
import { parseDateInput } from "../utils";
import { prisma } from "@/lib/prisma";

type Tx = PrismaClient | Prisma.TransactionClient;

const MINUTES = 60 * 1000;

function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type AttendanceIssue = "MISSING_OUT" | "NO_LEAVE_FOR_ABSENCE" | "OVERTIME_PENDING" | "DUPLICATE_LOGS";

function detectIssues(params: {
  attendance: Prisma.AttendanceDayGetPayload<{ include: { overtimeRequest: true; ShiftTemplate: true } }>;
  leaveApproved: boolean;
  logs: { type: string }[];
}) {
  const issues: AttendanceIssue[] = [];
  const { attendance, leaveApproved, logs } = params;

  const shiftRequiresOut = Boolean(attendance.shiftTemplateId);
  if (shiftRequiresOut && !attendance.checkOut) {
    issues.push("MISSING_OUT");
  }

  if (attendance.status === AttendanceStatus.ABSENT && !leaveApproved) {
    issues.push("NO_LEAVE_FOR_ABSENCE");
  }

  if (Number(attendance.overtimeHours || 0) > 0 && attendance.overtimeRequest?.status === OvertimeRequestStatus.PENDING) {
    issues.push("OVERTIME_PENDING");
  }

  const inCount = logs.filter((l) => l.type === "IN").length;
  const outCount = logs.filter((l) => l.type === "OUT").length;
  if (inCount > 1 || outCount > 1) {
    issues.push("DUPLICATE_LOGS");
  }

  return issues;
}

async function processSingleAttendance(tx: Tx, params: { employeeId: string; date: Date }) {
  const date = startOfDay(params.date);

  const assignment = await tx.employeeShiftAssignment.findFirst({
    where: {
      employeeId: params.employeeId,
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: date } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: date } }] }]
    },
    include: { ShiftTemplate: true },
    orderBy: { startDate: "desc" }
  });

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
    leaveApproved: false
  });

  const existing = await tx.attendanceDay.findUnique({
    where: { employeeId_date: { employeeId: params.employeeId, date } }
  });

  const attendance = await tx.attendanceDay.upsert({
    where: { employeeId_date: { employeeId: params.employeeId, date } },
    update: {
      shiftTemplateId: assignment?.shiftTemplateId || null,
      branchId: logs.find((l) => l.branchId)?.branchId || existing?.branchId || null,
      legalEntityId: logs.find((l) => l.legalEntityId)?.legalEntityId || existing?.legalEntityId || null,
      checkIn: computed.checkIn,
      checkOut: computed.checkOut,
      totalHours: new Prisma.Decimal(computed.totalHours || 0),
      regularHours: new Prisma.Decimal(computed.regularHours || 0),
      overtimeHours: new Prisma.Decimal(computed.overtimeHours || 0),
      tardyMinutes: computed.tardyMinutes,
      status: computed.status,
      color: computed.color,
      notes: computed.notes.join("; "),
      isApproved: existing?.isApproved ?? false,
      approvedAt: existing?.approvedAt || null,
      approvedById: existing?.approvedById || null
    },
    create: {
      employeeId: params.employeeId,
      date,
      shiftTemplateId: assignment?.shiftTemplateId || null,
      branchId: logs.find((l) => l.branchId)?.branchId || null,
      legalEntityId: logs.find((l) => l.legalEntityId)?.legalEntityId || null,
      checkIn: computed.checkIn,
      checkOut: computed.checkOut,
      totalHours: new Prisma.Decimal(computed.totalHours || 0),
      regularHours: new Prisma.Decimal(computed.regularHours || 0),
      overtimeHours: new Prisma.Decimal(computed.overtimeHours || 0),
      tardyMinutes: computed.tardyMinutes,
      status: computed.status,
      color: computed.color,
      notes: computed.notes.join("; "),
      isApproved: existing?.isApproved ?? false,
      approvedAt: existing?.approvedAt || null,
      approvedById: existing?.approvedById || null
    },
    include: { overtimeRequest: true, ShiftTemplate: true }
  });

  return attendance;
}

export async function processAttendanceDayClose(params: {
  date: Date;
  branchId?: string | null;
  legalEntityId?: string | null;
  tx?: Tx;
}) {
  const client = params.tx || prisma;
  const targetDate = startOfDay(params.date);
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const employees = await client.hrEmployee.findMany({
    where: {
      isActive: true,
      status: { not: "TERMINATED" },
      ...(params.branchId
        ? { branchAssignments: { some: { branchId: params.branchId, isPrimary: true } } }
        : {}),
      ...(params.legalEntityId
        ? { engagements: { some: { legalEntityId: params.legalEntityId, isPrimary: true } } }
        : {})
    },
    select: { id: true }
  });

  const results: any[] = [];

  for (const emp of employees) {
    const attendance = await processSingleAttendance(client, {
      employeeId: emp.id,
      date: targetDate
    });
    if (!attendance) continue;

    const leaveApproved = await client.leaveRequest.findFirst({
      where: {
        employeeId: emp.id,
        status: "APPROVED",
        startDate: { lte: nextDay },
        endDate: { gte: targetDate }
      }
    });

    const logs = await client.timeClockLog.findMany({
      where: {
        employeeId: emp.id,
        timestamp: { gte: targetDate, lt: nextDay }
      }
    });

    const issues = detectIssues({
      attendance,
      leaveApproved: Boolean(leaveApproved),
      logs: logs.map((l) => ({ type: l.type }))
    });

    const closeStatus =
      issues.length === 0 && attendance.checkIn && (!attendance.shiftTemplateId || attendance.checkOut)
        ? AttendanceCloseStatus.READY_TO_CLOSE
        : issues.length === 0
          ? AttendanceCloseStatus.OPEN
          : AttendanceCloseStatus.NEEDS_REVIEW;

    const saved = await client.attendanceDay.update({
      where: { id: attendance.id },
      data: {
        issues: issues.length ? issues : Prisma.JsonNull,
        closeStatus,
        lastProcessedAt: new Date()
      },
      include: { HrEmployee: true, overtimeRequest: true, ShiftTemplate: true }
    });

    results.push(saved);
  }

  return results;
}

export async function getCloseStatus(params: { date: string; branchId?: string | null }) {
  const date = parseDateInput(params.date, "Fecha", { required: true })!;
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const records = await prisma.attendanceDay.findMany({
    where: {
      date,
      ...(params.branchId ? { branchId: params.branchId } : {})
    },
    include: { HrEmployee: true, overtimeRequest: true }
  });
  return records;
}

export async function resolveAttendance(params: {
  attendanceId: string;
  action: "ADD_OUT" | "ADD_NOTE" | "LINK_LEAVE";
  checkOut?: string | null;
  note?: string | null;
  leaveId?: string | null;
  actorUserId?: string | null;
}) {
  const attendance = await prisma.attendanceDay.findUnique({
    where: { id: params.attendanceId },
    include: { HrEmployee: true, overtimeRequest: true }
  });
  if (!attendance) throw new Error("Attendance no encontrado");

  const data: Prisma.AttendanceDayUpdateInput = {};
  if (params.action === "ADD_OUT" && params.checkOut) {
    data.checkOut = new Date(params.checkOut);
    data.notes = attendance.notes ? `${attendance.notes}; OUT manual` : "OUT manual";
  }
  if (params.action === "ADD_NOTE" && params.note) {
    data.notes = attendance.notes ? `${attendance.notes}; ${params.note}` : params.note;
  }
  if (params.action === "LINK_LEAVE" && params.leaveId) {
    await prisma.leaveRequest.update({
      where: { id: params.leaveId },
      data: { status: "APPROVED" }
    });
  }

  const updated = await prisma.attendanceDay.update({
    where: { id: attendance.id },
    data
  });

  return updated;
}

export async function closeDay(params: { date: string; branchId?: string | null; actorUserId?: string | null }) {
  const date = parseDateInput(params.date, "Fecha", { required: true })!;

  const pending = await prisma.attendanceDay.findMany({
    where: {
      date,
      closeStatus: { in: ["OPEN", "NEEDS_REVIEW"] },
      ...(params.branchId ? { branchId: params.branchId } : {})
    }
  });

  const blockers = pending.filter((d) => {
    const issues = (d.issues as AttendanceIssue[] | null) || [];
    return issues.includes("MISSING_OUT") || issues.includes("NO_LEAVE_FOR_ABSENCE") || issues.includes("OVERTIME_PENDING");
  });

  if (blockers.length) {
    return { closed: false, blockers: blockers.map((b) => ({ id: b.id, issues: b.issues })) };
  }

  await prisma.attendanceDay.updateMany({
    where: {
      date,
      ...(params.branchId ? { branchId: params.branchId } : {})
    },
    data: {
      closeStatus: AttendanceCloseStatus.CLOSED,
      closedAt: new Date(),
      closedById: params.actorUserId || null
    }
  });

  return { closed: true, blockers: [] };
}
