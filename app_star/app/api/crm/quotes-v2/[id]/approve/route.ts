import { NextRequest, NextResponse } from "next/server";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { mapQuoteResponse, recalcDealAmount } from "../../utils";
import { auditLog } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_APPROVE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (!quote.dealId) return NextResponse.json({ error: "Cotizacion debe pertenecer a un deal" }, { status: 400 });
    const pendingStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.APPROVAL_PENDING];
    if (!pendingStatuses.includes(quote.status)) {
      return NextResponse.json({ error: "Solo cotizaciones en DRAFT o PENDING_APPROVAL pueden aprobarse" }, { status: 400 });
    }
    if (quote.type === "B2B" && !quote.pdfUrl) {
      return NextResponse.json({ error: "La cotizacion B2B requiere PDF antes de aprobar" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({ where: { dealId: quote.dealId }, data: { isActive: false } });
      const saved = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: QuoteStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: auth.user?.id || auth.role,
          isActive: true
        },
        include: { items: true }
      });
      await recalcDealAmount(tx, quote.dealId);
      return saved;
    });

    await auditLog({
      action: "QUOTE_APPROVED",
      entityType: "QUOTE",
      entityId: updated.id,
      before: { status: quote.status, total: Number(quote.total) },
      after: { status: updated.status, total: Number(updated.total) },
      user: auth.user,
      req
    });

    return NextResponse.json({ data: mapQuoteResponse(updated) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo aprobar la cotizacion" }, { status: 400 });
  }
}
