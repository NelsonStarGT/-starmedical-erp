import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase();
    const take = 40;
    const productWhere: Prisma.ProductWhereInput = q
      ? { OR: [{ name: { contains: q, mode: Prisma.QueryMode.insensitive } }, { code: { contains: q, mode: Prisma.QueryMode.insensitive } }] }
      : {};
    const serviceWhere: Prisma.ServiceWhereInput = q
      ? { OR: [{ name: { contains: q, mode: Prisma.QueryMode.insensitive } }, { code: { contains: q, mode: Prisma.QueryMode.insensitive } }] }
      : {};

    const [products, services, combos] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: { category: true, subcategory: true },
        orderBy: { name: "asc" },
        take
      }),
      prisma.service.findMany({
        where: serviceWhere,
        include: { category: true, subcategory: true },
        orderBy: { name: "asc" },
        take
      }),
      prisma.combo.findMany({
        where: q ? { name: { contains: q, mode: "insensitive" } } : {},
        orderBy: { name: "asc" },
        take
      })
    ]);

    const mapped = [
      ...products.map((p) => ({
        id: p.id,
        type: "PRODUCT" as const,
        name: p.name,
        category: p.subcategory?.name || p.category?.name || "Producto",
        code: p.code,
        price: Number(p.price || p.baseSalePrice || 0),
        stock: undefined
      })),
      ...services.map((s) => ({
        id: s.id,
        type: "SERVICE" as const,
        name: s.name,
        category: s.subcategory?.name || s.category?.name || "Servicio",
        code: s.code || "",
        price: Number(s.price || 0),
        stock: undefined
      })),
      ...combos.map((c) => ({
        id: c.id,
        type: "COMBO" as const,
        name: c.name,
        category: "Combo/Paquete",
        code: "",
        price: Number(c.priceFinal || 0),
        stock: undefined
      }))
    ];

    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener items" }, { status: 500 });
  }
}
