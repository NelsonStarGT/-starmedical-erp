import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { deal: { select: { id: true, ownerId: true, ownerUserId: true, branchId: true } } }
    });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (quote.deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, quote.deal as any)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const deliveries = await prisma.quoteDelivery.findMany({
      where: { quoteId },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ data: deliveries });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron cargar los envios" }, { status: 500 });
  }
}
