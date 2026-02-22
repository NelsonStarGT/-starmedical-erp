import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, roleFromRequest } from "@/lib/api/auth";

export const runtime = "nodejs";

const includeCombo = {
  services: { include: { service: true } },
  products: { include: { product: true } }
};

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const combos = await prisma.combo.findMany({
    where: status ? { status } : undefined,
    include: includeCombo,
    orderBy: { updatedAt: "desc" }
  });

  const filtered = combos.filter((c) => {
    if (!search) return true;
    const haystack = `${c.name} ${c.description || ""} ${c.id}`.toLowerCase();
    return haystack.includes(search);
  });

  return NextResponse.json({ data: filtered.map(mapCombo) });
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_combo");
  if (perm) return perm;
  const role = roleFromRequest(req);
  const isAdmin = role === "Administrador";
  try {
    const body = await req.json();
    const { nombre, descripcion, serviciosAsociados = [], productosAsociados = [], precioFinal = 0, estado = "Activo", imageUrl } = body || {};
    if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const { costProductsTotal, costCalculated } = await computeCost(productosAsociados);
    const created = await prisma.combo.create({
      data: {
        name: nombre,
        description: descripcion,
        priceFinal: precioFinal,
        costProductsTotal,
        costCalculated,
        status: estado,
        imageUrl,
        services: {
          create: serviciosAsociados.map((sid: string) => ({ serviceId: sid }))
        },
        products: {
          create: productosAsociados.map((p: any) => ({
            productId: p.productoId,
            quantity: p.cantidad ?? 1,
            unitCost: p.costoUnitario ?? null
          }))
        }
      },
      include: includeCombo
    });
    return NextResponse.json({ data: mapCombo(created) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear el combo" }, { status: 500 });
  }
}

async function computeCost(productosAsociados: Array<{ productoId: string; cantidad?: number; costoUnitario?: number }>) {
  if (!productosAsociados || productosAsociados.length === 0) return { costProductsTotal: 0, costCalculated: 0 };
  const ids = productosAsociados.map((p) => p.productoId).filter(Boolean);
  const prods = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, avgCost: true, cost: true } });
  const map = prods.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.id]: Number(p.avgCost || p.cost || 0) }), {});
  const total = productosAsociados.reduce((acc, item) => {
    const cost = item.costoUnitario ?? map[item.productoId] ?? 0;
    const qty = item.cantidad ?? 1;
    return acc + cost * qty;
  }, 0);
  return { costProductsTotal: total, costCalculated: total };
}

function mapCombo(db: any) {
  return {
    id: db.id,
    nombre: db.name,
    descripcion: db.description || "",
    serviciosAsociados: (db.services || []).map((s: any) => s.serviceId),
    productosAsociados: (db.products || []).map((p: any) => ({
      productoId: p.productId,
      cantidad: p.quantity,
      costoUnitario: p.unitCost ? Number(p.unitCost) : undefined
    })),
    precioFinal: Number(db.priceFinal || 0),
    costoProductosTotal: Number(db.costProductsTotal || 0),
    costoCalculado: Number(db.costCalculated || 0),
    imageUrl: db.imageUrl || undefined,
    estado: db.status as any
  };
}
