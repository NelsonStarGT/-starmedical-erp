import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { imagingStudyInputSchema } from "@/lib/diagnostics/schemas";
import { syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = imagingStudyInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
    if (Number.isNaN(receivedAt.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    const { study, orderId } = await prisma.$transaction(async (tx) => {
      const item = await tx.diagnosticOrderItem.findUnique({
        where: { id: input.orderItemId },
        include: { catalogItem: { select: { kind: true } } }
      });
      if (!item) throw { status: 404, message: "Item no encontrado" };
      if (item.kind !== DiagnosticItemKind.IMAGING || item.catalogItem.kind !== DiagnosticItemKind.IMAGING) {
        throw { status: 409, message: "El item no es de imagenología" };
      }
      if (item.status === DiagnosticItemStatus.CANCELLED) {
        throw { status: 409, message: "El item está cancelado" };
      }

      const saved = await tx.imagingStudy.upsert({
        where: { orderItemId: input.orderItemId },
        update: {
          orthancStudyId: input.orthancStudyId,
          modality: input.modality,
          studyInstanceUID: input.studyInstanceUID || null,
          receivedAt
        },
        create: {
          orderItemId: input.orderItemId,
          orthancStudyId: input.orthancStudyId,
          modality: input.modality,
          studyInstanceUID: input.studyInstanceUID || null,
          receivedAt
        }
      });

      await tx.diagnosticOrderItem.update({
        where: { id: input.orderItemId },
        data: { status: DiagnosticItemStatus.IN_ANALYSIS }
      });

      return { study: saved, orderId: item.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "IMAGING_STUDY_LINKED",
      entityType: "ImagingStudy",
      entityId: study.id,
      user: auth.user,
      req,
      after: { orderItemId: study.orderItemId, orthancStudyId: study.orthancStudyId }
    });

    return NextResponse.json({ data: study }, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("imaging study error", err);
    return NextResponse.json({ error: "No se pudo vincular el estudio" }, { status: 500 });
  }
}
