import { NextRequest, NextResponse } from "next/server";
import { InventoryReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { sendMail } from "@/lib/email/mailer";
import { generateMovementsPdf } from "@/lib/inventory/movementsReport";
import { generateKardexXlsx } from "@/lib/inventory/reports";
import { generateCierreSatPdf } from "@/lib/inventory/cierreSat";
import { computeRangeForSetting, formatDate, parseRecipients, resolveScheduleType } from "@/lib/inventory/reportSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  try {
    const schedule = await prisma.inventoryEmailSchedule.findFirst({
      where: inventoryWhere(scope, { id: params.id }, { branchScoped: true })
    });
    if (!schedule) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    if (!schedule.isEnabled) return NextResponse.json({ error: "La regla está desactivada" }, { status: 400 });

    const recipients = parseRecipients(schedule);
    if (recipients.length === 0) return NextResponse.json({ error: "No hay destinatarios configurados" }, { status: 400 });

    const range = computeRangeForSetting(schedule, new Date());
    const attachment = await buildAttachment(schedule.reportType as InventoryReportType, {
      tenantId: scope.tenantId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId: schedule.branchId
    });

    const rangeLabel = `${formatDate(range.dateFrom)}-${formatDate(range.dateTo)}`;
    const scheduleType = resolveScheduleType(schedule);
    const label =
      scheduleType === "MONTHLY" ? "Mensual" : scheduleType === "BIWEEKLY" ? "Quincenal" : "Única";
    const subject = buildSubject(schedule.reportType as InventoryReportType, label, rangeLabel);

    await sendMail({
      moduleKey: "INVENTARIO",
      to: recipients,
      subject,
      text: "Envio manual de reporte automático",
      attachments: [attachment]
    });

    await prisma.inventoryEmailSchedule.update({
      where: { id: schedule.id },
      data: { lastSentAt: new Date() }
    });

    return NextResponse.json({ sent: true, recipients: recipients.length, range: { from: range.dateFrom, to: range.dateTo } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo ejecutar la regla" }, { status: 500 });
  }
}

async function buildAttachment(
  type: InventoryReportType,
  params: { tenantId: string; dateFrom: Date; dateTo: Date; branchId?: string | null }
) {
  if (type === "MOVIMIENTOS") {
    const pdf = await generateMovementsPdf({
      tenantId: params.tenantId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId || undefined
    });
    return {
      filename: `movimientos-${formatDate(params.dateFrom)}-${formatDate(params.dateTo)}.pdf`,
      content: pdf,
      contentType: "application/pdf"
    };
  }
  if (type === "CIERRE_SAT") {
    const pdf = await generateCierreSatPdf({
      tenantId: params.tenantId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId || undefined
    });
    return {
      filename: `cierre-sat-${formatDate(params.dateFrom)}-${formatDate(params.dateTo)}.pdf`,
      content: pdf,
      contentType: "application/pdf"
    };
  }
  const buffer = await generateKardexXlsx({
    tenantId: params.tenantId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    branchId: params.branchId || undefined
  });
  return {
    filename: `kardex-${formatDate(params.dateFrom)}-${formatDate(params.dateTo)}.xlsx`,
    content: buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
}

function buildSubject(type: InventoryReportType, label: string, range: string) {
  if (type === "MOVIMIENTOS") return `StarMedical - Reporte Movimientos (${label} ${range})`;
  if (type === "CIERRE_SAT") return `StarMedical - Cierre SAT (${label} ${range})`;
  return `StarMedical - Reporte Kardex (${label} ${range})`;
}
