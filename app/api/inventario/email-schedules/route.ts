import { NextRequest, NextResponse } from "next/server";
import { InventoryReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import type { InventoryBiweeklyMode, InventoryScheduleType } from "@/lib/types/inventario";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const data = await prisma.inventoryEmailSchedule.findMany({
      where: inventoryWhere(scope, {}, { branchScoped: true }),
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las reglas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const payload = normalizePayload(body);
    if (scope.branchId && payload.branchId && payload.branchId !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const record = await prisma.inventoryEmailSchedule.create({
      data: inventoryCreateData(scope, { ...payload, branchId: scope.branchId || payload.branchId })
    });
    return NextResponse.json({ data: record });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la regla" }, { status: 400 });
  }
}

function normalizePayload(body: any) {
  const email = String(body.email || "").trim();
  if (!email || !/\S+@\S+\.\S+/.test(email)) throw new Error("Correo inválido");

  const reportType: InventoryReportType =
    body.reportType === "MOVIMIENTOS" || body.reportType === "CIERRE_SAT" ? body.reportType : "KARDEX";

  const scheduleType: InventoryScheduleType =
    body.scheduleType === "MONTHLY" ? "MONTHLY" : body.scheduleType === "BIWEEKLY" ? "BIWEEKLY" : "ONE_TIME";

  const sendTime = normalizeTimeString(body.sendTime);
  const timezone = body.timezone || "America/Guatemala";

  const biweeklyMode: InventoryBiweeklyMode =
    body.biweeklyMode === "EVERY_15_DAYS" ? "EVERY_15_DAYS" : "FIXED_DAYS";
  const fixedDays = biweeklyMode === "FIXED_DAYS" ? body.fixedDays || "15,LAST" : null;
  const startDate =
    scheduleType === "BIWEEKLY" && biweeklyMode === "EVERY_15_DAYS" && body.startDate ? new Date(body.startDate) : null;
  if (scheduleType === "BIWEEKLY" && biweeklyMode === "EVERY_15_DAYS" && !startDate) {
    throw new Error("Indica fecha de inicio para cada 15 días");
  }

  const useLastDay = body.useLastDay !== false;
  const monthlyDay = scheduleType === "MONTHLY" && !useLastDay && body.monthlyDay ? Number(body.monthlyDay) : null;
  if (scheduleType === "MONTHLY" && monthlyDay && (monthlyDay < 1 || monthlyDay > 28)) {
    throw new Error("El día mensual debe estar entre 1 y 28");
  }

  const oneTimeDate = scheduleType === "ONE_TIME" && body.oneTimeDate ? new Date(body.oneTimeDate) : null;
  const oneTimeTime = scheduleType === "ONE_TIME" && body.oneTimeTime ? normalizeTimeString(body.oneTimeTime) : null;
  if (scheduleType === "ONE_TIME" && (!oneTimeDate || !oneTimeTime)) {
    throw new Error("Indica fecha y hora para el envío único");
  }

  return {
    email,
    isEnabled: body.isEnabled !== false,
    reportType,
    branchId: body.branchId || null,
    scheduleType,
    sendTime,
    timezone,
    biweeklyMode,
    fixedDays,
    startDate,
    monthlyDay: scheduleType === "MONTHLY" ? monthlyDay : null,
    useLastDay: scheduleType === "MONTHLY" ? useLastDay : null,
    oneTimeDate: scheduleType === "ONE_TIME" ? oneTimeDate : null,
    oneTimeTime: scheduleType === "ONE_TIME" ? oneTimeTime : null
  };
}

function normalizeTimeString(raw: any) {
  const fallback = "23:30";
  if (!raw || typeof raw !== "string") return fallback;
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
