import { AppointmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { safeCreatePortalAuditLog } from "@/lib/portal/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { getPortalSessionContextFromRequest } from "@/lib/portal/session";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const APPOINTMENT_REQUEST_LIMIT_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const copy = new Date(start);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Has alcanzado el límite de solicitudes de cita. Intenta mañana." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(req: NextRequest) {
  const session = await getPortalSessionContextFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const requestMeta = readPortalRequestMeta(req.headers);
  const body = await req.json().catch(() => null);
  const typeId = String(body?.typeId || "").trim();
  const branchId = String(body?.branchId || "").trim();
  const reason = String(body?.reason || "").trim();
  const preferredDate1Raw = String(body?.preferredDate1 || "").trim();
  const preferredDate2Raw = String(body?.preferredDate2 || "").trim();
  const preferredDate1 = preferredDate1Raw ? new Date(preferredDate1Raw) : null;
  const preferredDate2 = preferredDate2Raw ? new Date(preferredDate2Raw) : null;

  if (!typeId || !branchId || !reason || !preferredDate1 || Number.isNaN(preferredDate1.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Debes completar tipo, sede, motivo y primera fecha preferida." },
      { status: 400 }
    );
  }

  const now = new Date();
  if (preferredDate1.getTime() < now.getTime() - 60_000) {
    return NextResponse.json({ ok: false, error: "La fecha preferida debe ser futura." }, { status: 400 });
  }

  const dayKey = startOfDay(now).toISOString().slice(0, 10);
  const dailyRate = await consumePortalRateLimit(`portal:appointments:request:${session.clientId}:${dayKey}`, {
    limit: APPOINTMENT_REQUEST_LIMIT_PER_DAY,
    windowMs: DAY_MS
  });
  if (!dailyRate.allowed) return responseRateLimited(dailyRate.retryAfterSeconds);

  const [type, branch] = await Promise.all([
    prisma.appointmentType.findUnique({ where: { id: typeId }, select: { id: true, status: true, name: true, durationMin: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true, isActive: true } })
  ]);
  if (!type || type.status !== "Activo") {
    return NextResponse.json({ ok: false, error: "Tipo de cita no disponible." }, { status: 400 });
  }
  if (!branch || !branch.isActive) {
    return NextResponse.json({ ok: false, error: "Sede no disponible." }, { status: 400 });
  }

  const weekStart = startOfWeek(preferredDate1);
  const weekEnd = endOfWeek(preferredDate1);
  const duplicate = await prisma.appointment.findFirst({
    where: {
      patientId: session.clientId,
      typeId,
      date: { gte: weekStart, lte: weekEnd },
      status: {
        in: [AppointmentStatus.REQUESTED, AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA]
      }
    },
    select: { id: true, date: true, status: true }
  });
  if (duplicate) {
    return NextResponse.json(
      { ok: false, error: "Ya existe una solicitud/cita similar para esta semana. Espera confirmación de recepción." },
      { status: 409 }
    );
  }

  const created = await prisma.appointment.create({
    data: {
      date: preferredDate1,
      durationMin: type.durationMin || 30,
      patientId: session.clientId,
      specialistId: "UNASSIGNED",
      branchId,
      typeId,
      status: AppointmentStatus.REQUESTED,
      paymentStatus: "PENDIENTE",
      paymentIntentId: null,
      portalPaymentStatus: "NONE",
      notes:
        `Solicitud portal.\nMotivo: ${reason}` +
        `${preferredDate2 && !Number.isNaN(preferredDate2.getTime()) ? `\nPreferencia 2: ${preferredDate2.toISOString()}` : ""}`,
      createdById: `portal:${session.clientId}`,
      updatedById: null
    },
    select: { id: true, date: true, status: true }
  });

  await safeCreatePortalAuditLog({
    clientId: session.clientId,
    action: "APPOINTMENT_REQUESTED",
    metadata: {
      appointmentId: created.id,
      typeId,
      typeName: type.name,
      branchId,
      branchName: branch.name,
      preferredDate1: preferredDate1.toISOString(),
      preferredDate2: preferredDate2 && !Number.isNaN(preferredDate2.getTime()) ? preferredDate2.toISOString() : null,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent
    }
  });

  return NextResponse.json({
    ok: true,
    data: {
      appointmentId: created.id,
      status: created.status,
      date: created.date.toISOString()
    }
  });
}
