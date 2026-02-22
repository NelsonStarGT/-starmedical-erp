import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { processedDayQuerySchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = processedDayQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Parámetros inválidos" } };

  const date = new Date(`${parsed.data.date}T00:00:00`);
  const processed = await prisma.attendanceProcessedDay.findMany({
    where: { date, ...(parsed.data.siteId ? { siteId: parsed.data.siteId } : {}) },
    orderBy: { employeeId: "asc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, photoUrl: true } },
      incidents: { where: { date }, select: { id: true, type: true, severity: true, resolved: true } }
    }
  });

  return NextResponse.json({
    data: processed.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: `${row.employee?.firstName || ""} ${row.employee?.lastName || ""}`.trim() || row.employee?.employeeCode || row.employeeId,
      employeeCode: row.employee?.employeeCode || null,
      photoUrl: row.employee?.photoUrl || null,
      firstIn: row.firstIn,
      lastOut: row.lastOut,
      workedMinutes: row.workedMinutes,
      breakMinutes: row.breakMinutes,
      overtimeMinutes: row.overtimeMinutes,
      lunchMinutes: row.lunchMinutes,
      effectiveMinutes: row.effectiveMinutes,
      lateMinutes: row.lateMinutes,
      status: row.status,
      needsApproval: row.needsApproval,
      incidents: row.incidents
    }))
  });
}

export const GET = withApiErrorHandling(handler);
