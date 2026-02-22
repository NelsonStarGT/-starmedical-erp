import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { sendResultSchema } from "@/lib/labtest/schemas";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WORK");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = sendResultSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const branchId = auth.user?.branchId || undefined;
    if (branchId) {
      const order = await prisma.labTestOrder.findFirst({
        where: { id: input.orderId, branchId },
        select: { id: true }
      });
      if (!order) return jsonError("Orden no encontrada", 404);
    }
    const log = await prisma.labMessageLog.create({
      data: {
        orderId: input.orderId,
        channel: input.channel,
        recipient: input.recipient,
        status: "SENT",
        purpose: "CONTACT",
        payloadJson: input.payloadJson || {},
        createdById: auth.user?.id || null
      }
    });
    return jsonOk(log, 201);
  } catch (err: any) {
    return jsonError(err.message || "No se pudo registrar el contacto", 500);
  }
}
