import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleFromRequest } from "@/lib/api/auth";
import { hasPermission } from "@/lib/types/inventario";

export async function POST(req: NextRequest) {
  try {
    const role = roleFromRequest(req);
    if (!role) return NextResponse.json({ error: "Rol no proporcionado" }, { status: 401 });
    if (!hasPermission(role as any, "registrar_movimiento")) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await req.json();
    const { mode, scope, ids = [], filters } = body as {
      mode: "deactivate" | "delete";
      scope: "selected" | "filtered";
      ids?: string[];
      filters?: { categoryId?: string[]; subcategoryId?: string[]; status?: string[] };
    };
    if (!mode || !scope) return NextResponse.json({ error: "mode y scope requeridos" }, { status: 400 });
    if (scope === "selected" && ids.length === 0) return NextResponse.json({ error: "ids requeridos" }, { status: 400 });

    const where: any = {};
    if (scope === "selected") where.id = { in: ids };
    if (scope === "filtered" && filters) {
      if (filters.categoryId?.length) where.categoryId = { in: filters.categoryId };
      if (filters.subcategoryId?.length) where.subcategoryId = { in: filters.subcategoryId };
      if (filters.status?.length) where.status = { in: filters.status };
    }

    const targets = await prisma.service.findMany({ where });
    const skipped: Array<{ id: string; reason: string }> = [];
    let deactivated = 0;
    let deleted = 0;

    for (const s of targets) {
      if (mode === "deactivate") {
        await prisma.service.update({ where: { id: s.id }, data: { status: "Inactivo" } });
        deactivated += 1;
        continue;
      }
      // Hard delete: sin referencias implementadas -> evitar eliminar
      skipped.push({ id: s.id, reason: "Eliminación dura no permitida; desactivar en su lugar" });
    }

    return NextResponse.json({ processed: targets.length, deactivated, deleted, skipped });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo procesar la acción masiva" }, { status: 500 });
  }
}
