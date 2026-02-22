import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus, ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { imagingReportInputSchema } from "@/lib/diagnostics/schemas";
import { canEditReport, syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:RADIOLOGY");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = imagingReportInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;

    const { report, orderId } = await prisma.$transaction(async (tx) => {
      const study = await tx.imagingStudy.findUnique({
        where: { id: input.imagingStudyId },
        include: {
          orderItem: { select: { id: true, orderId: true, status: true, kind: true, catalogItem: { select: { kind: true } } } }
        }
      });
      if (!study) throw { status: 404, message: "Estudio no encontrado" };
      if (study.orderItem.kind !== DiagnosticItemKind.IMAGING || study.orderItem.catalogItem?.kind !== DiagnosticItemKind.IMAGING) {
        throw { status: 409, message: "El item no es de imagenología" };
      }
      if (study.orderItem.status === DiagnosticItemStatus.CANCELLED) throw { status: 409, message: "El item está cancelado" };

      if (input.id) {
        const existing = await tx.imagingReport.findUnique({ where: { id: input.id } });
        if (!existing) throw { status: 404, message: "Reporte no encontrado" };
        if (!canEditReport(existing.status)) throw { status: 409, message: "El reporte ya está firmado o liberado" };
        const updated = await tx.imagingReport.update({
          where: { id: input.id },
          data: {
            findings: input.findings || null,
            impression: input.impression || null
          }
        });
        await tx.diagnosticOrderItem.update({
          where: { id: study.orderItem.id },
          data: { status: DiagnosticItemStatus.PENDING_VALIDATION }
        });
        return { report: updated, orderId: study.orderItem.orderId };
      }

      const created = await tx.imagingReport.create({
        data: {
          imagingStudyId: input.imagingStudyId,
          findings: input.findings || null,
          impression: input.impression || null,
          status: ReportStatus.DRAFT,
          createdByUserId: auth.user?.id || null
        }
      });

      await tx.diagnosticOrderItem.update({
        where: { id: study.orderItem.id },
        data: { status: DiagnosticItemStatus.PENDING_VALIDATION }
      });

      return { report: created, orderId: study.orderItem.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "IMAGING_REPORT_SAVED",
      entityType: "ImagingReport",
      entityId: report.id,
      user: auth.user,
      req,
      after: { imagingStudyId: report.imagingStudyId, status: report.status }
    });

    return NextResponse.json({ data: report }, { status: input.id ? 200 : 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("imaging report error", err);
    return NextResponse.json({ error: "No se pudo guardar el reporte" }, { status: 500 });
  }
}
