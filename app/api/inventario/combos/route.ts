import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";

const includeCombo = (tenantId: string) => ({
  services: { where: { tenantId, deletedAt: null }, include: { service: true } },
  products: { where: { tenantId, deletedAt: null }, include: { product: true } }
});

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveStatusScope(req: NextRequest) {
  const raw = normalizeOptionalString(req.nextUrl.searchParams.get("status"));
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const statusScope = resolveStatusScope(req);
  const statusWhere =
    statusScope.length === 0 ? {} : statusScope.length === 1 ? { status: statusScope[0] } : { status: { in: statusScope } };
  const combos = await prisma.combo.findMany({
    where: inventoryWhere(scope, statusWhere),
    include: includeCombo(scope.tenantId),
    orderBy: { updatedAt: "desc" }
  });

  const filtered = combos.filter((c) => {
    if (!search) return true;
    const haystack = `${c.name} ${c.description || ""} ${c.id}`.toLowerCase();
    return haystack.includes(search);
  });

  return NextResponse.json({
    data: filtered.map(mapCombo),
    meta: {
      scope: {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        status: statusScope,
        deletedAt: null
      }
    }
  });
}

export async function POST(req: NextRequest) {
  const perm = requirePermission(req, "editar_combo");
  if (perm) return perm;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const { nombre, descripcion, serviciosAsociados = [], productosAsociados = [], precioFinal = 0, estado = "Activo", imageUrl } = body || {};
    if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const { costProductsTotal, costCalculated } = await computeCost(scope.tenantId, productosAsociados);
    const created = await prisma.combo.create({
      data: inventoryCreateData(scope, {
        name: nombre,
        description: descripcion,
        priceFinal: precioFinal,
        costProductsTotal,
        costCalculated,
        status: estado,
        imageUrl,
        services: {
          create: serviciosAsociados.map((sid: string) => ({ serviceId: sid, tenantId: scope.tenantId }))
        },
        products: {
          create: productosAsociados.map((p: any) => ({
            tenantId: scope.tenantId,
            productId: p.productoId,
            quantity: p.cantidad ?? 1,
            unitCost: p.costoUnitario ?? null
          }))
        }
      }),
      include: includeCombo(scope.tenantId)
    });
    return NextResponse.json({ data: mapCombo(created) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear el combo" }, { status: 500 });
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
