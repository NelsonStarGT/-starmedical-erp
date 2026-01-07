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
    const updated = await prisma.hrEmployee.update({
      where: { id: params.id },
      data: {
        status: HrEmployeeStatus.SUSPENDED,
        terminationDate: null,
        isActive: true
      },
      include: employeeInclude
    });

    return NextResponse.json({ data: serializeEmployee(updated) });
  } catch (err: any) {
    console.error("suspend employee", err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo suspender al empleado" }, { status: 400 });
  }
}
