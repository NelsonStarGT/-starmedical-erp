import { AttendanceStatus, HrEmployeeStatus, LeaveStatus, OvertimeRequestStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeAttendanceFromLogs, buildShiftWindow } from "./calculator";
import { serializeAttendanceDay } from "./serializers";

type Tx = PrismaClient | Prisma.TransactionClient;

const MINUTES = 60 * 1000;

const startOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

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
