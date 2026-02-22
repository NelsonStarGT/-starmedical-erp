import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromRequest } from "@/lib/api/auth";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.serviceCategory.findMany({
    include: { _count: { select: { subcategories: true, services: true } } },
    orderBy: { order: "asc" }
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  const role = roleFromRequest(req);
  const isAdmin = role === "Administrador";
  if (!isAdmin) return NextResponse.json({ error: "Solo Administrador puede crear categorías" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, slug, area, order = 0, status = "Activo" } = body || {};
    if (!name || !slug || !area) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    const created = await prisma.serviceCategory.create({
      data: { name, slug, area, order, status }
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug ya existe" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear la categoría" }, { status: 500 });
  }
}
