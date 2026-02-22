import { NextRequest, NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { mapQuoteResponse } from "../../utils";
import { PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_SEND);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (quote.status !== QuoteStatus.DRAFT) {
      return NextResponse.json({ error: "Solo cotizaciones en DRAFT pueden solicitar aprobacion" }, { status: 400 });
    }
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.APPROVAL_PENDING, approvalRequestedAt: new Date() },
      include: { items: true }
    });
    await auditLog({
      action: "QUOTE_APPROVAL_REQUESTED",
      entityType: "QUOTE",
      entityId: quoteId,
      before: { status: quote.status },
      after: { status: updated.status },
      user: auth.user,
      req
    });
    return NextResponse.json({ data: mapQuoteResponse(updated) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo solicitar aprobacion" }, { status: 400 });
  }
}
