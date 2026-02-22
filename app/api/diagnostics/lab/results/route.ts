import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, DiagnosticItemStatus, LabResultFlag, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";
import { labResultInputSchema } from "@/lib/diagnostics/schemas";
import { computeResultFlag, syncDiagnosticOrderStatus } from "@/lib/diagnostics/service";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = labResultInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Payload inválido" }, { status: 400 });
    }
    const input = parsed.data;
    const resultAt = input.resultAt ? new Date(input.resultAt) : new Date();
    if (Number.isNaN(resultAt.getTime())) return NextResponse.json({ error: "Fecha de resultado inválida" }, { status: 400 });

    const { result, orderId } = await prisma.$transaction(async (tx) => {
      const item = await tx.diagnosticOrderItem.findUnique({
        where: { id: input.orderItemId },
        include: { catalogItem: { select: { kind: true } } }
      });
      if (!item) throw { status: 404, message: "Item no encontrado" };
      if (item.kind !== DiagnosticItemKind.LAB || item.catalogItem.kind !== DiagnosticItemKind.LAB) {
        throw { status: 409, message: "El item no es de laboratorio" };
      }
      if (item.status === DiagnosticItemStatus.CANCELLED || item.status === DiagnosticItemStatus.RELEASED) {
        throw { status: 409, message: "El item no permite capturar resultados" };
      }

      const refLow = input.refLow ?? undefined;
      const refHigh = input.refHigh ?? undefined;
      const valueNumber = input.valueNumber ?? null;
      const flag = input.flag || computeResultFlag(valueNumber, refLow ?? null, refHigh ?? null) || null;

      const data = {
        orderItemId: input.orderItemId,
        testCode: input.testCode || null,
        valueText: input.valueText || null,
        valueNumber: valueNumber !== null ? new Prisma.Decimal(valueNumber) : null,
        unit: input.unit || null,
        refLow: refLow !== undefined ? new Prisma.Decimal(refLow) : null,
        refHigh: refHigh !== undefined ? new Prisma.Decimal(refHigh) : null,
        flag,
        resultAt,
        enteredByUserId: auth.user?.id || null
      };

      const existing = await tx.labResult.findFirst({
        where: {
          orderItemId: input.orderItemId,
          ...(input.testCode ? { testCode: input.testCode } : {})
        }
      });

      if (existing?.validatedAt || existing?.releasedAt) {
        throw { status: 409, message: "El resultado ya fue validado/liberado" };
      }

      const saved = existing
        ? await tx.labResult.update({ where: { id: existing.id }, data })
        : await tx.labResult.create({ data });

      await tx.diagnosticOrderItem.update({
        where: { id: input.orderItemId },
        data: { status: DiagnosticItemStatus.PENDING_VALIDATION }
      });

      return { result: saved, orderId: item.orderId };
    });

    await syncDiagnosticOrderStatus(orderId);

    await auditLog({
      action: "LAB_RESULT_CAPTURED",
      entityType: "LabResult",
      entityId: result.id,
      user: auth.user,
      req,
      after: { orderItemId: result.orderItemId, flag: result.flag }
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
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("lab result error", err);
    return NextResponse.json({ error: "No se pudo registrar el resultado" }, { status: 500 });
  }
}
