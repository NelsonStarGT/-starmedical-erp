import { NextRequest, NextResponse } from "next/server";
import { DisciplinaryActionStatus, DisciplinaryActionType, HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { suspendSchema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER"], "HR:EMPLOYEES:DELETE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = suspendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const issuedAt = parseDateInput(parsed.data.startDate, "Fecha de inicio", { required: true })!;
    const endDate = parseDateInput(parsed.data.endDate, "Fecha fin");

    const updated = await prisma.$transaction(async (tx) => {
      await tx.employeeEngagement.updateMany({
        where: { employeeId: resolvedParams.id },
        data: { status: HrEmployeeStatus.SUSPENDED, endDate: null }
      });

      await tx.hrEmployee.update({
        where: { id: resolvedParams.id },
        data: {
          status: HrEmployeeStatus.SUSPENDED,
          isActive: true
        }
      });

      const action = await tx.disciplinaryAction.create({
        data: {
          employeeId: resolvedParams.id,
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
          actorRole: auth.user?.roles?.[0]?.role?.name || null,
          action: "HR_EMPLOYEE_SUSPEND",
          entityType: "HrEmployee",
          entityId: resolvedParams.id,
          metadata: {
            actionId: action.id,
            title: action.title,
            issuedAt: issuedAt.toISOString(),
            endDate: endDate ? endDate.toISOString() : null
          }
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: resolvedParams.id }, include: employeeInclude });
    });

    if (!updated) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(updated) });
  } catch (err: any) {
    console.error("suspend employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo suspender al empleado" }, { status: 400 });
  }
}
