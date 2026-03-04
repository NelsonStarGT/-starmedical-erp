import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InventoryType = "SERVICE" | "PRODUCT" | "COMBO";

type SearchRow = {
  id: string;
  type: InventoryType;
  name: string;
  code: string | null;
  category: string | null;
  active: boolean;
  categoryId: string | null; // compat
  categoryName: string | null; // compat
};

function parseType(value: string | null): InventoryType | "ALL" {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "SERVICE" || normalized === "PRODUCT" || normalized === "COMBO") return normalized;
  return "ALL";
}

function parseLimit(value: string | null) {
  const parsed = Number(value || 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function buildContains(q: string) {
  if (!q) return undefined;
  return { contains: q, mode: Prisma.QueryMode.insensitive } as const;
}

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador", "Operador", "Recepcion"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;

  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  const type = parseType(req.nextUrl.searchParams.get("type"));
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

  try {
    const runServices = type === "ALL" || type === "SERVICE";
    const runProducts = type === "ALL" || type === "PRODUCT";
    const runCombos = type === "ALL" || type === "COMBO";

    const [services, products, combos] = await Promise.all([
      runServices
        ? prisma.service.findMany({
            where: inventoryWhere(
              scope,
              q
                ? {
                    OR: [{ name: buildContains(q) }, { code: buildContains(q) }]
                  }
                : {}
            ),
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              categoryId: true,
              category: { select: { name: true } }
            },
            take: limit,
            orderBy: [{ name: "asc" }]
          })
        : Promise.resolve([]),
      runProducts
        ? prisma.product.findMany({
            where: inventoryWhere(
              scope,
              q
                ? {
                    OR: [{ name: buildContains(q) }, { code: buildContains(q) }]
                  }
                : {}
            ),
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              categoryId: true,
              category: { select: { name: true } }
            },
            take: limit,
            orderBy: [{ name: "asc" }]
          })
        : Promise.resolve([]),
      runCombos
        ? prisma.combo.findMany({
            where: inventoryWhere(
              scope,
              q
                ? {
                    OR: [{ name: buildContains(q) }, { description: buildContains(q) }]
                  }
                : {}
            ),
            select: {
              id: true,
              name: true,
              description: true,
              status: true
            },
            take: limit,
            orderBy: [{ name: "asc" }]
          })
        : Promise.resolve([])
    ]);

    const rows: SearchRow[] = [
      ...services.map((item) => ({
        id: item.id,
        type: "SERVICE" as const,
        name: item.name,
        code: item.code,
        category: item.category?.name || null,
        active: String(item.status || "").toLowerCase() !== "inactivo",
        categoryId: item.categoryId,
        categoryName: item.category?.name || null
      })),
      ...products.map((item) => ({
        id: item.id,
        type: "PRODUCT" as const,
        name: item.name,
        code: item.code,
        category: item.category?.name || null,
        active: String(item.status || "").toLowerCase() !== "inactivo",
        categoryId: item.categoryId,
        categoryName: item.category?.name || null
      })),
      ...combos.map((item) => ({
        id: item.id,
        type: "COMBO" as const,
        name: item.name,
        code: null,
        category: "Combos",
        active: String(item.status || "").toLowerCase() !== "inactivo",
        categoryId: "combo",
        categoryName: "Combos"
      }))
    ]
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
      .slice(0, limit);

    return NextResponse.json({ data: rows, meta: { q, type, limit, scope: { tenantId: scope.tenantId, branchId: scope.branchId } } });
  } catch (error) {
    console.error("[inventory.search] fallback empty due to runtime error", error);
    const allowDevFallback =
      process.env.NODE_ENV !== "production" && process.env.INVENTORY_SEARCH_DEV_FALLBACK === "1";

    if (allowDevFallback) {
      return NextResponse.json(
        {
          data: [],
          meta: {
            q,
            type,
            limit,
            warning: "Fallback de inventario habilitado solo en DEV (INVENTORY_SEARCH_DEV_FALLBACK=1)."
          }
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "No se pudo realizar la búsqueda de inventario" }, { status: 500 });
  }
}
