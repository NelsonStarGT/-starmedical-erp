import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromRequest } from "@/lib/api/auth";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const cat = await prisma.serviceCategory.findUnique({
    where: { id: params.id },
    include: { subcategories: true, _count: { select: { services: true, subcategories: true } } }
  });
  if (!cat) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  return NextResponse.json({ data: cat });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const role = roleFromRequest(req);
  const isAdmin = role === "Administrador";

  try {
    const body = await req.json();
    const { name, slug, area, order, status } = body || {};
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (area !== undefined) data.area = area;
    if (order !== undefined) data.order = order;
    if (status !== undefined) data.status = status;
    if (!isAdmin && data.status === "Inactivo") return NextResponse.json({ error: "Solo Administrador puede desactivar" }, { status: 403 });
    const updated = await prisma.serviceCategory.update({ where: { id: params.id }, data });
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug ya existe" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "No se pudo actualizar la categoría" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const role = roleFromRequest(req);
  const isAdmin = role === "Administrador";
  if (!isAdmin) return NextResponse.json({ error: "Solo Administrador puede eliminar" }, { status: 403 });

  try {
    const cat = await prisma.serviceCategory.findUnique({
      where: { id: params.id },
      include: { _count: { select: { services: true, subcategories: true } }, subcategories: { where: { status: "Activo" } } }
    });
    if (!cat) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    if (cat._count.services > 0) return NextResponse.json({ error: "No se puede eliminar: tiene servicios asociados" }, { status: 400 });
    if ((cat.subcategories || []).length > 0) return NextResponse.json({ error: "No se puede eliminar: tiene subcategorías activas" }, { status: 400 });
    await prisma.serviceCategory.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 500 });
  }
}
