import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF"], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.employeeEngagement.updateMany({
        where: { employeeId: resolvedParams.id },
        data: { status: HrEmployeeStatus.ACTIVE, endDate: null }
      });

      await tx.hrEmployee.update({
        where: { id: resolvedParams.id },
        data: { status: HrEmployeeStatus.ACTIVE, isActive: true }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: auth.user?.id || null,
          actorRole: auth.user?.roles?.[0]?.role?.name || null,
          action: "HR_EMPLOYEE_ACTIVATE",
          entityType: "HrEmployee",
          entityId: resolvedParams.id
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: resolvedParams.id }, include: employeeInclude });
    });

    if (!updated) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(updated) });
  } catch (err: any) {
    console.error("activate employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo activar al empleado" }, { status: 400 });
  }
}
