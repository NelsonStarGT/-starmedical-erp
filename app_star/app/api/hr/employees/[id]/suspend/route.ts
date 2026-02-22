import { NextRequest, NextResponse } from "next/server";
import { DisciplinaryActionStatus, DisciplinaryActionType, HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { employeeIncludeFor, serializeEmployee } from "@/lib/hr/serializers";
import { suspendSchema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:STATUS");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };
  const { id } = params;

  const parsed = suspendSchema.safeParse(await safeJson(req));
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const issuedAt = parseDateInput(parsed.data.startDate, "Fecha de inicio", { required: true })!;
  const endDate = parseDateInput(parsed.data.endDate, "Fecha fin");

  const emp = await prisma.hrEmployee.findUnique({ where: { id }, select: { status: true, onboardingStatus: true } });
  if (!emp) throw { status: 404, body: { error: "Empleado no encontrado" } };
  if (emp.status === "TERMINATED") throw { status: 409, body: { error: "No se puede suspender terminado" } };
  if (emp.status === "SUSPENDED") throw { status: 409, body: { error: "Ya está suspendido" } };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employeeEngagement.updateMany({
      where: { employeeId: id },
      data: { status: HrEmployeeStatus.SUSPENDED, endDate: null }
    });

    await tx.hrEmployee.update({
      where: { id },
      data: {
        status: HrEmployeeStatus.SUSPENDED,
        isActive: false
      }
    });

    const action = await tx.disciplinaryAction.create({
      data: {
        employeeId: id,
        type: DisciplinaryActionType.SUSPENSION,
        title: parsed.data.title.trim(),
        description: parsed.data.notes?.trim() || null,
        comments: parsed.data.notes?.trim() || null,
        issuedAt,
        startDate: issuedAt,
        endDate: endDate || null,
        status: DisciplinaryActionStatus.APPROVED,
        createdById: auth.user?.id || null,
        approvedById: auth.user?.id || null
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: auth.user?.id || null,
        actorRole: auth.user?.roles?.[0] || null,
        action: "HR_EMPLOYEE_SUSPEND",
        entityType: "HrEmployee",
        entityId: id,
        metadata: {
          actionId: action.id,
          title: action.title,
          issuedAt: issuedAt.toISOString(),
          endDate: endDate ? endDate.toISOString() : null
        }
      }
    });

    return tx.hrEmployee.findUnique({ where: { id }, include: employeeIncludeFor(auth.user) });
  });

  if (!updated) throw { status: 404, body: { error: "Empleado no encontrado" } };
  return NextResponse.json({ data: serializeEmployee(updated, auth.user) });
}

export const POST = withApiErrorHandling(handler);
