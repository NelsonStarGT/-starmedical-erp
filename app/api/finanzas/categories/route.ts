import { NextRequest, NextResponse } from "next/server";
import { FlowType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";

export const dynamic = "force-dynamic";

const FLOWS = Object.values(FlowType);

function normalize(body: any, requireAll = true) {
  const flowType = body.flowType !== undefined ? String(body.flowType || "").toUpperCase() : undefined;
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const slug = body.slug !== undefined ? String(body.slug || "").trim() : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;
  const order = body.order !== undefined ? Number(body.order) : undefined;

  if (requireAll) {
    if (!flowType || !FLOWS.includes(flowType as FlowType)) throw new Error("flowType inválido");
    if (!name) throw new Error("name requerido");
    if (!slug) throw new Error("slug requerido");
  } else if (flowType && !FLOWS.includes(flowType as FlowType)) {
    throw new Error("flowType inválido");
  }

  return { flowType: flowType as FlowType | undefined, name, slug, isActive, order };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const flowType = req.nextUrl.searchParams.get("flowType");
    const where = flowType && FLOWS.includes(flowType as FlowType) ? { flowType: flowType as FlowType } : undefined;
    const categories = await prisma.financeCategory.findMany({
      where,
      include: { subcategories: { orderBy: [{ order: "asc" }, { name: "asc" }] } },
      orderBy: [{ order: "asc" }, { name: "asc" }]
    });
    return NextResponse.json({ data: categories });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { flowType, name, slug, isActive, order } = normalize(body, true);
    const saved = await prisma.financeCategory.create({
      data: {
        flowType: flowType!,
        name: name!,
        slug: slug!,
        isActive: isActive ?? true,
        order: order ?? 0
      },
      include: { subcategories: true }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") return NextResponse.json({ error: "Slug duplicado" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo crear la categoría" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { flowType, name, slug, isActive, order } = normalize(body, false);

    const data: any = {};
    if (flowType !== undefined) data.flowType = flowType;
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (isActive !== undefined) data.isActive = isActive;
    if (order !== undefined && !Number.isNaN(order)) data.order = order;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.financeCategory.update({
      where: { id },
      data,
      include: { subcategories: true }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "Slug duplicado" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la categoría" }, { status: 400 });
  }
}
