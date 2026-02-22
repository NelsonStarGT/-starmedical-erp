import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleFromRequest } from "@/lib/api/auth";
import { inventoryServiceUnavailable, mapFallbackProductsForApi, runtimeFallbackEnabled } from "@/lib/inventory/runtime-fallback";

export async function GET(req: NextRequest) {
  try {
    const role = roleFromRequest(req);
    if (!role) return NextResponse.json({ error: "Rol no proporcionado" }, { status: 401 });

    const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
    const items = await prisma.product.findMany({
      include: {
        category: true,
        subcategory: true,
        inventoryArea: true,
        stocks: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const data = items
      .filter((p) => {
        if (!search) return true;
        const haystack = `${p.name} ${p.code} ${p.category?.name || ""} ${p.subcategory?.name || ""}`.toLowerCase();
        return search.split(/\s+/).every((t) => haystack.includes(t));
      })
      .map((p) => {
        const stockActual = p.stocks.reduce((acc, s) => acc + s.stock, 0);
        const stockMinimo = p.stocks.reduce((acc, s) => Math.max(acc, s.minStock), 0);
        return {
          id: p.id,
          nombre: p.name,
          codigo: p.code,
          categoriaId: p.categoryId,
          subcategoriaId: p.subcategoryId || undefined,
          areaId: p.inventoryAreaId || undefined,
          unidadMedida: p.unit || "",
          costoUnitario: Number(p.avgCost || p.cost || 0),
          precioVenta: Number(p.baseSalePrice || p.price || 0),
          baseSalePrice: Number(p.baseSalePrice || p.price || 0),
          avgCost: Number(p.avgCost || p.cost || 0),
          presentacion: (p as any).presentation || "",
          stockActual,
          stockMinimo,
          proveedorId: "",
          sucursalId: p.stocks[0]?.branchId || "",
          estado: (p as any).status || "Activo",
          categoriaNombre: p.category?.name,
          subcategoriaNombre: p.subcategory?.name,
          areaNombre: p.inventoryArea?.name,
          stockPorSucursal: p.stocks.map((s) => ({
            branchId: s.branchId,
            stock: s.stock,
            minStock: s.minStock
          }))
        };
      });

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    if (!runtimeFallbackEnabled()) {
      return NextResponse.json(
        inventoryServiceUnavailable("inventario.productos", "No se pudo consultar productos en este entorno."),
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, data: mapFallbackProductsForApi(), source: "runtime_fallback" }, { status: 200 });
  }
}
