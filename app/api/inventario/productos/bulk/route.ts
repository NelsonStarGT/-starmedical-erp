import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export async function POST(req: NextRequest) {
  try {
    const perm = requirePermission(req, "registrar_movimiento"); // base check; delete additionally is admin-only via role
    if (perm) return perm;
    const { scope: inventoryScope, errorResponse } = resolveInventoryScope(req);
    if (errorResponse || !inventoryScope) return errorResponse;

    const body = await req.json();
    const { mode, scope: targetScope, ids = [], filters } = body as {
      mode: "deactivate" | "delete";
      scope: "selected" | "filtered";
      ids?: string[];
      filters?: { categoryId?: string[]; subcategoryId?: string[]; areaId?: string[]; providerId?: string[]; status?: string[] };
    };

    if (!mode || !targetScope) return NextResponse.json({ error: "mode y scope requeridos" }, { status: 400 });

    if (targetScope === "selected" && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: "ids requeridos para scope selected" }, { status: 400 });
    }

    const where: any = {};
    if (targetScope === "selected") where.id = { in: ids };
    if (targetScope === "filtered" && filters) {
      if (filters.categoryId?.length) where.categoryId = { in: filters.categoryId };
      if (filters.subcategoryId?.length) where.subcategoryId = { in: filters.subcategoryId };
      if (filters.areaId?.length) where.inventoryAreaId = { in: filters.areaId };
      if (filters.providerId?.length) where.proveedorId = { in: filters.providerId };
      if (filters.status?.length) where.status = { in: filters.status };
    }

    const targets = await prisma.product.findMany({ where: inventoryWhere(inventoryScope, where) });
    if (targets.length === 0) return NextResponse.json({ processed: 0, deactivated: 0, deleted: 0, skipped: [] });

    const skipped: Array<{ id: string; reason: string }> = [];
    let deactivated = 0;
    let deleted = 0;

    for (const p of targets) {
      if (mode === "deactivate") {
        await prisma.product.updateMany({
          where: inventoryWhere(inventoryScope, { id: p.id }),
          data: { status: "Inactivo" }
        });
        deactivated += 1;
        continue;
      }

      // delete
      // Validaciones: no borrar si hay movimientos o stock
      const movCount = await prisma.inventoryMovement.count({ where: inventoryWhere(inventoryScope, { productId: p.id }) });
      const stockCount = await prisma.productStock.count({ where: inventoryWhere(inventoryScope, { productId: p.id }) });
      if (movCount > 0 || stockCount > 0) {
        skipped.push({ id: p.id, reason: "Tiene historial o stock; usar desactivar" });
        continue;
      }
      await prisma.product.updateMany({
        where: inventoryWhere(inventoryScope, { id: p.id }),
        data: { deletedAt: new Date(), status: "Inactivo" }
      });
      deleted += 1;
    }

    return NextResponse.json({ processed: targets.length, deactivated, deleted, skipped });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo procesar la acción masiva" }, { status: 500 });
  }
}
