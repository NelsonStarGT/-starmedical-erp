import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireRoles, roleFromAuthenticatedRequest } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  const items = await prisma.serviceCategory.findMany({
    where: inventoryWhere(scope, {}),
    include: { _count: { select: { subcategories: true, services: true } } },
    orderBy: { order: "asc" }
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  const role = roleFromAuthenticatedRequest(req);
  const isAdmin = role === "Administrador";
  if (!isAdmin) return NextResponse.json({ error: "Solo Administrador puede crear categorías" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug, area, order = 0, status = "Activo" } = body || {};
    if (!name || !slug || !area) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    const created = await prisma.serviceCategory.create({
      data: inventoryCreateData(scope, { name, slug, area, order, status })
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug ya existe" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}
