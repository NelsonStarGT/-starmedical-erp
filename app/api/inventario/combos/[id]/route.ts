import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireRoles, roleFromAuthenticatedRequest } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

const includeCombo = (tenantId: string) => ({
  services: { where: { tenantId, deletedAt: null }, include: { service: true } },
  products: { where: { tenantId, deletedAt: null }, include: { product: true } }
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  const combo = await prisma.combo.findFirst({
    where: inventoryWhere(scope, { id: params.id }),
    include: includeCombo(scope.tenantId)
  });
  if (!combo) return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });
  return NextResponse.json({ data: mapCombo(combo) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_combo");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const {
      nombre,
      descripcion,
      serviciosAsociados,
      productosAsociados,
      precioFinal,
      estado,
      imageUrl
    } = body || {};

    const data: any = {};
    if (nombre !== undefined) data.name = nombre;
    if (descripcion !== undefined) data.description = descripcion;
    if (precioFinal !== undefined) data.priceFinal = precioFinal;
    if (estado !== undefined) data.status = estado;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;

    // Recompute costs if products updated or price updated
    if (Array.isArray(productosAsociados)) {
      const { costProductsTotal, costCalculated } = await computeCost(scope.tenantId, productosAsociados);
      data.costProductsTotal = costProductsTotal;
      data.costCalculated = costCalculated;
    }

    const current = await prisma.combo.findFirst({ where: inventoryWhere(scope, { id: params.id }) });
    if (!current) return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });

    await prisma.combo.update({
      where: { id: current.id },
      data: {
        ...data,
        services: Array.isArray(serviciosAsociados)
          ? {
              deleteMany: { tenantId: scope.tenantId },
              create: serviciosAsociados.map((sid: string) => ({ serviceId: sid, tenantId: scope.tenantId }))
            }
          : undefined,
        products: Array.isArray(productosAsociados)
          ? {
              deleteMany: { tenantId: scope.tenantId },
              create: productosAsociados.map((p: any) => ({
                tenantId: scope.tenantId,
                productId: p.productoId,
                quantity: p.cantidad ?? 1,
                unitCost: p.costoUnitario ?? null
              }))
            }
          : undefined
      }
    });
    const hydrated = await prisma.combo.findFirst({
      where: inventoryWhere(scope, { id: params.id }),
      include: includeCombo(scope.tenantId)
    });
    if (!hydrated) return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });

    return NextResponse.json({ data: mapCombo(hydrated) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo actualizar el combo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const perm = requirePermission(req, "editar_combo");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  const role = roleFromAuthenticatedRequest(req);
  const isAdmin = role === "Administrador";
  if (!isAdmin) return NextResponse.json({ error: "Solo Administrador puede eliminar" }, { status: 403 });

  try {
    const combo = await prisma.combo.findFirst({ where: inventoryWhere(scope, { id: params.id }) });
    if (!combo) return NextResponse.json({ error: "Combo no encontrado" }, { status: 404 });

    const priceListUsage = await prisma.priceListItem.count({
      where: inventoryWhere(scope, { itemType: "COMBO", itemId: params.id })
    });
    if (priceListUsage > 0) {
      return NextResponse.json({ error: "El combo está en listas de precios; desactívalo en lugar de eliminar." }, { status: 400 });
    }
    // Placeholder para validación futura de facturación/ventas
    const hasSalesDependency = false;
    if (hasSalesDependency) {
      return NextResponse.json({ error: "El combo tiene ventas asociadas; desactívalo." }, { status: 400 });
    }

    await prisma.combo.updateMany({
      where: inventoryWhere(scope, { id: params.id }),
      data: { deletedAt: new Date(), status: "Inactivo" }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo eliminar el combo" }, { status: 500 });
  }
}

async function computeCost(tenantId: string, productosAsociados: Array<{ productoId: string; cantidad?: number; costoUnitario?: number }>) {
  if (!productosAsociados || productosAsociados.length === 0) return { costProductsTotal: 0, costCalculated: 0 };
  const ids = productosAsociados.map((p) => p.productoId).filter(Boolean);
  const prods = await prisma.product.findMany({
    where: { tenantId, deletedAt: null, id: { in: ids } },
    select: { id: true, avgCost: true, cost: true }
  });
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
