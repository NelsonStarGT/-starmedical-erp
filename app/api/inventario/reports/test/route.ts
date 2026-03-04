import { NextRequest, NextResponse } from "next/server";
import { InventoryReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { sendMail } from "@/lib/email/mailer";
import { generateKardexXlsx } from "@/lib/inventory/reports";
import { generateMovementsPdf } from "@/lib/inventory/movementsReport";
import { generateCierreSatPdf } from "@/lib/inventory/cierreSat";
import { computeRangeForSetting, formatDate, parseRecipients, resolveScheduleType } from "@/lib/inventory/reportSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const requestedType = (body.reportType as InventoryReportType | undefined) || undefined;
    const scheduleId = body.scheduleId as string | undefined;

    const schedule = scheduleId
      ? await prisma.inventoryEmailSchedule.findFirst({
          where: inventoryWhere(scope, { id: scheduleId }, { branchScoped: true })
        })
      : null;

    const setting =
      schedule ||
      (await prisma.inventoryEmailSetting.findFirst({
        where: inventoryWhere(scope, { isEnabled: true, ...(requestedType ? { reportType: requestedType } : {}) }),
        orderBy: { createdAt: "asc" }
      })) ||
      (await prisma.inventoryEmailSetting.findFirst({
        where: inventoryWhere(scope, { isEnabled: true }),
        orderBy: { createdAt: "asc" }
      }));

    if (!setting) return NextResponse.json({ error: "No hay configuración creada" }, { status: 400 });

    const recipients = parseRecipients(setting);
    if (recipients.length === 0) return NextResponse.json({ error: "No hay destinatarios configurados" }, { status: 400 });

    const reportType = (requestedType || (setting.reportType as InventoryReportType) || "KARDEX") as InventoryReportType;
    const branchId = scope.branchId || body.branchId || (setting as any).branchId || null;
    if (scope.branchId && body.branchId && body.branchId !== scope.branchId) {
      return NextResponse.json({ error: "Branch fuera de alcance" }, { status: 403 });
    }

    const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
    const dateTo = body.dateTo ? new Date(body.dateTo) : null;
    const hasManualRange = dateFrom && dateTo && !Number.isNaN(dateFrom.getTime()) && !Number.isNaN(dateTo.getTime());
    const range = hasManualRange
      ? { dateFrom: dateFrom as Date, dateTo: dateTo as Date, label: "Personalizado" }
      : computeRangeForSetting(setting, new Date());

    const attachment = await buildAttachment(reportType, {
      tenantId: scope.tenantId,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branchId
    });

    const rangeLabel = `${formatDate(range.dateFrom)}-${formatDate(range.dateTo)}`;
    const scheduleType = resolveScheduleType(setting);
    const scheduleLabel = hasManualRange
      ? range.label
      : scheduleType === "MONTHLY"
        ? "Mensual"
        : scheduleType === "BIWEEKLY"
          ? "Quincenal"
          : "Única";
    const subject = buildSubject(reportType, scheduleLabel, rangeLabel);

    await sendMail({
      moduleKey: "INVENTARIO",
      to: recipients,
      subject,
      text: "Envio de prueba de reporte automático",
      attachments: [attachment]
    });

    return NextResponse.json({
      sent: true,
      recipients: recipients.length,
      range: { from: range.dateFrom, to: range.dateTo, label: range.label },
      reportType,
      branchId
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo enviar la prueba" }, { status: 500 });
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
