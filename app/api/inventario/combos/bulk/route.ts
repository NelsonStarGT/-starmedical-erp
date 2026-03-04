import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromAuthenticatedRequest } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

type Payload = {
  mode: "deactivate" | "delete";
  scope: "filtered" | "selected";
  ids?: string[];
  filters?: { search?: string; status?: string };
};

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_combo");
  if (perm) return perm;
  const { scope: inventoryScope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !inventoryScope) return errorResponse;
  const role = roleFromAuthenticatedRequest(req);
  const isAdmin = role === "Administrador";

  try {
    const body = (await req.json()) as Payload;
    const { mode, scope: targetScope, ids = [], filters } = body || {};
    if (!mode || !targetScope) return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });

    let targetIds: string[] = ids;
    if (targetScope === "filtered") {
      const combos = await prisma.combo.findMany({
        where: inventoryWhere(inventoryScope, {
          status: filters?.status || undefined,
          name: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined
        }),
        select: { id: true }
      });
      targetIds = combos.map((c) => c.id);
    }
    if (targetIds.length === 0) return NextResponse.json({ processed: 0, skipped: [] });

    const skipped: { id: string; reason: string }[] = [];
    let processed = 0;
    let deactivated = 0;
    let deleted = 0;

    for (const id of targetIds) {
      if (mode === "deactivate") {
        await prisma.combo.updateMany({
          where: inventoryWhere(inventoryScope, { id }),
          data: { status: "Inactivo" }
        });
        processed += 1;
        deactivated += 1;
        continue;
      }
      if (mode === "delete") {
        if (!isAdmin) {
          skipped.push({ id, reason: "Solo Admin puede eliminar" });
          continue;
        }
        const priceListUsage = await prisma.priceListItem.count({
          where: inventoryWhere(inventoryScope, { itemType: "COMBO", itemId: id })
        });
        if (priceListUsage > 0) {
          skipped.push({ id, reason: "Tiene precios asociados" });
          continue;
        }
        await prisma.combo.updateMany({
          where: inventoryWhere(inventoryScope, { id }),
          data: { deletedAt: new Date(), status: "Inactivo" }
        });
        processed += 1;
        deleted += 1;
      }
    }

    return NextResponse.json({ processed, deactivated, deleted, skipped });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo procesar la acción masiva" }, { status: 500 });
  }
}
