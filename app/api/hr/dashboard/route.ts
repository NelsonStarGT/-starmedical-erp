import { NextRequest, NextResponse } from "next/server";
import { AttendanceCloseStatus, HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { buildActiveEmployeeWhere } from "@/lib/hr/domain";

export const dynamic = "force-dynamic";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;
  const canView = hasPermission(user, "HR:DASHBOARD:READ") || hasPermission(user, "HR:EMPLOYEES:READ");
  if (!canView) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const now = today();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);
  const last7 = new Date(now);
  last7.setDate(last7.getDate() - 6);

  const result: any = {
    kpis: {
      totalEmployees: 0,
      internalEmployees: 0,
      externalEmployees: 0,
      docsExpiring: 0,
    docsOutdated: 0,
    attendanceWorkedDays: 0,
    attendancePendingDays: 0,
    assignmentsPending: 0,
    pendingEmployees: 0
  },
    charts: { byBranch: [] as any[] },
    alerts: [] as { severity: "info" | "warning" | "critical"; title: string; count: number; href: string }[],
    payroll: { draft: 0, approved: 0 }
  };

  // Empleados
  try {
    const activeWhere = buildActiveEmployeeWhere();
    const [totalEmployees, internalEmployees, externalEmployees, onboardingPending] = await Promise.all([
      prisma.hrEmployee.count({ where: activeWhere }),
      prisma.hrEmployee.count({ where: buildActiveEmployeeWhere({ isExternal: false }) }),
      prisma.hrEmployee.count({ where: buildActiveEmployeeWhere({ isExternal: true }) }),
      prisma.hrEmployee.count({ where: { onboardingStatus: { not: "ACTIVE" } } })
    ]);
    result.kpis.totalEmployees = totalEmployees;
    result.kpis.internalEmployees = internalEmployees;
    result.kpis.externalEmployees = externalEmployees;
    result.kpis.assignmentsPending += onboardingPending;
    result.kpis.pendingEmployees = onboardingPending;
  } catch (err) {
    console.error({ block: "dashboard.employees", error: err });
  }

  // Documentos
  try {
    const docsExpiring = await prisma.employeeDocumentVersion.count({
      where: { expiresAt: { gte: now, lte: horizon } }
    });
    const docsOutdated = await prisma.employeeDocumentVersion.count({
      where: { expiresAt: { lt: now } }
    });
    result.kpis.docsExpiring = docsExpiring;
    result.kpis.docsOutdated = docsOutdated;

    if (docsOutdated > 0) {
      result.alerts.push({ severity: "warning", title: "Documentos vencidos", count: docsOutdated, href: "/hr/employees" });
    }
    if (docsExpiring > 0) {
      result.alerts.push({ severity: "info", title: "Documentos por vencer", count: docsExpiring, href: "/hr/employees" });
    }
  } catch (err) {
    console.error({ block: "dashboard.documents", error: err });
  }

  // Asistencia últimos 7 días
  try {
    const attendance = await prisma.attendanceDay.findMany({
      where: { date: { gte: last7, lte: now } },
      select: { status: true, closeStatus: true, issues: true }
    });
    const worked = attendance.filter((a) => a.status !== "ABSENT").length;
    const pending = attendance.filter((a) => a.closeStatus !== AttendanceCloseStatus.CLOSED).length;
    result.kpis.attendanceWorkedDays = worked;
    result.kpis.attendancePendingDays = pending;
    const issues = attendance.filter((a) => a.issues && a.closeStatus !== AttendanceCloseStatus.CLOSED).length;
    if (issues > 0) {
      result.alerts.push({ severity: "warning", title: "Asistencia con issues", count: issues, href: "/hr/attendance" });
    }
  } catch (err) {
    console.error({ block: "dashboard.attendance", error: err });
  }

  // Asignaciones pendientes (sin sucursal/puesto primario)
  try {
    const withoutBranch = await prisma.hrEmployee.count({
      where: buildActiveEmployeeWhere({ branchAssignments: { none: { isPrimary: true } } })
    });
    const withoutPosition = await prisma.hrEmployee.count({
      where: buildActiveEmployeeWhere({ positionAssignments: { none: { isPrimary: true } } })
    });
    result.kpis.assignmentsPending += withoutBranch + withoutPosition;
  } catch (err) {
    console.error({ block: "dashboard.assignments", error: err });
  }

  // Colaboradores por sucursal
  try {
    const grouped = await prisma.employeeBranchAssignment.groupBy({
      by: ["branchId"],
      where: { isPrimary: true },
      _count: { branchId: true }
    });
    const branches = await prisma.branch.findMany({ where: { id: { in: grouped.map((g) => g.branchId) } } });
    result.charts.byBranch = grouped.map((g) => ({
      branchId: g.branchId,
      branchName: branches.find((b) => b.id === g.branchId)?.name || g.branchId,
      count: g._count.branchId
    }));
  } catch (err) {
    console.error({ block: "dashboard.branches", error: err });
  }

  // Nómina
  try {
    const [draft, approved] = await Promise.all([
      prisma.payrollRun.count({ where: { status: "DRAFT" } }),
      prisma.payrollRun.count({ where: { status: "APPROVED" } })
    ]);
    result.payroll = { draft, approved };
    if (draft > 0) {
      result.alerts.push({ severity: "info", title: "Nóminas en borrador", count: draft, href: "/hr/payroll" });
    }
  } catch (err) {
    console.error({ block: "dashboard.payroll", error: err });
  }

  return NextResponse.json(result);
}
