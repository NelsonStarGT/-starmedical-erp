import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { attendanceEventSchema } from "@/lib/hr/attendance/schemas";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { isEligible, upsertEvent } from "@/lib/hr/attendance/events";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 30, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const parsed = attendanceEventSchema.safeParse(await safeJson(req));
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const employee = await prisma.hrEmployee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true, status: true, onboardingStatus: true }
  });
  if (!employee) throw { status: 404, body: { error: "Empleado no encontrado" } };
  isEligible(employee);

  const occurredAt = new Date(parsed.data.occurredAt);
  const created = await prisma.$transaction((tx) =>
    upsertEvent(tx as any, {
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      occurredAt,
      note: parsed.data.note || null,
      createdByUserId: auth.user?.id || null
    })
  );

  return NextResponse.json({ data: { id: created.id } }, { status: 201 });
}

export const POST = withApiErrorHandling(handler);
