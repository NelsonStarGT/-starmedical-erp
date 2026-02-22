import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { sendResultSchema } from "@/lib/labtest/schemas";
import { getLabTestSettings, labDateKey } from "@/lib/labtest/settings";
import { nextSequence } from "@/lib/labtest/sequences";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WORK");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = sendResultSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const settings = await getLabTestSettings();
    const dateKey = labDateKey(settings);
    const message = await prisma.$transaction(async (tx) => {
      const branchId = auth.user?.branchId || undefined;
      const order = await tx.labTestOrder.findFirst({
        where: {
          id: input.orderId,
          ...(branchId ? { branchId } : {})
        },
        include: { items: { include: { results: true } } }
      });
      if (!order) throw new Error("Orden no encontrada");

      if (order.sentAt) {
        const err: any = new Error("La orden ya fue enviada");
        err.status = 409;
        err.code = "ALREADY_SENT";
        throw err;
      }

      const allReleased = order.items.every((i) => ["RELEASED", "CANCELLED"].includes(i.status));
      const allHaveResult = order.items.every((i) => i.results && i.results.length > 0);
      const ready = order.status === "RELEASED" && allReleased && allHaveResult;
      if (!ready) {
        const err: any = new Error("Orden no está lista para enviar");
        err.status = 409;
        err.code = "NOT_READY_TO_SEND";
        throw err;
      }

      let reportSeq = order.reportSeq;
      if (!reportSeq) {
        reportSeq = await nextSequence(tx, "report", dateKey, order.branchId);
      }

      const updateResult = await tx.labTestOrder.updateMany({
        where: {
          id: input.orderId,
          sentAt: null,
          ...(branchId ? { branchId } : {})
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentById: auth.user?.id || null,
          sentChannel: input.channel,
          sentRecipient: input.recipient,
          reportSeq,
          reportSeqDateKey: order.reportSeqDateKey || dateKey
        }
      });

      if (updateResult.count === 0) {
        const err: any = new Error("La orden ya fue enviada");
        err.status = 409;
        err.code = "ALREADY_SENT";
        throw err;
      }

      const log = await tx.labMessageLog.create({
        data: {
          orderId: input.orderId,
          channel: input.channel,
          recipient: input.recipient,
          status: "SENT",
          purpose: "RESULT",
          payloadJson: input.payloadJson || {},
          createdById: auth.user?.id || null
        }
      });

      await recalcLabOrderStatus(tx, input.orderId);
      return log;
    });

    return jsonOk(message, 201);
  } catch (err: any) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    if (err.status === 409) return jsonError(err.message, 409, err.code);
    return jsonError(err.message || "No se pudo registrar el envío", 500);
  }
}
