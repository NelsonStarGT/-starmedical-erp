import { addDays, startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { dayQuerySchema } from "@/lib/hr/attendance/schemas";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = dayQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) throw { status: 400, body: { error: "Fecha inválida" } };

  const date = new Date(parsed.data.date + "T00:00:00Z");
  const next = addDays(date, 1);

  const employees = await prisma.hrEmployee.findMany({
    where: {
      status: "ACTIVE",
      onboardingStatus: "ACTIVE",
      ...(parsed.data.branchId ? { branchAssignments: { some: { isPrimary: true, branchId: parsed.data.branchId } } } : {})
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      onboardingStatus: true,
      branchAssignments: { where: { isPrimary: true }, select: { branch: { select: { name: true, id: true } } }, take: 1 }
    }
  });

  const events = await prisma.hrAttendanceEvent.findMany({
    where: { occurredAt: { gte: date, lt: next }, employeeId: { in: employees.map((e) => e.id) } },
    orderBy: { occurredAt: "asc" }
  });

  const byEmployee = new Map<string, typeof events>();
  events.forEach((ev) => {
    const list = byEmployee.get(ev.employeeId) || [];
    list.push(ev);
    byEmployee.set(ev.employeeId, list);
  });

  const data = employees.map((emp) => {
    const evs = byEmployee.get(emp.id) || [];
    const checkIn = evs.find((e) => e.type === "CHECK_IN") || null;
    const checkOut = evs.find((e) => e.type === "CHECK_OUT") || null;
    let status: "SIN_REGISTRO" | "EN_TURNO" | "COMPLETO" = "SIN_REGISTRO";
    if (checkIn && checkOut) status = "COMPLETO";
    else if (checkIn) status = "EN_TURNO";
    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      branch: emp.branchAssignments[0]?.branch || null,
      status,
      events: evs.map((e) => ({ id: e.id, type: e.type, occurredAt: e.occurredAt.toISOString(), note: e.note }))
    };
  });

  return NextResponse.json({ data });
}

export const GET = withApiErrorHandling(handler);
