import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { inventoryServiceUnavailable, mapFallbackProductsForApi, runtimeFallbackEnabled } from "@/lib/inventory/runtime-fallback";

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
  try {
    const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
    if (auth.errorResponse) return auth.errorResponse;
    const { scope, errorResponse } = resolveInventoryScope(req);
    if (errorResponse || !scope) return errorResponse;

    const statusScope = resolveStatusScope(req);
    const search = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
    const where: Prisma.ProductWhereInput = {};
    if (statusScope.length === 1) where.status = statusScope[0];
    if (statusScope.length > 1) where.status = { in: statusScope };
    if (scope.branchId) {
      where.stocks = {
        some: {
          tenantId: scope.tenantId,
          deletedAt: null,
          branchId: scope.branchId
        }
      };
    }
    const items = await prisma.product.findMany({
      where: inventoryWhere(scope, where),
      include: {
        category: true,
        subcategory: true,
        inventoryArea: true,
        stocks: {
          where: inventoryWhere(scope, {}, { branchScoped: true })
        }
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

    return NextResponse.json({
      data,
      meta: {
        scope: {
          tenantId: scope.tenantId,
          branchId: scope.branchId,
          status: statusScope,
          deletedAt: null
        }
      }
    });
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
