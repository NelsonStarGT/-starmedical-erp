import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma, TimeClockLogSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { manualLogSchema, timeClockLogFiltersSchema } from "@/lib/hr/attendance/schemas";
import { serializeLog } from "@/lib/hr/attendance/serializers";
import { processAttendanceDay } from "@/lib/hr/attendance/service";

export const dynamic = "force-dynamic";

const startOfDay = (value: Date) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

function parseFilters(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return timeClockLogFiltersSchema.safeParse({
    search: params.get("search") || undefined,
    employeeId: params.get("employeeId") || undefined,
    date: params.get("date") || undefined,
    source: params.get("source") || undefined,
    page: params.get("page") || undefined,
    pageSize: params.get("pageSize") || undefined
  });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"], "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = parseFilters(req);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { search, employeeId, date, source, page, pageSize } = parsed.data;
  const where: Prisma.TimeClockLogWhereInput = {};
  if (employeeId) where.employeeId = employeeId;
  if (source) where.source = source as TimeClockLogSource;

  if (search) {
    const term = search.trim();
    where.HrEmployee = {
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { employeeCode: { contains: term, mode: "insensitive" } }
      ]
    };
  }

  if (date) {
    const start = startOfDay(new Date(date));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.timestamp = { gte: start, lt: end };
  }

  const [total, logs] = await prisma.$transaction([
    prisma.timeClockLog.count({ where }),
    prisma.timeClockLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      include: { HrEmployee: true, TimeClockDevice: true, Branch: true },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return NextResponse.json({
    data: logs.map(serializeLog),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER"], "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = manualLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const timestamp = new Date(parsed.data.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const employee = await prisma.hrEmployee.findUnique({
    where: { id: parsed.data.employeeId },
    include: { branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 } }
  });
  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const branchId = employee.branchAssignments?.[0]?.branchId || null;
  const legalEntityId = employee.primaryLegalEntityId || null;

  const log = await prisma.timeClockLog.create({
    data: {
      id: randomUUID(),
      employeeId: parsed.data.employeeId,
      deviceId: null,
      branchId,
      legalEntityId,
      timestamp,
      type: parsed.data.type,
      source: TimeClockLogSource.MANUAL,
      notes: parsed.data.notes?.trim() || null
    },
    include: { HrEmployee: true, TimeClockDevice: true, Branch: true }
  });

  await processAttendanceDay({ employeeId: parsed.data.employeeId, date: startOfDay(timestamp) });

  return NextResponse.json({ data: serializeLog(log) }, { status: 201 });
}
