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
    const updated = await prisma.$transaction(async (tx) => {
      await tx.employeeEngagement.updateMany({
        where: { employeeId: params.id },
        data: { status: HrEmployeeStatus.SUSPENDED, endDate: null }
      });

      await tx.hrEmployee.update({
        where: { id: params.id },
        data: {
          status: HrEmployeeStatus.SUSPENDED,
          isActive: true
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: params.id }, include: employeeInclude });
    });

    if (!updated) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(updated) });
  } catch (err: any) {
    console.error("suspend employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo suspender al empleado" }, { status: 400 });
  }
}
