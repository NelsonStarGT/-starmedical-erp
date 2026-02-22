import { AttendanceCloseStatus, HrEmployeeStatus, HrEmploymentType, PayrollRunStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = PrismaClient | Prisma.TransactionClient;

export type PayrollInput = {
  legalEntityId: string;
  periodStart: Date;
  periodEnd: Date;
  includeOvertime?: boolean;
  excludeEmployeeIds?: string[];
};

export type AttendanceBlocker = { employeeId: string; date: string };

export function buildPayrollCode(legalEntityId: string, periodStart: Date, periodEnd: Date) {
  const start = periodStart.toISOString().slice(0, 10);
  const end = periodEnd.toISOString().slice(0, 10);
  return `PR-${start}-${end}-${legalEntityId}`;
}

function isDateWithinRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export async function findEligibleEmployees(tx: Tx, params: PayrollInput) {
  const employees = await tx.hrEmployee.findMany({
    where: {
      status: HrEmployeeStatus.ACTIVE,
      onboardingStatus: "ACTIVE",
      id: params.excludeEmployeeIds ? { notIn: params.excludeEmployeeIds } : undefined,
      engagements: {
        some: {
          legalEntityId: params.legalEntityId,
          isPrimary: true,
          startDate: { lte: params.periodEnd },
          OR: [{ endDate: null }, { endDate: { gte: params.periodStart } }]
        }
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      engagements: true
    }
  });

  const engagementMap = new Map<string, Prisma.EmployeeEngagementGetPayload<any>>();
  employees.forEach((emp) => {
    const eng = (emp.engagements || []).find((e) => e.legalEntityId === params.legalEntityId && e.isPrimary);
    if (eng) engagementMap.set(emp.id, eng);
  });

  const compensations = await tx.employeeCompensation.findMany({
    where: {
      engagementId: { in: Array.from(engagementMap.values()).map((e) => e.id) },
      isActive: true,
      effectiveFrom: { lte: params.periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.periodStart } }]
    }
  });

  const compensationMap = new Map<string, Prisma.EmployeeCompensationGetPayload<any>>();
  compensations.forEach((c) => compensationMap.set(c.engagementId, c));

  const eligible = employees.filter((emp) => {
    const eng = engagementMap.get(emp.id);
    if (!eng) return false;
    const comp = compensationMap.get(eng.id);
    if (eng.employmentType === HrEmploymentType.DEPENDENCIA && !comp) return false;
    return true;
  });

  return { eligible, engagementMap, compensationMap };
}

async function attendanceBlockers(tx: Tx, employeeId: string, start: Date, end: Date): Promise<AttendanceBlocker[]> {
  const days = await tx.attendanceDay.findMany({
    where: {
      employeeId,
      date: { gte: start, lte: end },
      closeStatus: { not: AttendanceCloseStatus.CLOSED }
    },
    select: { date: true, closeStatus: true }
  });
  return days.map((d) => ({ employeeId, date: d.date.toISOString().slice(0, 10) }));
}

function computeOvertimePay(hours: number, baseSalary: Prisma.Decimal | null) {
  const base = Number(baseSalary || 0);
  if (!hours || !base) return 0;
  const hourly = base / 160;
  return Math.round(hourly * hours * 100) / 100;
}

export async function buildPayrollSnapshots(tx: Tx, params: PayrollInput) {
  const { eligible, engagementMap, compensationMap } = await findEligibleEmployees(tx, params);
  const blockers: AttendanceBlocker[] = [];
  const employees: any[] = [];

  for (const emp of eligible) {
    const eng = engagementMap.get(emp.id)!;
    const comp = compensationMap.get(eng.id) || null;

    const attendanceIssues = await attendanceBlockers(tx, emp.id, params.periodStart, params.periodEnd);
    blockers.push(...attendanceIssues);

    const bonuses = await tx.compensationBonus.findMany({
      where: { employeeId: emp.id, isActive: true },
      select: { name: true, amount: true }
    });

    let overtimeHours = 0;
    if (params.includeOvertime !== false) {
      const overtime = await tx.overtimeRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          attendanceDay: {
            date: { gte: params.periodStart, lte: params.periodEnd }
          }
        },
        select: { requestedHours: true, calculatedHours: true }
      });
      overtimeHours = overtime.reduce((acc, ot) => acc + Number(ot.calculatedHours || ot.requestedHours || 0), 0);
    }

    const baseSalary = comp?.baseSalary || null;
    const bonusAmount = bonuses.reduce((acc, b) => acc + Number(b.amount), 0);
    const overtimePay = computeOvertimePay(overtimeHours, baseSalary);
    const gross = Number(baseSalary || 0) + bonusAmount + overtimePay;
    const net = gross; // deductions v1 = 0

    employees.push({
      employeeId: emp.id,
      engagementId: eng.id,
      employmentType: eng.employmentType,
      baseSalarySnapshot: baseSalary,
      workedDaysSnapshot: null,
      workedHoursSnapshot: null,
      overtimeHoursSnapshot: overtimeHours,
      grossAmount: gross,
      deductionsAmount: 0,
      netAmount: net,
      bonuses
    });
  }

  return { employees, blockers };
}

