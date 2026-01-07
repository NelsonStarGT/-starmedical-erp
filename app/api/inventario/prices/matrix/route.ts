import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

function normalizeItemType(raw: string | null) {
  if (raw === "SERVICE") return "SERVICE";
  if (raw === "COMBO") return "COMBO";
  return "PRODUCT";
}

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const itemType = normalizeItemType(req.nextUrl.searchParams.get("itemType"));
  try {
    const [lists, items, prices] = await Promise.all([
      prisma.priceList.findMany({ orderBy: { name: "asc" } }),
      fetchItems(itemType),
      prisma.priceListItem.findMany({
        where: { itemType },
        orderBy: { priceListId: "asc" }
      })
    ]);

    const priceMap: Record<string, Record<string, number>> = {};
    prices.forEach((p) => {
      if (!priceMap[p.itemId]) priceMap[p.itemId] = {};
      priceMap[p.itemId][p.priceListId] = Number((p as any).precio ?? (p as any).price ?? 0);
    });

    return NextResponse.json({
      lists,
      items,
      prices: priceMap
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener la matriz de precios" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const changes = Array.isArray(body) ? body : [];
    const itemType = normalizeItemType(body?.itemType || null);
    const codes = Array.from(new Set(changes.map((c: any) => c.itemCode).filter(Boolean)));
    const idMap = await resolveIds(itemType, codes);

    for (const change of changes) {
      const priceListId = change.priceListId;
      const code = change.itemCode;
      const price = Number(change.price || 0);
      if (!priceListId || !code || Number.isNaN(price)) continue;
      const itemId = idMap[code] || idMap[code.toUpperCase()] || idMap[code.toLowerCase()];
      if (!itemId) continue;
      const existing = await prisma.priceListItem.findFirst({
        where: { priceListId, itemType, itemId }
      });
      if (existing) {
        await prisma.priceListItem.update({ where: { id: existing.id }, data: { precio: price } });
      } else {
        await prisma.priceListItem.create({ data: { priceListId, itemType, itemId, precio: price, ivaIncluded: true } as any });
      }
    }

    return NextResponse.json({ updated: changes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo actualizar precios" }, { status: 400 });
  }
}

async function fetchItems(itemType: string) {
  if (itemType === "SERVICE") {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return services.map((s) => ({
      id: s.id,
      code: s.code || s.id,
      name: s.name
    }));
  }
  if (itemType === "COMBO") {
    const combos = await prisma.combo.findMany({ orderBy: { name: "asc" } });
    return combos.map((c) => ({
      id: c.id,
      code: c.id,
      name: c.name
    }));
  }
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name
  }));
}

async function resolveIds(itemType: string, codes: string[]) {
  if (codes.length === 0) return {};
  if (itemType === "SERVICE") {
    const services = await prisma.service.findMany({ where: { OR: [{ code: { in: codes } }, { id: { in: codes } }] }, select: { id: true, code: true } });
    const map: Record<string, string> = {};
    services.forEach((s) => {
      if (s.code) map[s.code] = s.id;
      map[s.id] = s.id;
    });
    return map;
  }
  if (itemType === "COMBO") {
    const combos = await prisma.combo.findMany({ where: { id: { in: codes } }, select: { id: true } });
    const map: Record<string, string> = {};
    combos.forEach((c) => {
      map[c.id] = c.id;
    });
    return map;
  }
  const products = await prisma.product.findMany({ where: { OR: [{ code: { in: codes } }, { id: { in: codes } }] }, select: { id: true, code: true } });
  const map: Record<string, string> = {};
  products.forEach((p) => {
    map[p.code] = p.id;
    map[p.id] = p.id;
  });
  return map;
}
