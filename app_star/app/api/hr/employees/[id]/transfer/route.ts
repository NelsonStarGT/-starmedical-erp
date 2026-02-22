import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { transferSchema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";
import { employeeIncludeFor, serializeEmployee } from "@/lib/hr/serializers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const startDate = parseDateInput(parsed.data.startDate, "Fecha de inicio") || new Date();
  const comments = parsed.data.comments?.trim() || null;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.employeeBranchAssignment.updateMany({
        where: { employeeId: resolvedParams.id, isPrimary: true },
        data: { isPrimary: false, endDate: startDate }
      });

      const existing = await tx.employeeBranchAssignment.findFirst({
        where: { employeeId: resolvedParams.id, branchId: parsed.data.branchId }
      });

      if (existing) {
        await tx.employeeBranchAssignment.update({
          where: { id: existing.id },
          data: {
            isPrimary: true,
            code: parsed.data.workLocation,
            startDate,
            endDate: null
          }
        });
      } else {
        await tx.employeeBranchAssignment.create({
          data: {
            employeeId: resolvedParams.id,
            branchId: parsed.data.branchId,
            isPrimary: true,
            code: parsed.data.workLocation,
            startDate
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: auth.user?.id || null,
          actorRole: auth.user?.roles?.[0] || null,
          action: "HR_EMPLOYEE_TRANSFER",
          entityType: "HrEmployee",
          entityId: resolvedParams.id,
          metadata: {
            branchId: parsed.data.branchId,
            workLocation: parsed.data.workLocation,
            startDate: startDate ? startDate.toISOString() : null,
            comments
          }
        }
      });

      return tx.hrEmployee.findUnique({ where: { id: resolvedParams.id }, include: employeeIncludeFor(auth.user) });
    });

    if (!updated) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    return NextResponse.json({ data: serializeEmployee(updated, auth.user) });
  } catch (err) {
    console.error("[hr:transfer]", { employeeId: resolvedParams.id, err });
    return NextResponse.json({ error: "No se pudo trasladar" }, { status: 500 });
  }
}
