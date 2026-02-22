import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { validateResultSchema } from "@/lib/labtest/schemas";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:VALIDATE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = validateResultSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");

  const { resultId } = parsed.data;

  try {
    const branchId = auth.user?.branchId || undefined;
    const existing = await prisma.labTestResult.findFirst({
      where: {
        id: resultId,
        ...(branchId ? { item: { order: { branchId } } } : {})
      },
      include: { item: { select: { id: true, orderId: true } } }
    });
    if (!existing) return jsonError("Resultado no encontrado", 404);

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.labTestResult.update({
        where: { id: resultId },
        data: { status: "TECH_VALIDATED", validatedAt: new Date(), validatedByUserId: auth.user?.id || null }
      });
      await tx.labTestItem.update({ where: { id: existing.itemId }, data: { status: "TECH_VALIDATED" } });
      await recalcLabOrderStatus(tx, existing.item.orderId);
      return res;
    });

    return jsonOk(updated);
  } catch (err: any) {
    console.error(err);
    return jsonError(err.message || "No se pudo validar", 500);
  }
}
