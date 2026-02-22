import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { processDayQuerySchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = processDayQuerySchema
    .extend({ date: processDayQuerySchema.shape.date.optional() })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Parámetros inválidos" } };

  const dateParam = parsed.data.date || new Date().toISOString().slice(0, 10);
  const date = new Date(`${dateParam}T00:00:00`);
  const end = addDays(date, 1);

  const employee = await prisma.hrEmployee.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true, status: true, onboardingStatus: true }
  });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
  if (auth.user?.roles?.some((r) => r.toUpperCase() === "STAFF") && employee.userId !== auth.user.id) {
    throw { status: 403, body: { error: "No autorizado" } };
  }

  const processedDay = await prisma.attendanceProcessedDay.findUnique({
    where: { employeeId_date: { employeeId: params.id, date } },
    include: { incidents: true, shift: true }
  });

  const rawEvents = await prisma.attendanceRawEvent.findMany({
    where: {
      employeeId: params.id,
      occurredAt: { gte: date, lt: end },
      ...(parsed.data.siteId ? { siteId: parsed.data.siteId } : {})
    },
    orderBy: { occurredAt: "asc" }
  });

  const incidents = await prisma.attendanceIncident.findMany({
    where: { employeeId: params.id, date },
    orderBy: { severity: "desc" }
  });

  return NextResponse.json({
    data: {
      employee: {
        id: employee.id,
        name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.employeeCode || "",
        code: employee.employeeCode
      },
      processedDay,
      shift: processedDay?.shift
        ? {
            id: processedDay.shift.id,
            name: processedDay.shift.name,
            startTime: processedDay.shift.startTime,
            endTime: processedDay.shift.endTime,
            toleranceMinutes: processedDay.shift.toleranceMinutes
          }
        : null,
      incidents,
      rawEvents
    }
  });
}

export const GET = withApiErrorHandling(handler);
