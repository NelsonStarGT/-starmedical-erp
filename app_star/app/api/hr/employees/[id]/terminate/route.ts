import { NextRequest, NextResponse } from "next/server";
import { DisciplinaryActionStatus, DisciplinaryActionType, HrEmployeeStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { employeeIncludeFor, serializeEmployee } from "@/lib/hr/serializers";
import { terminateSchema } from "@/lib/hr/schemas";
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

  const parsed = terminateSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }
  const effectiveDate = parseDateInput(parsed.data.effectiveDate, "Fecha de terminación", { required: true })!;
  const notes = cleanNullableString(parsed.data.notes);

  const emp = await prisma.hrEmployee.findUnique({ where: { id }, select: { status: true, onboardingStatus: true } });
  if (!emp) throw { status: 404, body: { error: "Empleado no encontrado" } };
  const validation = validateStatusTransition({
    action: "terminate",
    employee: { status: emp.status as HrEmployeeStatus, onboardingStatus: emp.onboardingStatus },
    actor: auth.user
  });
  if (!validation.ok) throw { status: validation.status, body: { error: validation.error, code: validation.code } };

  const saved = await prisma.$transaction(async (tx) => {
    await tx.employeeEngagement.updateMany({
      where: { employeeId: id },
      data: { status: HrEmployeeStatus.TERMINATED, endDate: effectiveDate }
    });

    await tx.employeeBranchAssignment.updateMany({
      where: { employeeId: id },
      data: { endDate: effectiveDate }
    });

    await tx.employeePositionAssignment.updateMany({
      where: { employeeId: id },
      data: { endDate: effectiveDate }
    });

    await tx.notification.deleteMany({ where: { employeeId: id, type: NotificationType.LICENSE_EXPIRY } });

    await tx.hrEmployee.update({
      where: { id },
      data: {
        status: HrEmployeeStatus.TERMINATED,
        isActive: false,
        notes: notes ?? undefined,
        completedAt: effectiveDate,
        terminatedAt: effectiveDate
      }
    });

    const action = await tx.disciplinaryAction.create({
      data: {
        employeeId: id,
        type: DisciplinaryActionType.TERMINACION,
        title: parsed.data.reason,
        description: notes ?? null,
        comments: notes ?? null,
        issuedAt: effectiveDate,
        startDate: effectiveDate,
        status: DisciplinaryActionStatus.APPROVED,
        createdById: auth.user?.id || null,
        approvedById: auth.user?.id || null
      }
    });

    await tx.disciplinaryAttachment.create({
      data: {
        disciplinaryActionId: action.id,
        fileUrl: parsed.data.attachment.fileUrl,
        fileName: parsed.data.attachment.fileName,
        mime: parsed.data.attachment.mime || null
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: auth.user?.id || null,
        actorRole: auth.user?.roles?.[0] || null,
        action: "HR_EMPLOYEE_TERMINATE",
        entityType: "HrEmployee",
        entityId: id,
        metadata: {
          actionId: action.id,
          reason: parsed.data.reason,
          effectiveDate: effectiveDate.toISOString()
        }
      }
    });

    return tx.hrEmployee.findUnique({ where: { id }, include: employeeIncludeFor(auth.user) });
  });

  if (!saved) throw { status: 404, body: { error: "Empleado no encontrado" } };
  return NextResponse.json({ data: serializeEmployee(saved, auth.user) });
}

export const POST = withApiErrorHandling(handler);
