import type { HrEmploymentType, Prisma } from "@prisma/client";
import type { AttendanceCloseStatus } from "@prisma/client";

export type OnboardingState = {
  status: "DRAFT" | "IN_REVIEW" | "ACTIVE";
  step: number;
};

export function assertOnboardingProgression(current: OnboardingState, targetStep: number) {
  if (targetStep < current.step) {
    throw new Error("No se puede retroceder el onboarding");
  }
  if (targetStep > current.step + 1) {
    throw new Error("Onboarding debe avanzar en orden");
  }
}

export function canActivateOnboarding(params: {
  engagements: { id: string; employmentType: HrEmploymentType; isPrimary?: boolean }[];
  compensations: { engagementId: string; isActive: boolean; baseSalary?: any; paymentScheme?: string | null }[];
}) {
  const primaryEng = params.engagements.find((e) => e.isPrimary) || params.engagements[0];
  if (!primaryEng) {
    return { ok: false, reason: "engagement_missing" as const };
  }
  const activeComp = params.compensations.find((c) => c.engagementId === primaryEng.id && c.isActive);
  if (primaryEng.employmentType === "DEPENDENCIA" && !activeComp) {
    return { ok: false, reason: "compensation_missing" as const };
  }
  if (primaryEng.employmentType === "DEPENDENCIA" && !activeComp?.baseSalary) {
    return { ok: false, reason: "base_salary_missing" as const };
  }
  return { ok: true as const };
}

export function ensureAttendanceClosed(records: { date: string; closeStatus: AttendanceCloseStatus }[]) {
  const open = records.find((r) => r.closeStatus !== "CLOSED");
  if (open) {
    throw new Error("Asistencia pendiente de cierre");
  }
}

export function closeAssignmentsForTransfer<T extends { isPrimary?: boolean; endDate?: Date | null }>(
  assignments: T[],
  endDate: Date
) {
  return assignments.map((assign) => ({
    ...assign,
    isPrimary: false,
    endDate
  }));
}

// Filtro único para "colaborador activo" usado en listados y KPIs
export function buildActiveEmployeeWhere(extra?: Prisma.HrEmployeeWhereInput) {
  const base: Prisma.HrEmployeeWhereInput = {
    status: "ACTIVE",
    onboardingStatus: "ACTIVE",
    NOT: { employeeCode: { startsWith: "EMP-DEMO" } }
  };
  if (!extra) return base;
  return { AND: [base, extra] };
}
