import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const employee = await tx.hrEmployee.update({
        where: { id: params.id },
        data: {
          status: HrEmployeeStatus.ACTIVE,
          terminationDate: null,
          isActive: true
        }
      });

      await tx.hrEmployeeBranchAssignment.updateMany({
        where: { employeeId: params.id },
        data: { endDate: null, isPrimary: false }
      });

      await tx.hrEmployeeBranchAssignment.upsert({
        where: { employeeId_branchId: { employeeId: params.id, branchId: employee.primaryBranchId } as any },
        update: { isPrimary: true, endDate: null },
        create: {
          employeeId: params.id,
          branchId: employee.primaryBranchId,
          isPrimary: true,
          startDate: employee.hireDate,
          createdById: auth.user?.id || null
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: params.id }, include: employeeInclude });
    });

    if (!saved) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(saved) });
  } catch (err: any) {
    console.error("activate employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo activar al empleado" }, { status: 400 });
  }
}
