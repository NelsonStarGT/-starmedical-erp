import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";

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

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Precios");
    const columns = [
      { header: "Código", key: "code", width: 18 },
      { header: "Nombre", key: "name", width: 30 },
      { header: "Tipo", key: "type", width: 12 },
      ...lists.map((l) => ({ header: l.name, key: l.id, width: 12 }))
    ];
    ws.columns = columns as any;

    items.forEach((item) => {
      const row: any = {
        code: item.code,
        name: item.name,
        type: itemType
      };
      lists.forEach((l) => {
        row[l.id] = priceMap[item.id]?.[l.id] ?? "";
      });
      ws.addRow(row);
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
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
