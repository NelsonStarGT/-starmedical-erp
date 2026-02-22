import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { captureResultSchema } from "@/lib/labtest/schemas";
import { listResultsBandeja } from "@/lib/server/labtest.service";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await listResultsBandeja();
    return jsonOk(data);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = captureResultSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const branchId = auth.user?.branchId || undefined;
    const item = await prisma.labTestItem.findFirst({
      where: {
        id: input.itemId,
        ...(branchId ? { order: { branchId } } : {})
      },
      select: { id: true, orderId: true, sampleId: true }
    });
    if (!item) return jsonError("Item no encontrado", 404);

    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.labTestResult.create({
        data: {
          itemId: input.itemId,
          sampleId: input.sampleId || item.sampleId || null,
          status: "RESULT_CAPTURED",
          valueText: input.valueText || null,
          valueNumber: input.valueNumber !== undefined ? input.valueNumber : null,
          unit: input.unit || null,
          refLow: input.refLow !== undefined ? input.refLow : null,
          refHigh: input.refHigh !== undefined ? input.refHigh : null,
          resultAt: input.resultAt || new Date(),
          enteredByUserId: auth.user?.id || null
        }
      });

      await tx.labTestItem.update({
        where: { id: input.itemId },
        data: { status: "RESULT_CAPTURED" }
      });

      await recalcLabOrderStatus(tx, item.orderId);

      return saved;
    });

    return jsonOk(result, 201);
  } catch (err: any) {
    console.error(err);
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError(err.message || "No se pudo capturar el resultado", 500);
  }
}
