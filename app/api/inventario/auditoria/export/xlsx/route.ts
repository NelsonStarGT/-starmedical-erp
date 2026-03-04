import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const [products, services, combos, productCats, productSubcats, serviceCats, serviceSubcats, areas, priceLists, priceItems] =
      await Promise.all([
        prisma.product.findMany({
          where: inventoryWhere(scope, {}),
          include: {
            category: true,
            subcategory: true,
            inventoryArea: true,
            stocks: { where: inventoryWhere(scope, {}, { branchScoped: true }) }
          }
        }),
        prisma.service.findMany({ where: inventoryWhere(scope, {}), include: { category: true, subcategory: true } }),
        prisma.combo.findMany({
          where: inventoryWhere(scope, {}),
          include: {
            products: { where: inventoryWhere(scope, {}), include: { product: true } },
            services: { where: inventoryWhere(scope, {}), include: { service: true } }
          }
        }),
        prisma.productCategory.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.productSubcategory.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.serviceCategory.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.serviceSubcategory.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.inventoryArea.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.priceList.findMany({ where: inventoryWhere(scope, {}) }),
        prisma.priceListItem.findMany({ where: inventoryWhere(scope, {}) })
      ]);

    const sheets = [
      {
        name: "Productos",
        headers: ["Código", "Nombre", "Categoría", "Subcategoría", "Área", "Costo prom.", "Precio base", "Margen %", "Estado", "Stock total"],
        rows: products.map((product) => {
          const stockTotal = product.stocks.reduce((acc, stock) => acc + stock.stock, 0);
          return [
            product.code,
            product.name,
            product.category?.name ?? "",
            product.subcategory?.name ?? "",
            product.inventoryArea?.name ?? "",
            Number(product.avgCost || product.cost || 0),
            Number(product.baseSalePrice || product.price || 0),
            product.marginPct ?? "",
            (product as any).status || "Activo",
            stockTotal
          ];
        })
      },
      {
        name: "Servicios",
        headers: ["Código", "Nombre", "Categoría", "Subcategoría", "Precio base", "Margen %", "Estado"],
        rows: services.map((service) => [
          service.code,
          service.name,
          service.category?.name ?? "",
          service.subcategory?.name ?? "",
          Number(service.price || 0),
          service.marginPct ?? "",
          service.status
        ])
      },
      {
        name: "Combos",
        headers: ["Nombre", "Costo", "Precio base", "Estado", "Servicios", "Productos"],
        rows: combos.map((combo) => [
          combo.name,
          Number((combo as any).costCalculated || combo.costProductsTotal || 0),
          Number((combo as any).priceFinal || 0),
          (combo as any).status || "Activo",
          combo.services.map((service) => service.service?.name || service.serviceId).join(", "),
          combo.products.map((product) => `${product.product?.code || product.productId} x${product.quantity}`).join(", ")
        ])
      },
      {
        name: "Categorías prod.",
        headers: ["ID", "Nombre", "Tipo", "Orden", "Estado"],
        rows: productCats.map((row) => [row.id, row.name, row.type, row.order, row.status])
      },
      {
        name: "Subcategorías prod.",
        headers: ["ID", "Nombre", "Categoría", "Orden", "Estado"],
        rows: productSubcats.map((row) => [row.id, row.name, row.categoryId, row.order, row.status])
      },
      {
        name: "Categorías serv.",
        headers: ["ID", "Nombre", "Área", "Orden", "Estado"],
        rows: serviceCats.map((row) => [row.id, row.name, row.area, row.order, row.status])
      },
      {
        name: "Subcategorías serv.",
        headers: ["ID", "Nombre", "Categoría", "Orden", "Estado"],
        rows: serviceSubcats.map((row) => [row.id, row.name, row.categoryId, row.order, row.status])
      },
      {
        name: "Áreas inventario",
        headers: ["ID", "Nombre", "Slug", "Orden", "Externa"],
        rows: areas.map((row) => [row.id, row.name, row.slug, row.order, row.isExternal])
      },
      {
        name: "Listas de precios",
        headers: ["ID", "Nombre", "Tipo", "Estado"],
        rows: priceLists.map((row) => [row.id, row.name, row.type, (row as any).estado ?? ""])
      },
      {
        name: "Precios",
        headers: ["Lista", "ItemType", "ItemId", "Precio"],
        rows: priceItems.map((row) => [row.priceListId, row.itemType, row.itemId, Number(row.precio || 0)])
      }
    ];
    const { buffer } = await exportExcelViaProcessingService({
      context: {
        tenantId: scope.tenantId,
        actorId: `inventory-${auth.role || "admin"}`
      },
      fileName: "auditoria-inventario.xlsx",
      sheets,
      limits: {
        maxFileMb: 20,
        maxRows: 50_000,
        maxCols: 200,
        timeoutMs: 25_000
      }
    });
    return new NextResponse(new Uint8Array(buffer), {
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
