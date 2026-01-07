import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const nit = req.nextUrl.searchParams.get("nit") || undefined;
    const dpi = req.nextUrl.searchParams.get("dpi") || undefined;
    const phone = req.nextUrl.searchParams.get("phone") || undefined;
    const email = req.nextUrl.searchParams.get("email") || undefined;
    const q = req.nextUrl.searchParams.get("q") || undefined;

    const filters: any[] = [];
    if (nit) filters.push({ nit });
    if (dpi) filters.push({ dpi });
    if (phone) filters.push({ phone });
    if (email) filters.push({ email });
    if (q) {
      filters.push({
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } }
        ]
      });
    }

    const where = filters.length ? { OR: filters } : undefined;

    const results = await prisma.clientProfile.findMany({
      where,
      take: 10,
      orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo buscar clientes" }, { status: 500 });
  }
}
