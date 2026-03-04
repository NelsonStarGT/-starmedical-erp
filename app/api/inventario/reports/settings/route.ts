import { NextRequest, NextResponse } from "next/server";
import { InventoryReportFrequency, InventoryReportType } from "@prisma/client";
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
    const data = await prisma.inventoryEmailSetting.findMany({
      where: inventoryWhere(scope, {}, { branchScoped: true }),
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener la configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const recipients = normalizeRecipients(body.recipients ?? body.recipientsJson);
    if (recipients.length === 0) return NextResponse.json({ error: "Agrega al menos un correo válido" }, { status: 400 });

    const scheduleType: InventoryScheduleType =
      body.scheduleType === "MONTHLY" ? "MONTHLY" : body.scheduleType === "ONE_TIME" ? "ONE_TIME" : "BIWEEKLY";
    const biweeklyMode: InventoryBiweeklyMode =
      body.biweeklyMode === "EVERY_15_DAYS" ? "EVERY_15_DAYS" : "FIXED_DAYS";
    const sendTime = normalizeTimeString(body.sendTime);
    const timezone = body.timezone || "America/Guatemala";
    const frequency: InventoryReportFrequency = scheduleType === "MONTHLY" ? "MONTHLY" : "BIWEEKLY";
    const fixedDays = biweeklyMode === "FIXED_DAYS" ? body.fixedDays || "15,LAST" : null;
    const startDateRaw =
      biweeklyMode === "EVERY_15_DAYS" && body.startDate ? new Date(body.startDate) : null;
    const startDate = startDateRaw && !Number.isNaN(startDateRaw.getTime()) ? startDateRaw : null;
    if (scheduleType === "BIWEEKLY" && biweeklyMode === "EVERY_15_DAYS" && !startDate) {
      return NextResponse.json({ error: "Indica una fecha de inicio para cada 15 días" }, { status: 400 });
    }

    const useLastDay = body.useLastDay !== false;
    const monthlyDay =
      scheduleType === "MONTHLY" && !useLastDay && body.monthlyDay ? Number(body.monthlyDay) : null;
    if (scheduleType === "MONTHLY" && monthlyDay && (monthlyDay < 1 || monthlyDay > 28)) {
      return NextResponse.json({ error: "El día mensual debe estar entre 1 y 28" }, { status: 400 });
    }

    const oneTimeDate =
      scheduleType === "ONE_TIME" && body.oneTimeDate ? new Date(body.oneTimeDate) : null;
    const oneTimeTime =
      scheduleType === "ONE_TIME" && typeof body.oneTimeTime === "string" ? normalizeTimeString(body.oneTimeTime) : null;
    if (scheduleType === "ONE_TIME" && (!oneTimeDate || !oneTimeTime)) {
      return NextResponse.json({ error: "Indica fecha y hora para el envío único" }, { status: 400 });
    }

    const payload = {
      isEnabled: Boolean(body.isEnabled),
      frequency,
      reportType: (body.reportType || "KARDEX") as InventoryReportType,
      branchId: scope.branchId || body.branchId || null,
      recipients: JSON.stringify(recipients),
      recipientsJson: JSON.stringify(recipients),
      includeAllProducts: body.includeAllProducts ?? true,
      scheduleType,
      sendTime,
      timezone,
      biweeklyMode,
      fixedDays,
      startDate: scheduleType === "BIWEEKLY" ? startDate : null,
      monthlyDay: scheduleType === "MONTHLY" ? monthlyDay : null,
      useLastDay: scheduleType === "MONTHLY" ? useLastDay : null,
      oneTimeDate: scheduleType === "ONE_TIME" ? oneTimeDate : null,
      oneTimeTime: scheduleType === "ONE_TIME" ? oneTimeTime : null
    };
    if (scope.branchId && body.branchId && body.branchId !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }
    const record = body.id
      ? await updateInventoryEmailSettingScoped(scope.tenantId, scope.branchId, String(body.id), payload)
      : await prisma.inventoryEmailSetting.create({ data: inventoryCreateData(scope, payload) });
    return NextResponse.json({ data: record });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar la configuración" }, { status: 400 });
  }
}

async function updateInventoryEmailSettingScoped(tenantId: string, branchId: string | null, id: string, payload: any) {
  const current = await prisma.inventoryEmailSetting.findFirst({
    where: { tenantId, deletedAt: null, id, ...(branchId ? { branchId } : {}) }
  });
  if (!current) throw new Error("Configuración no encontrada");
  return prisma.inventoryEmailSetting.update({ where: { id: current.id }, data: payload });
}

function normalizeRecipients(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((r) => String(r).trim()).filter(Boolean);
    } catch {
      // ignore
    }
    return raw
      .split(/[;,]/)
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return [];
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
