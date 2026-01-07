import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";

export const dynamic = "force-dynamic";

function normalize(body: any, requireAll = true) {
  const categoryId = body.categoryId !== undefined ? String(body.categoryId || "").trim() : undefined;
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const slug = body.slug !== undefined ? String(body.slug || "").trim() : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;
  const order = body.order !== undefined ? Number(body.order) : undefined;

  if (requireAll) {
    if (!categoryId) throw new Error("categoryId requerido");
    if (!name) throw new Error("name requerido");
    if (!slug) throw new Error("slug requerido");
  }

  return { categoryId, name, slug, isActive, order };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const categoryId = req.nextUrl.searchParams.get("categoryId");
    const where = categoryId ? { categoryId } : undefined;
    const items = await prisma.financeSubcategory.findMany({
      where,
      include: { category: true },
      orderBy: [{ order: "asc" }, { name: "asc" }]
    });
    return NextResponse.json({ data: items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las subcategorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { categoryId, name, slug, isActive, order } = normalize(body, true);

    const saved = await prisma.financeSubcategory.create({
      data: {
        categoryId: categoryId!,
        name: name!,
        slug: slug!,
        isActive: isActive ?? true,
        order: order ?? 0
      },
      include: { category: true }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2003") return NextResponse.json({ error: "categoryId inválido" }, { status: 400 });
    if (err.code === "P2002") return NextResponse.json({ error: "Slug duplicado" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo crear la subcategoría" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { categoryId, name, slug, isActive, order } = normalize(body, false);

    const data: any = {};
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (isActive !== undefined) data.isActive = isActive;
    if (order !== undefined && !Number.isNaN(order)) data.order = order;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.financeSubcategory.update({
      where: { id },
      data,
      include: { category: true }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "Slug duplicado" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la subcategoría" }, { status: 400 });
  }
}
