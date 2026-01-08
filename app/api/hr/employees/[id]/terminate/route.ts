import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const terminationDate = parseDateInput(body?.terminationDate || new Date().toISOString(), "Fecha de terminación", {
      required: true
    })!;
    const notes = cleanNullableString(body?.notes);

    const saved = await prisma.$transaction(async (tx) => {
      await tx.employeeEngagement.updateMany({
        where: { employeeId: params.id },
        data: { status: HrEmployeeStatus.TERMINATED, endDate: terminationDate }
      });

      await tx.employeeBranchAssignment.updateMany({
        where: { employeeId: params.id },
        data: { endDate: terminationDate }
      });

      await tx.employeePositionAssignment.updateMany({
        where: { employeeId: params.id },
        data: { endDate: terminationDate }
      });

      await tx.notification.deleteMany({ where: { employeeId: params.id, type: NotificationType.LICENSE_EXPIRY } });

      await tx.hrEmployee.update({
        where: { id: params.id },
        data: {
          status: HrEmployeeStatus.TERMINATED,
          isActive: false,
          notes: notes ?? undefined
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: params.id }, include: employeeInclude });
    });

    if (!saved) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(saved) });
  } catch (err: any) {
    console.error("terminate employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo terminar al empleado" }, { status: 400 });
  }
}
