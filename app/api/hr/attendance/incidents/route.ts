import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { AttendanceIncidentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireHrPermission } from "@/lib/api/rbac";
import { attendanceIncidentsQuerySchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = attendanceIncidentsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Parámetros inválidos" } };

  const dateParam = parsed.data.date || new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateParam}T00:00:00`);
  const end = addDays(start, 1);

  const incidents = await prisma.attendanceIncident.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(parsed.data.siteId ? { siteId: parsed.data.siteId } : {}),
      ...(parsed.data.employeeId ? { employeeId: parsed.data.employeeId } : {}),
      ...(parsed.data.type ? { type: parsed.data.type as AttendanceIncidentType } : {}),
      ...(parsed.data.resolved !== undefined ? { resolved: parsed.data.resolved } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      rawEvent: true,
      processedDay: { select: { status: true, workedMinutes: true, breakMinutes: true } },
      resolvedBy: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json({
    data: incidents.map((incident) => ({
      id: incident.id,
      employeeId: incident.employeeId,
      employeeName: `${incident.employee?.firstName || ""} ${incident.employee?.lastName || ""}`.trim() || incident.employee?.employeeCode || incident.employeeId,
      type: incident.type,
      severity: incident.severity,
      resolved: incident.resolved,
      resolvedAt: incident.resolvedAt,
      resolvedBy: incident.resolvedBy ? { id: incident.resolvedBy.id, name: incident.resolvedBy.name } : null,
      notes: incident.notes,
      date: incident.date,
      siteId: incident.siteId,
      rawEvent: incident.rawEvent
        ? {
            id: incident.rawEvent.id,
            occurredAt: incident.rawEvent.occurredAt,
            type: incident.rawEvent.type,
            source: incident.rawEvent.source,
            photoUrl: incident.rawEvent.photoUrl,
            photoHash: incident.rawEvent.photoHash,
            lat: incident.rawEvent.lat,
            lng: incident.rawEvent.lng,
            accuracy: incident.rawEvent.accuracy,
            faceStatus: incident.rawEvent.faceStatus,
            zoneStatus: incident.rawEvent.zoneStatus
          }
        : null,
      processedDay: incident.processedDay
        ? {
            status: incident.processedDay.status,
            workedMinutes: incident.processedDay.workedMinutes,
            breakMinutes: incident.processedDay.breakMinutes
          }
        : null
    }))
  });
}

export const GET = withApiErrorHandling(handler);
