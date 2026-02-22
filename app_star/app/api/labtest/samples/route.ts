import { NextRequest } from "next/server";
import { LabTestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { registerSampleSchema } from "@/lib/labtest/schemas";
import { getLabTestSettings, labDateKey } from "@/lib/labtest/settings";
import { nextSequence } from "@/lib/labtest/sequences";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = registerSampleSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  const status: LabTestStatus = input.status || "COLLECTED";

  try {
    const settings = await getLabTestSettings();
    const dateKey = labDateKey(settings);
    const sample = await prisma.$transaction(async (tx) => {
      const branchId = auth.user?.branchId || undefined;
      const order = await tx.labTestOrder.findFirst({
        where: {
          id: input.orderId,
          ...(branchId ? { branchId } : {})
        },
        select: { id: true, branchId: true }
      });
      if (!order) throw new Error("Orden no encontrada");
      const specimenSeq = await nextSequence(tx, "specimen", dateKey, order.branchId);

      const saved = await tx.labSample.create({
        data: {
          orderId: input.orderId,
          barcode: input.barcode,
          type: input.type,
          status,
          area: input.area || null,
          fastingConfirmed: input.fastingConfirmed,
          specimenSeq,
          specimenSeqDateKey: dateKey,
          collectedAt: new Date(),
          createdById: auth.user?.id
        }
      });

      if (input.itemIds?.length) {
        await tx.labTestItem.updateMany({
          where: { id: { in: input.itemIds }, orderId: order.id },
          data: { sampleId: saved.id, status: "QUEUED" }
        });
      }

      await recalcLabOrderStatus(tx, order.id);

      return saved;
    });

    return jsonOk(sample, 201);
  } catch (err: any) {
    console.error(err);
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    return jsonError(err.message || "No se pudo registrar la muestra", 500);
  }
}
