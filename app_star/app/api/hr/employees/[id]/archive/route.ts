import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { employeeIncludeFor, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";
import { validateStatusTransition } from "@/lib/hr/transitions";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:STATUS");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };
  const { id } = params;

  const payload = await safeJson(req);
  const effectiveDate = parseDateInput(payload?.effectiveDate, "Fecha de archivo") || new Date();
  const notes = cleanNullableString(payload?.notes);

  const emp = await prisma.hrEmployee.findUnique({ where: { id }, select: { status: true, onboardingStatus: true } });
  if (!emp) throw { status: 404, body: { error: "Empleado no encontrado" } };

  const validation = validateStatusTransition({
    action: "archive",
    employee: { status: emp.status as HrEmployeeStatus, onboardingStatus: emp.onboardingStatus },
    actor: auth.user
  });
  if (!validation.ok) throw { status: validation.status, body: { error: validation.error, code: validation.code } };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employeeEngagement.updateMany({
      where: { employeeId: id },
      data: { status: HrEmployeeStatus.ARCHIVED, endDate: effectiveDate }
    });
    await tx.employeeBranchAssignment.updateMany({
      where: { employeeId: id },
      data: { endDate: effectiveDate }
    });
    await tx.employeePositionAssignment.updateMany({
      where: { employeeId: id },
      data: { endDate: effectiveDate }
    });

    await tx.hrEmployee.update({
      where: { id },
      data: {
        status: HrEmployeeStatus.ARCHIVED,
        isActive: false,
        archivedAt: effectiveDate,
        notes: notes ?? undefined
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: auth.user?.id || null,
        actorRole: auth.user?.roles?.[0] || null,
        action: "HR_EMPLOYEE_ARCHIVE",
        entityType: "HrEmployee",
        entityId: id,
        metadata: { effectiveDate: effectiveDate.toISOString() }
      }
    });

    return tx.hrEmployee.findUnique({ where: { id }, include: employeeIncludeFor(auth.user) });
  });

  if (!updated) throw { status: 404, body: { error: "Empleado no encontrado" } };
  return NextResponse.json({ data: serializeEmployee(updated, auth.user) });
}

export const POST = withApiErrorHandling(handler);
