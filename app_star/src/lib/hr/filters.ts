import { Prisma } from "@prisma/client";
import { SessionUser } from "@/lib/auth";
import { normalizeRoleName } from "@/lib/rbac";

export function isStaffUser(user?: SessionUser | null) {
  return Boolean(user?.roles?.some((role) => normalizeRoleName(role) === "STAFF"));
}

export function buildPendingEmployeesWhere(params: { sessionUser?: SessionUser | null; excludeTerminated?: boolean }) {
  const isStaff = isStaffUser(params.sessionUser);
  const where: Prisma.HrEmployeeWhereInput = {
    onboardingStatus: { not: "ACTIVE" },
    ...(params.excludeTerminated ? { status: { notIn: ["TERMINATED", "ARCHIVED"] } } : { status: { not: "ARCHIVED" } }),
    ...(isStaff ? { userId: params.sessionUser?.id } : {})
  };
  return where;
}

export function buildActiveEmployeesWhere(params: { sessionUser?: SessionUser | null }) {
  const isStaff = isStaffUser(params.sessionUser);
  const where: Prisma.HrEmployeeWhereInput = {
    status: "ACTIVE",
    onboardingStatus: "ACTIVE",
    ...(isStaff ? { userId: params.sessionUser?.id } : {}),
    // Excluir códigos de colaboradores demo usados en pruebas internas.
    NOT: { employeeCode: { startsWith: "EMP-DEMO" } }
  };
  return where;
}

export function buildArchivedEmployeesWhere(params: { sessionUser?: SessionUser | null; year?: number; month?: number }) {
  const isStaff = isStaffUser(params.sessionUser);
  const where: Prisma.HrEmployeeWhereInput = {
    status: { in: ["TERMINATED", "ARCHIVED"] },
    ...(isStaff ? { userId: params.sessionUser?.id } : {}),
    // Excluir códigos de colaboradores demo usados en pruebas internas.
    NOT: { employeeCode: { startsWith: "EMP-DEMO" } }
  };

  if (params.year) {
    const startMonthIndex = params.month ? params.month - 1 : 0;
    const startDate = new Date(Date.UTC(params.year, startMonthIndex, 1));
    const endDate = params.month
      ? new Date(Date.UTC(params.year, startMonthIndex + 1, 1))
      : new Date(Date.UTC(params.year + 1, 0, 1));
    where.OR = [
      { terminatedAt: { gte: startDate, lt: endDate } },
      { archivedAt: { gte: startDate, lt: endDate } },
      { completedAt: { gte: startDate, lt: endDate } }
    ];
  }

  return where;
}
