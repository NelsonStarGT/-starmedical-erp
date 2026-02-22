import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { labSpecimenSchema } from "@/lib/diagnostics/schemas";
import { syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = labSpecimenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;
    const collectedAt = input.collectedAt ? new Date(input.collectedAt) : new Date();
    if (Number.isNaN(collectedAt.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });

    const { specimen, orderId } = await prisma.$transaction(async (tx) => {
      const item = await tx.diagnosticOrderItem.findUnique({
        where: { id: input.orderItemId },
        include: { specimen: true, catalogItem: { select: { kind: true } } }
      });
      if (!item) throw { status: 404, message: "Item no encontrado" };
      if (item.kind !== DiagnosticItemKind.LAB || item.catalogItem.kind !== DiagnosticItemKind.LAB) {
        throw { status: 409, message: "El item no es de laboratorio" };
      }
      if (item.specimen) throw { status: 409, message: "La muestra ya fue registrada" };
      if (item.status !== DiagnosticItemStatus.ORDERED) {
        throw { status: 409, message: "El item no está pendiente de muestra" };
      }

      const created = await tx.labSpecimen.create({
        data: {
          orderItemId: input.orderItemId,
          specimenCode: input.specimenCode,
          collectedAt,
          collectedByUserId: auth.user?.id || null
        }
      });

      await tx.diagnosticOrderItem.update({
        where: { id: input.orderItemId },
        data: { status: DiagnosticItemStatus.COLLECTED }
      });

      return { specimen: created, orderId: item.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "LAB_SPECIMEN_CREATED",
      entityType: "DiagnosticOrderItem",
      entityId: input.orderItemId,
      user: auth.user,
      req,
      after: { specimenCode: specimen.specimenCode, collectedAt: specimen.collectedAt }
    });

    return NextResponse.json({ data: { ...specimen, orderId } }, { status: 201 });
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "El código de muestra ya existe" }, { status: 409 });
    }
    console.error("lab specimen error", err);
    return NextResponse.json({ error: "No se pudo registrar la muestra" }, { status: 500 });
  }
}
