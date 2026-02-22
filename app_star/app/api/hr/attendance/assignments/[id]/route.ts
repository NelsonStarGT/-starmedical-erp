import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { assignmentUpdateSchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  return null;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw { status: 400, body: { error: "Fecha inválida" } };
  return d;
}

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = authorize(req);
  if (authError) return authError;

  const body = await safeJson(req);
  const parsed = assignmentUpdateSchema.safeParse(body);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const existing = await prisma.employeeSiteAssignment.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

  const startDate = parsed.data.startDate ? (parseDate(parsed.data.startDate) as Date) : existing.startDate;
  const endDate = parsed.data.endDate !== undefined ? parseDate(parsed.data.endDate || null) : existing.endDate;
  if (endDate && startDate && endDate.getTime() < startDate.getTime()) throw { status: 400, body: { error: "endDate debe ser >= startDate" } };

  const overlap = await prisma.employeeSiteAssignment.findFirst({
    where: {
      id: { not: params.id },
      employeeId: parsed.data.employeeId || existing.employeeId,
      siteId: parsed.data.siteId || existing.siteId,
      startDate: { lte: endDate || new Date("9999-12-31") },
      OR: [{ endDate: null }, { endDate: { gte: startDate } }]
    }
  });
  if (overlap) throw { status: 409, body: { error: "Existe asignación activa en el rango" } };

  const updated = await prisma.employeeSiteAssignment.update({
    where: { id: params.id },
    data: {
      employeeId: parsed.data.employeeId || existing.employeeId,
      siteId: parsed.data.siteId || existing.siteId,
      shiftId: parsed.data.shiftId || existing.shiftId,
      startDate: startDate || existing.startDate,
      endDate: endDate === undefined ? existing.endDate : endDate,
      isPrimary: parsed.data.isPrimary ?? existing.isPrimary
    }
  });

  return NextResponse.json({ data: updated });
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = authorize(req);
  if (authError) return authError;

  const existing = await prisma.employeeSiteAssignment.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

  const now = new Date();
  const updated = await prisma.employeeSiteAssignment.update({
    where: { id: params.id },
    data: { endDate: existing.endDate || now }
  });

  return NextResponse.json({ data: updated });
}

export const PATCH = withApiErrorHandling(patchHandler);
export const DELETE = withApiErrorHandling(deleteHandler);
