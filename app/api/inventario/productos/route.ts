import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleFromRequest } from "@/lib/api/auth";
import { productosMock } from "@/lib/mock/productos";

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
    // Fallback a mock si la base no está disponible (evita romper UI en entornos sin migración)
    const data = productosMock.map((p) => ({
      ...p,
      categoriaNombre: undefined,
      subcategoriaNombre: undefined,
      areaNombre: undefined,
      stockPorSucursal: [{ branchId: p.sucursalId, stock: p.stockActual, minStock: p.stockMinimo }]
    }));
    return NextResponse.json({ data, warning: "Usando datos mock; verifica migraciones/DB" }, { status: 200 });
  }
}
