import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromAuthenticatedRequest } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { hasPermission } from "@/lib/types/inventario";

export async function POST(req: NextRequest) {
  try {
    const role = roleFromAuthenticatedRequest(req);
    const perm = requirePermission(req, "registrar_movimiento");
    if (perm) return perm;
    const { scope: inventoryScope, errorResponse } = resolveInventoryScope(req);
    if (errorResponse || !inventoryScope) return errorResponse;
    if (!hasPermission(role as any, "registrar_movimiento")) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { mode, scope: targetScope, ids = [], filters } = body as {
      mode: "deactivate" | "delete";
      scope: "selected" | "filtered";
      ids?: string[];
      filters?: { categoryId?: string[]; subcategoryId?: string[]; status?: string[] };
    };
    if (!mode || !targetScope) return NextResponse.json({ error: "mode y scope requeridos" }, { status: 400 });
    if (targetScope === "selected" && ids.length === 0) return NextResponse.json({ error: "ids requeridos" }, { status: 400 });

    const where: any = {};
    if (targetScope === "selected") where.id = { in: ids };
    if (targetScope === "filtered" && filters) {
      if (filters.categoryId?.length) where.categoryId = { in: filters.categoryId };
      if (filters.subcategoryId?.length) where.subcategoryId = { in: filters.subcategoryId };
      if (filters.status?.length) where.status = { in: filters.status };
    }

    const targets = await prisma.service.findMany({ where: inventoryWhere(inventoryScope, where) });
    const skipped: Array<{ id: string; reason: string }> = [];
    let deactivated = 0;
    let deleted = 0;

    for (const s of targets) {
      if (mode === "deactivate") {
        await prisma.service.updateMany({
          where: inventoryWhere(inventoryScope, { id: s.id }),
          data: { status: "Inactivo" }
        });
        deactivated += 1;
        continue;
      }
      // Hard delete: sin referencias implementadas -> evitar eliminar
      await prisma.service.updateMany({
        where: inventoryWhere(inventoryScope, { id: s.id }),
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
