import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromAuthenticatedRequest } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  const role = roleFromAuthenticatedRequest(req);
  const isAdmin = role === "Administrador";
  try {
    const body = await req.json();
    const { name, slug, order, status, categoryId } = body || {};
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (order !== undefined) data.order = order;
    if (status !== undefined) data.status = status;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (!isAdmin && data.status === "Inactivo") return NextResponse.json({ error: "Solo Administrador puede desactivar" }, { status: 403 });
    const current = await prisma.productSubcategory.findFirst({ where: inventoryWhere(scope, { id: params.id }) });
    if (!current) return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });
    const updated = await prisma.productSubcategory.update({ where: { id: current.id }, data });
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug ya existe" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "No se pudo actualizar la subcategoría" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  const role = roleFromAuthenticatedRequest(req);
  const isAdmin = role === "Administrador";
  if (!isAdmin) return NextResponse.json({ error: "Solo Administrador puede eliminar" }, { status: 403 });

  try {
    const sub = await prisma.productSubcategory.findFirst({
      where: inventoryWhere(scope, { id: params.id }),
      include: { _count: { select: { products: true } } }
    });
    if (!sub) return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });
    if (sub._count.products > 0) return NextResponse.json({ error: "No se puede eliminar: tiene productos asociados" }, { status: 400 });
    await prisma.productSubcategory.update({ where: { id: sub.id }, data: { deletedAt: new Date(), status: "Inactivo" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo eliminar la subcategoría" }, { status: 500 });
  }
}
