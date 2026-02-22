import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { employeeIncludeFor, serializeEmployee } from "@/lib/hr/serializers";
import { withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:STATUS");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };
  if ((auth.user?.roles || []).some((r) => r.toUpperCase() === "STAFF")) {
    throw { status: 403, body: { error: "No autorizado", code: "FORBIDDEN" } };
  }
  const { id } = params;

  const employee = await prisma.hrEmployee.findUnique({ where: { id }, select: { status: true, onboardingStatus: true } });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
  if (employee.status === HrEmployeeStatus.TERMINATED) throw { status: 409, body: { error: "No se puede activar terminado" } };
  if (employee.status === HrEmployeeStatus.ACTIVE) throw { status: 409, body: { error: "Ya está activo" } };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employeeEngagement.updateMany({
      where: { employeeId: id },
      data: { status: HrEmployeeStatus.ACTIVE, endDate: null }
    });

    await tx.hrEmployee.update({
      where: { id },
      data: { status: HrEmployeeStatus.ACTIVE, isActive: true, archivedAt: null, terminatedAt: null }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: auth.user?.id || null,
        actorRole: auth.user?.roles?.[0] || null,
        action: "HR_EMPLOYEE_ACTIVATE",
        entityType: "HrEmployee",
        entityId: id
      }
    });

    return tx.hrEmployee.findUnique({ where: { id }, include: employeeIncludeFor(auth.user) });
  });

  if (!updated) throw { status: 404, body: { error: "Empleado no encontrado" } };
  return NextResponse.json({ data: serializeEmployee(updated, auth.user) });
}

export const POST = withApiErrorHandling(handler);
