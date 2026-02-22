import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";
import { getPathParam } from "@/lib/api/path";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const employeeId = getPathParam(req.nextUrl.pathname, "employees");
  if (!employeeId) throw { status: 400, body: { error: "ID inválido" } };

  const canDelete =
    hasPermission(auth.user, "HR:EMPLOYEES:DELETE") ||
    hasPermission(auth.user, "HR:EMPLOYEES:WRITE") ||
    hasPermission(auth.user, "USERS:ADMIN");
  if (!canDelete) throw { status: 403, body: { error: "No autorizado" } };

  const emp = await prisma.hrEmployee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      onboardingStatus: true,
      onboardingStep: true,
      status: true,
      userId: true,
      documents: { select: { id: true }, take: 1 },
      engagements: { select: { id: true }, take: 1 }
    }
  });
  if (!emp) throw { status: 404, body: { error: "Empleado no encontrado" } };

  const [docsCount, branchAssignments, positionAssignments, attendanceCount, rawEventsCount, timeClockLogs, warningsCount] = await prisma.$transaction([
    prisma.employeeDocument.count({ where: { employeeId } }),
    prisma.employeeBranchAssignment.count({ where: { employeeId } }),
    prisma.employeePositionAssignment.count({ where: { employeeId } }),
    prisma.attendanceRecord.count({ where: { employeeId } }),
    prisma.attendanceRawEvent.count({ where: { employeeId } }),
    prisma.timeClockLog.count({ where: { employeeId } }),
    prisma.hrEmployeeWarning.count({ where: { employeeId } })
  ]);

  const progressLocked = emp.onboardingStatus !== "DRAFT" || (emp.onboardingStep || 1) > 1;
  const hasEngagements = (emp.engagements?.length || 0) > 0;
  const assignmentsCount = branchAssignments + positionAssignments;
  const reasons = {
    docsCount,
    assignmentsCount: assignmentsCount + (hasEngagements ? emp.engagements.length : 0),
    userLinked: Boolean(emp.userId),
    attendanceCount: attendanceCount + timeClockLogs,
    rawEventsCount,
    warningsCount,
    progressLocked
  };

  if (
    progressLocked ||
    reasons.docsCount > 0 ||
    reasons.assignmentsCount > 0 ||
    reasons.userLinked ||
    reasons.attendanceCount > 0 ||
    reasons.rawEventsCount > 0 ||
    reasons.warningsCount > 0
  ) {
    throw { status: 409, body: { error: "No se puede eliminar este proceso", reasons } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.employeeBranchAssignment.deleteMany({ where: { employeeId: emp.id } });
    await tx.employeePositionAssignment.deleteMany({ where: { employeeId: emp.id } });
    await tx.hrEmployee.delete({ where: { id: emp.id } });
  });

  return NextResponse.json({ ok: true });
}

export const DELETE = withApiErrorHandling(handler);
