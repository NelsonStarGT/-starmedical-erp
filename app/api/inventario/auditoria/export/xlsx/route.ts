import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const [products, services, combos, productCats, productSubcats, serviceCats, serviceSubcats, areas, priceLists, priceItems] =
      await Promise.all([
        prisma.product.findMany({ include: { category: true, subcategory: true, inventoryArea: true, stocks: true } }),
        prisma.service.findMany({ include: { category: true, subcategory: true } }),
        prisma.combo.findMany({ include: { products: { include: { product: true } }, services: { include: { service: true } } } }),
        prisma.productCategory.findMany(),
        prisma.productSubcategory.findMany(),
        prisma.serviceCategory.findMany(),
        prisma.serviceSubcategory.findMany(),
        prisma.inventoryArea.findMany(),
        prisma.priceList.findMany(),
        prisma.priceListItem.findMany()
      ]);

    const wb = new ExcelJS.Workbook();

    const wsProducts = wb.addWorksheet("Productos");
    wsProducts.columns = [
      { header: "Código", key: "codigo", width: 16 },
      { header: "Nombre", key: "nombre", width: 32 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Subcategoría", key: "subcategoria", width: 20 },
      { header: "Área", key: "area", width: 16 },
      { header: "Costo prom.", key: "avgCost", width: 12 },
      { header: "Precio base", key: "precioBase", width: 12 },
      { header: "Margen %", key: "marginPct", width: 10 },
      { header: "Estado", key: "estado", width: 10 },
      { header: "Stock total", key: "stockTotal", width: 12 }
    ];
    products.forEach((p) => {
      const stockTotal = p.stocks.reduce((acc, s) => acc + s.stock, 0);
      wsProducts.addRow({
        codigo: p.code,
        nombre: p.name,
        categoria: p.category?.name,
        subcategoria: p.subcategory?.name,
        area: p.inventoryArea?.name,
        avgCost: Number(p.avgCost || p.cost || 0),
        precioBase: Number(p.baseSalePrice || p.price || 0),
        marginPct: p.marginPct ?? "",
        estado: (p as any).status || "Activo",
        stockTotal
      });
    });

    const wsServices = wb.addWorksheet("Servicios");
    wsServices.columns = [
      { header: "Código", key: "codigo", width: 16 },
      { header: "Nombre", key: "nombre", width: 32 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Subcategoría", key: "subcategoria", width: 20 },
      { header: "Precio base", key: "precioBase", width: 12 },
      { header: "Margen %", key: "marginPct", width: 10 },
      { header: "Estado", key: "estado", width: 10 }
    ];
    services.forEach((s) => {
      wsServices.addRow({
        codigo: s.code,
        nombre: s.name,
        categoria: s.category?.name,
        subcategoria: s.subcategory?.name,
        precioBase: Number(s.price || 0),
        marginPct: s.marginPct ?? "",
        estado: s.status
      });
    });

    const wsCombos = wb.addWorksheet("Combos");
    wsCombos.columns = [
      { header: "Nombre", key: "nombre", width: 28 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Precio base", key: "precioBase", width: 12 },
      { header: "Estado", key: "estado", width: 10 },
      { header: "Servicios", key: "servicios", width: 40 },
      { header: "Productos", key: "productos", width: 40 }
    ];
    combos.forEach((c) => {
      wsCombos.addRow({
        nombre: c.name,
        costo: Number((c as any).costCalculated || c.costProductsTotal || 0),
        precioBase: Number((c as any).priceFinal || 0),
        estado: (c as any).status || "Activo",
        servicios: c.services.map((s) => s.service?.name || s.serviceId).join(", "),
        productos: c.products.map((p) => `${p.product?.code || p.productId} x${p.quantity}`).join(", ")
      });
    });

    const addSimpleSheet = (name: string, data: any[], columns: { header: string; key: string; width?: number }[]) => {
      const ws = wb.addWorksheet(name);
      ws.columns = columns;
      data.forEach((row) => ws.addRow(row));
    };

    addSimpleSheet("Categorías prod.", productCats, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Tipo", key: "type", width: 12 },
      { header: "Orden", key: "order", width: 8 },
      { header: "Estado", key: "status", width: 10 }
    ]);
    addSimpleSheet("Subcategorías prod.", productSubcats, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Categoría", key: "categoryId", width: 18 },
      { header: "Orden", key: "order", width: 8 },
      { header: "Estado", key: "status", width: 10 }
    ]);
    addSimpleSheet("Categorías serv.", serviceCats, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Área", key: "area", width: 18 },
      { header: "Orden", key: "order", width: 8 },
      { header: "Estado", key: "status", width: 10 }
    ]);
    addSimpleSheet("Subcategorías serv.", serviceSubcats, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Categoría", key: "categoryId", width: 18 },
      { header: "Orden", key: "order", width: 8 },
      { header: "Estado", key: "status", width: 10 }
    ]);
    addSimpleSheet("Áreas inventario", areas, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Slug", key: "slug", width: 18 },
      { header: "Orden", key: "order", width: 8 },
      { header: "Externa", key: "isExternal", width: 10 }
    ]);
    addSimpleSheet("Listas de precios", priceLists, [
      { header: "ID", key: "id", width: 18 },
      { header: "Nombre", key: "name", width: 24 },
      { header: "Tipo", key: "type", width: 12 },
      { header: "Estado", key: "estado", width: 12 }
    ]);

    const wsPrices = wb.addWorksheet("Precios");
    wsPrices.columns = [
      { header: "Lista", key: "lista", width: 18 },
      { header: "ItemType", key: "itemType", width: 12 },
      { header: "ItemId", key: "itemId", width: 18 },
      { header: "Precio", key: "precio", width: 12 }
    ];
    priceItems.forEach((i) => {
      wsPrices.addRow({
        lista: i.priceListId,
        itemType: i.itemType,
        itemId: i.itemId,
        precio: Number(i.precio || 0)
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"auditoria-inventario.xlsx\""
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo exportar auditoría" }, { status: 500 });
  }
}
