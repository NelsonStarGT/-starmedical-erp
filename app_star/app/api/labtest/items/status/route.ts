import { NextRequest } from "next/server";
import { LabTestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { canTransition } from "@/lib/labtest/status";
import { recalcLabOrderStatus } from "@/lib/labtest/recalc";

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:WORK");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const itemId = body?.itemId as string | undefined;
  const status = body?.status as LabTestStatus | undefined;

  if (!itemId || !status) return jsonError("Payload inválido", 400, "INVALID_BODY");

  try {
    const branchId = auth.user?.branchId || undefined;
    const item = await prisma.labTestItem.findFirst({
      where: {
        id: itemId,
        ...(branchId ? { order: { branchId } } : {})
      },
      include: { order: true }
    });
    if (!item) return jsonError("Item no encontrado", 404);

    const upperRoles = (auth.user?.roles || []).map((r) => r.toUpperCase());
    const isGlobalAdmin = upperRoles.includes("SUPER_ADMIN") || upperRoles.includes("ADMIN");
    const role = (auth.role || (isGlobalAdmin ? "ADMIN" : null)) as any;
    if (!canTransition(item.status, status, role)) return jsonError("Transición no permitida", 409, "INVALID_TRANSITION");
    if (status === "IN_PROCESS" && !item.sampleId) return jsonError("Se requiere muestra para pasar a IN_PROCESS", 409, "MISSING_SAMPLE");

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.labTestItem.update({
        where: { id: itemId },
        data: { status, updatedAt: new Date() }
      });

      if (status === "IN_PROCESS" && item.order?.status === "QUEUED") {
        await tx.labTestOrder.update({ where: { id: item.orderId }, data: { status: "IN_PROCESS" } });
      }

      await recalcLabOrderStatus(tx, item.orderId);
      return saved;
    });

    return jsonOk(updated);
  } catch (err: any) {
    return jsonError(err.message || "No se pudo actualizar el estado", 500);
  }
}
