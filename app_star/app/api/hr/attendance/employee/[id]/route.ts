import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";
import { rangeQuerySchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = rangeQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Rango inválido" } };

  const employee = await prisma.hrEmployee.findUnique({ where: { id: params.id }, select: { id: true, userId: true, onboardingStatus: true, status: true } });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
  if (auth.user?.roles?.some((r) => r.toUpperCase() === "STAFF") && employee.userId !== auth.user.id) {
    throw { status: 403, body: { error: "No autorizado" } };
  }
  if (employee.onboardingStatus !== "ACTIVE") throw { status: 409, body: { error: "Empleado no elegible (onboarding incompleto)" } };

  const from = new Date(parsed.data.from + "T00:00:00Z");
  const to = addDays(new Date(parsed.data.to + "T00:00:00Z"), 1);

  const events = await prisma.hrAttendanceEvent.findMany({
    where: { employeeId: params.id, occurredAt: { gte: from, lt: to } },
    orderBy: { occurredAt: "asc" }
  });

  return NextResponse.json({
    data: events.map((e) => ({
      id: e.id,
      type: e.type,
      occurredAt: e.occurredAt.toISOString(),
      note: e.note
    }))
  });
}

export const GET = withApiErrorHandling(handler);
