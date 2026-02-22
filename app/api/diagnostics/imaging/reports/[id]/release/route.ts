import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus, ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";
import { syncDiagnosticOrderCompletion } from "@/lib/server/diagnosticsCompletion.service";

type Params = { params: { id: string } };

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireDiagnosticsPermission(req, "DIAG:RELEASE");
  if (auth.errorResponse) return auth.errorResponse;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  try {
    const { report, orderId } = await prisma.$transaction(async (tx) => {
      const existing = await tx.imagingReport.findUnique({
        where: { id },
        include: {
          imagingStudy: {
            include: {
              orderItem: { select: { id: true, orderId: true, status: true, kind: true, catalogItem: { select: { kind: true } } } }
            }
          }
        }
      });
      if (!existing) throw { status: 404, message: "Reporte no encontrado" };
      const item = existing.imagingStudy.orderItem;
      if (item.kind !== DiagnosticItemKind.IMAGING || item.catalogItem?.kind !== DiagnosticItemKind.IMAGING) {
        throw { status: 409, message: "El item no es de imagenología" };
      }
      if (existing.status !== ReportStatus.SIGNED) throw { status: 409, message: "Debe estar firmado antes de liberar" };
      if (existing.releasedAt) throw { status: 409, message: "El reporte ya fue liberado" };

      const updated = await tx.imagingReport.update({
        where: { id },
        data: { status: ReportStatus.RELEASED, releasedAt: new Date() }
      });

      await tx.diagnosticOrderItem.update({
        where: { id: item.id },
        data: { status: DiagnosticItemStatus.RELEASED }
      });

      return { report: updated, orderId: item.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);
    await syncDiagnosticOrderCompletion(orderId, auth.user, req);

    await auditLog({
      action: "IMAGING_REPORT_RELEASED",
      entityType: "ImagingReport",
      entityId: report.id,
      user: auth.user,
      req,
      after: { imagingStudyId: report.imagingStudyId, status: report.status }
    });

    return NextResponse.json({ data: report }, { status: 200 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("release report error", err);
    return NextResponse.json({ error: "No se pudo liberar el reporte" }, { status: 500 });
  }
}
