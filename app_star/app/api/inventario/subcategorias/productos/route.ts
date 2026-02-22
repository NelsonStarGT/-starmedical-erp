import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
  const items = await prisma.productSubcategory.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { order: "asc" }
  });
  return NextResponse.json({ data: items });
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_config");
  if (perm) return perm;
  try {
    const body = await req.json();
    const { categoryId, name, slug, order = 0, status = "Activo" } = body || {};
    if (!categoryId || !name || !slug) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    const created = await prisma.productSubcategory.create({
      data: { categoryId, name, slug, order, status }
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug ya existe" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear la subcategoría" }, { status: 500 });
  }
}
