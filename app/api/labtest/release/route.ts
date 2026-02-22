import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { releaseResultSchema } from "@/lib/labtest/schemas";
import { getLabTestSettings, labDateKey } from "@/lib/labtest/settings";
import { nextSequence } from "@/lib/labtest/sequences";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";
import { syncDiagnosticOrderCompletion } from "@/lib/server/diagnosticsCompletion.service";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WORK");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = releaseResultSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");

  const { resultId } = parsed.data;
  try {
    const settings = await getLabTestSettings();
    const dateKey = labDateKey(settings);
    const branchId = auth.user?.branchId || undefined;
    const existing = await prisma.labTestResult.findFirst({
      where: {
        id: resultId,
        ...(branchId ? { item: { order: { branchId } } } : {})
      },
      include: { item: { include: { order: true } } }
    });
    if (!existing) return jsonError("Resultado no encontrado", 404);

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.labTestResult.update({
        where: { id: resultId },
        data: { status: "RELEASED", releasedAt: new Date() }
      });
      await tx.labTestItem.update({ where: { id: existing.itemId }, data: { status: "RELEASED" } });

      const pending = await tx.labTestItem.count({
        where: { orderId: existing.item.orderId, status: { notIn: ["RELEASED", "SENT", "CANCELLED"] } }
      });

      if (pending === 0) {
        let reportSeq = existing.item.order.reportSeq;
        if (!reportSeq) {
          reportSeq = await nextSequence(tx, "report", dateKey, existing.item.order.branchId);
        }
        await tx.labTestOrder.update({
          where: { id: existing.item.orderId },
          data: { status: "RELEASED", reportSeq, reportSeqDateKey: existing.item.order.reportSeqDateKey || dateKey }
        });
      }

      await recalcLabOrderStatus(tx, existing.item.orderId);
      return res;
    });

    if (existing.item.order.sourceDiagnosticOrderId) {
      await syncDiagnosticOrderCompletion(existing.item.order.sourceDiagnosticOrderId, auth.user, req);
    }

    return jsonOk(updated);
  } catch (err: any) {
    console.error(err);
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError(err.message || "No se pudo liberar", 500);
  }
}
