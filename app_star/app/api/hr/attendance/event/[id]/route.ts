import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { attendanceEventUpdateSchema } from "@/lib/hr/attendance/schemas";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 30, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const parsed = attendanceEventUpdateSchema.safeParse(await safeJson(req));
  if (!parsed.success) throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };

  const existing = await prisma.hrAttendanceEvent.findUnique({ where: { id: params.id } });
  if (!existing) throw { status: 404, body: { error: "Evento no encontrado" } };

  await prisma.hrAttendanceEvent.update({
    where: { id: params.id },
    data: {
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : existing.occurredAt,
      note: parsed.data.note ?? existing.note
    }
  });

  return NextResponse.json({ data: { id: params.id } });
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:ATTENDANCE:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const existing = await prisma.hrAttendanceEvent.findUnique({ where: { id: params.id } });
  if (!existing) throw { status: 404, body: { error: "Evento no encontrado" } };

  await prisma.hrAttendanceEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiErrorHandling(patchHandler);
export const DELETE = withApiErrorHandling(deleteHandler);
