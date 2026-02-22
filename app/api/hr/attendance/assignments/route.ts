import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { assignmentSchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

function authorize(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  return null;
}

function parseDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw { status: 400, body: { error: "Fecha inválida" } };
  return d;
}

async function getHandler(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;
  const employeeId = req.nextUrl.searchParams.get("employeeId") || undefined;

  const assignments = await prisma.employeeSiteAssignment.findMany({
    where: {
      ...(siteId ? { siteId } : {}),
      ...(employeeId ? { employeeId } : {})
    },
    orderBy: { startDate: "desc" },
    include: { shift: true }
  });

  return NextResponse.json({ data: assignments });
}

async function postHandler(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const body = await safeJson(req);
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const startDate = parseDate(parsed.data.startDate);
  const endDate = parsed.data.endDate ? parseDate(parsed.data.endDate) : null;
  if (endDate && endDate.getTime() < startDate.getTime()) throw { status: 400, body: { error: "endDate debe ser >= startDate" } };

  const overlap = await prisma.employeeSiteAssignment.findFirst({
    where: {
      employeeId: parsed.data.employeeId,
      siteId: parsed.data.siteId,
      startDate: { lte: endDate || new Date("9999-12-31") },
      OR: [{ endDate: null }, { endDate: { gte: startDate } }]
    }
  });
  if (overlap) throw { status: 409, body: { error: "Existe asignación activa en el rango" } };

  const created = await prisma.employeeSiteAssignment.create({
    data: {
      employeeId: parsed.data.employeeId,
      siteId: parsed.data.siteId,
      shiftId: parsed.data.shiftId,
      startDate,
      endDate,
      isPrimary: parsed.data.isPrimary ?? false
    }
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
