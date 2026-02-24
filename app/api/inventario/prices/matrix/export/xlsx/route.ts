import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

export const runtime = "nodejs";
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
      prisma.priceListItem.findMany({ where: { itemType } })
    ]);
    const priceMap: Record<string, Record<string, number>> = {};
    prices.forEach((p) => {
      if (!priceMap[p.itemId]) priceMap[p.itemId] = {};
      priceMap[p.itemId][p.priceListId] = Number((p as any).precio ?? (p as any).price ?? 0);
    });

    const headers = ["Código", "Nombre", "Tipo", ...lists.map((list) => list.name)];
    const rows = items.map((item) => {
      return [
        item.code,
        item.name,
        itemType,
        ...lists.map((list) => priceMap[item.id]?.[list.id] ?? "")
      ];
    });

    const { buffer } = await exportExcelViaProcessingService({
      context: {
        tenantId: req.headers.get("x-tenant-id"),
        actorId: `inventory-${auth.role || "admin"}`
      },
      fileName: `precios-${itemType.toLowerCase()}.xlsx`,
      sheets: [
        {
          name: "Precios",
          headers,
          rows
        }
      ],
      limits: {
        maxFileMb: 8,
        maxRows: 20_000,
        maxCols: 180,
        timeoutMs: 20_000
      }
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"precios-${itemType.toLowerCase()}.xlsx\"`
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo exportar" }, { status: 500 });
  }
}

async function fetchItems(itemType: string) {
  if (itemType === "SERVICE") {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return services.map((s) => ({ id: s.id, code: s.code || s.id, name: s.name }));
  }
  if (itemType === "COMBO") {
    const combos = await prisma.combo.findMany({ orderBy: { name: "asc" } });
    return combos.map((c) => ({ id: c.id, code: c.id, name: c.name }));
  }
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map((p) => ({ id: p.id, code: p.code, name: p.name }));
}
