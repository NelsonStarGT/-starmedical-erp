import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

type Params = { params: { id: string } };

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireDiagnosticsPermission(req, "DIAG:VALIDATE");
  if (auth.errorResponse) return auth.errorResponse;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  try {
    const { result, orderId } = await prisma.$transaction(async (tx) => {
      const existing = await tx.labResult.findUnique({
        where: { id },
        include: {
          orderItem: {
            select: { id: true, status: true, kind: true, orderId: true, catalogItem: { select: { kind: true } } }
          }
        }
      });
      if (!existing) throw { status: 404, message: "Resultado no encontrado" };
      const item = existing.orderItem;
      if (item.kind !== DiagnosticItemKind.LAB || item.catalogItem?.kind !== DiagnosticItemKind.LAB) {
        throw { status: 409, message: "El item no es de laboratorio" };
      }
      if (existing.validatedAt) throw { status: 409, message: "El resultado ya está validado" };
      if (item.status === DiagnosticItemStatus.RELEASED) throw { status: 409, message: "El item ya fue liberado" };

      const updated = await tx.labResult.update({
        where: { id },
        data: { validatedByUserId: auth.user?.id || null, validatedAt: new Date() }
      });

      await tx.diagnosticOrderItem.update({
        where: { id: item.id },
        data: { status: DiagnosticItemStatus.VALIDATED }
      });

      return { result: updated, orderId: item.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "LAB_RESULT_VALIDATED",
      entityType: "LabResult",
      entityId: result.id,
      user: auth.user,
      req,
      after: { orderItemId: result.orderItemId }
    });

    return NextResponse.json(
      {
        data: {
          ...result,
          valueNumber: result.valueNumber ? Number(result.valueNumber) : null,
          refLow: result.refLow ? Number(result.refLow) : null,
          refHigh: result.refHigh ? Number(result.refHigh) : null
        }
      },
      { status: 200 }
    );
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("validate result error", err);
    return NextResponse.json({ error: "No se pudo validar el resultado" }, { status: 500 });
  }
}
