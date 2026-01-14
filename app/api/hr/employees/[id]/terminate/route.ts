import { NextRequest, NextResponse } from "next/server";
import { DisciplinaryActionStatus, DisciplinaryActionType, HrEmployeeStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { terminateSchema } from "@/lib/hr/schemas";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER"], "HR:EMPLOYEES:DELETE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = terminateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const effectiveDate = parseDateInput(parsed.data.effectiveDate, "Fecha de terminación", { required: true })!;
    const notes = cleanNullableString(parsed.data.notes);

    const saved = await prisma.$transaction(async (tx) => {
      await tx.employeeEngagement.updateMany({
        where: { employeeId: resolvedParams.id },
        data: { status: HrEmployeeStatus.TERMINATED, endDate: effectiveDate }
      });

      await tx.employeeBranchAssignment.updateMany({
        where: { employeeId: resolvedParams.id },
        data: { endDate: effectiveDate }
      });

      await tx.employeePositionAssignment.updateMany({
        where: { employeeId: resolvedParams.id },
        data: { endDate: effectiveDate }
      });

      await tx.notification.deleteMany({ where: { employeeId: resolvedParams.id, type: NotificationType.LICENSE_EXPIRY } });

      await tx.hrEmployee.update({
        where: { id: resolvedParams.id },
        data: {
          status: HrEmployeeStatus.TERMINATED,
          isActive: false,
          notes: notes ?? undefined
        }
      });

      const action = await tx.disciplinaryAction.create({
        data: {
          employeeId: resolvedParams.id,
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
          entityId: resolvedParams.id,
          metadata: {
            actionId: action.id,
            reason: parsed.data.reason,
            effectiveDate: effectiveDate.toISOString()
          }
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: resolvedParams.id }, include: employeeInclude });
    });

    if (!saved) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(saved) });
  } catch (err: any) {
    console.error("terminate employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo terminar al empleado" }, { status: 400 });
  }
}