export async function createPayrollRun(params: PayrollInput & { actorUserId?: string | null }) {
  const periodStart = new Date(params.periodStart);
  const periodEnd = new Date(params.periodEnd);
  if (periodEnd < periodStart) throw new Error("periodEnd debe ser >= periodStart");

  return prisma.$transaction(async (tx) => {
    const code = buildPayrollCode(params.legalEntityId, periodStart, periodEnd);
    const run = await tx.payrollRun.create({
      data: {
        code,
        legalEntityId: params.legalEntityId,
        periodStart,
        periodEnd,
        status: PayrollRunStatus.DRAFT,
        createdById: params.actorUserId || null
      }
    });

    const { employees, blockers } = await buildPayrollSnapshots(tx, { ...params, periodStart, periodEnd });

    for (const emp of employees) {
      const saved = await tx.payrollEmployee.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.employeeId,
          employmentType: emp.employmentType,
          engagementId: emp.engagementId,
          baseSalary: emp.baseSalarySnapshot ? new Prisma.Decimal(emp.baseSalarySnapshot) : null,
          workedDays: emp.workedDaysSnapshot,
          workedHours: emp.workedHoursSnapshot ? new Prisma.Decimal(emp.workedHoursSnapshot) : null,
          overtimeHours: new Prisma.Decimal(emp.overtimeHoursSnapshot || 0),
          grossAmount: new Prisma.Decimal(emp.grossAmount),
          totalDeductions: new Prisma.Decimal(emp.deductionsAmount),
          netAmount: new Prisma.Decimal(emp.netAmount)
        }
      });
    }

    return { run, blockers };
  });
}

export async function recalcPayrollRun(runId: string, actorUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error("Payroll no encontrado");
    if (run.status !== PayrollRunStatus.DRAFT) throw new Error("Solo se puede recalcular en DRAFT");

    await tx.payrollEmployee.deleteMany({ where: { payrollRunId: runId } });

    const { employees, blockers } = await buildPayrollSnapshots(tx, {
      legalEntityId: run.legalEntityId,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      includeOvertime: true
    });

    for (const emp of employees) {
      const saved = await tx.payrollEmployee.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.employeeId,
          employmentType: emp.employmentType,
          engagementId: emp.engagementId,
          baseSalary: emp.baseSalarySnapshot ? new Prisma.Decimal(emp.baseSalarySnapshot) : null,
          workedDays: emp.workedDaysSnapshot,
          workedHours: emp.workedHoursSnapshot ? new Prisma.Decimal(emp.workedHoursSnapshot) : null,
          overtimeHours: new Prisma.Decimal(emp.overtimeHoursSnapshot || 0),
          grossAmount: new Prisma.Decimal(emp.grossAmount),
          totalDeductions: new Prisma.Decimal(emp.deductionsAmount),
          netAmount: new Prisma.Decimal(emp.netAmount)
        }
      });
    }

    await tx.payrollRun.update({
      where: { id: run.id },
      data: { updatedAt: new Date(), approvedAt: null, approvedById: null }
    });

    return { run, blockers };
  });
}

export async function approvePayrollRun(runId: string, actorUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.findUnique({ where: { id: runId }, include: { payrollEmployees: true } });
    if (!run) throw new Error("Payroll no encontrado");
    if (run.status !== PayrollRunStatus.DRAFT) throw new Error("Solo DRAFT se puede aprobar");

    for (const emp of run.payrollEmployees) {
      const issues = await attendanceBlockers(tx, emp.employeeId, run.periodStart, run.periodEnd);
      if (issues.length) {
        throw new Error("Asistencia no cerrada");
      }
    }

    return tx.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.APPROVED, approvedById: actorUserId || null, approvedAt: new Date() }
    });
  });
}

export async function publishPayrollRun(runId: string, actorUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.findUnique({
      where: { id: runId },
      include: { payrollEmployees: true }
    });
    if (!run) throw new Error("Payroll no encontrado");
    if (run.status !== PayrollRunStatus.APPROVED) throw new Error("Se requiere APPROVED para publicar");

    for (const emp of run.payrollEmployees) {
      await tx.payrollFinanceRecord.create({
        data: {
          payrollRunId: run.id,
          amount: emp.netAmount || 0
        }
      });
    }

    return tx.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.PUBLISHED, publishedAt: new Date() }
    });
  });
}
