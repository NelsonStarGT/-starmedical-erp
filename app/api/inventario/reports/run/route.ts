import { NextRequest, NextResponse } from "next/server";
import { InventoryReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { resolveInventoryScope } from "@/lib/inventory/scope";
import { generateKardexXlsx } from "@/lib/inventory/reports";
import { generateMovementsPdf } from "@/lib/inventory/movementsReport";
import { sendMail } from "@/lib/email/mailer";
import { generateCierreSatPdf } from "@/lib/inventory/cierreSat";
import { evaluateSchedule, formatDate, parseRecipients, resolveScheduleType } from "@/lib/inventory/reportSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cronToken = req.headers.get("x-cron-token");
  const expectedToken = process.env.INVENTORY_REPORT_CRON_TOKEN;
  let tenantId: string | null = null;
  let branchScope: string | null = null;

  if (!expectedToken || cronToken !== expectedToken) {
    const auth = requireRoles(req, ["Administrador"]);
    if (auth.errorResponse) return auth.errorResponse;
    const { scope, errorResponse } = resolveInventoryScope(req);
    if (errorResponse || !scope) return errorResponse;
    tenantId = scope.tenantId;
    branchScope = scope.branchId;
  } else {
    tenantId = (process.env.DEFAULT_TENANT_ID || "").trim() || null;
    if (!tenantId) {
      return NextResponse.json(
        { error: "DEFAULT_TENANT_ID es requerido para ejecución cron de inventario" },
        { status: 500 }
      );
    }
  }

  if (!tenantId) {
    return NextResponse.json({ error: "No se pudo resolver tenant para scheduler de inventario" }, { status: 500 });
  }

  const summary = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{ id: string; error: string }>
  };

  try {
    const schedules = await prisma.inventoryEmailSchedule.findMany({
      where: { tenantId, deletedAt: null, isEnabled: true, ...(branchScope ? { branchId: branchScope } : {}) }
    });
    const now = new Date();

    for (const setting of schedules) {
      summary.processed += 1;

      const schedule = evaluateSchedule(setting, now);
      const scheduleType = resolveScheduleType(setting);
      if (!schedule.shouldSend) {
        summary.skipped += 1;
        continue;
      }

      const reportType = (setting.reportType as InventoryReportType) || "KARDEX";
      try {
        const recipients = parseRecipients(setting);
        if (recipients.length === 0) throw new Error("Sin destinatarios");

        const attachment = await buildAttachment(reportType, {
          tenantId,
          dateFrom: schedule.range.dateFrom,
          dateTo: schedule.range.dateTo,
          branchId: setting.branchId || undefined
        });

        const rangeLabel = `${formatDate(schedule.range.dateFrom)}-${formatDate(schedule.range.dateTo)}`;
        const subject = buildSubject(reportType, schedule.range.label, rangeLabel);

        await sendMail({
          moduleKey: "INVENTARIO",
          to: recipients,
          subject,
          text: "Reporte automático de inventario",
          attachments: [attachment]
        });

        await prisma.inventoryEmailScheduleLog.create({
          data: {
            tenantId,
            scheduleId: setting.id,
            periodFrom: schedule.range.dateFrom,
            periodTo: schedule.range.dateTo,
            reportType,
            status: "SENT"
          }
        });
        await prisma.inventoryEmailSchedule.update({
          where: { id: setting.id },
          data: { lastSentAt: new Date() }
        });
        summary.sent += 1;
      } catch (err: any) {
        summary.failed += 1;
        summary.errors.push({ id: setting.id, error: err?.message || "Error al enviar" });
        await prisma.inventoryEmailScheduleLog.create({
          data: {
            tenantId,
            scheduleId: setting.id,
            periodFrom: schedule.range.dateFrom,
            periodTo: schedule.range.dateTo,
            reportType,
            status: "FAILED",
            error: err?.message || "Error al enviar"
          }
        });
      }
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo ejecutar el scheduler" }, { status: 500 });
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
