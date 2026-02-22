import { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type PayrollStatus = "DRAFT" | "APPROVED" | "PUBLISHED";

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function ensureNoOverlap(tx: Tx, start: Date, end: Date) {
  const existing = await tx.hrPayrollRun.findMany({
    select: { id: true, periodStart: true, periodEnd: true },
    where: {
      OR: [{ periodStart: { lte: end }, periodEnd: { gte: start } }]
    }
  });
  if (existing.some((r) => rangesOverlap(r.periodStart, r.periodEnd, start, end))) {
    throw { status: 409, body: { error: "Existe una planilla solapada" } };
  }
}

export function isEmployeeEligible(emp: { status: string; onboardingStatus: string }) {
  return emp.status === "ACTIVE" && emp.onboardingStatus === "ACTIVE";
}

export async function eligibleEmployees(tx: Tx) {
  const list = await tx.hrEmployee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      status: true,
      onboardingStatus: true,
      engagements: { where: { isPrimary: true }, select: { baseSalary: true } }
    }
  });
  return list.filter(isEmployeeEligible);
}

export function computeNet(base: number, bonuses: number, deductions: number) {
  return Math.max(0, base + bonuses - deductions);
}

export function assertDraft(status: string) {
  if (status !== "DRAFT") throw { status: 409, body: { error: "Solo editable en DRAFT" } };
}

export function assertApproved(status: string) {
  if (status !== "APPROVED") throw { status: 409, body: { error: "Se requiere APPROVED" } };
}
