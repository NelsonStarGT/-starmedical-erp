import { NextRequest, NextResponse } from "next/server";
import { Prisma, QuoteStatus, QuoteType } from "@prisma/client";
import { ensureCrmAccess } from "@/lib/api/crm";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { persistQuotePdf } from "@/lib/quotes/storage";
import { auditLog } from "@/lib/audit";
import { mapQuoteResponse, nextQuoteNumber } from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const formData = await req.formData();
    const dealId = String(formData.get("dealId") || "").trim();
    if (!dealId) return NextResponse.json({ error: "dealId requerido" }, { status: 400 });

    const pdfInput = formData.get("pdf");
    if (!(pdfInput instanceof Blob)) return NextResponse.json({ error: "Archivo PDF requerido" }, { status: 400 });
    if ((pdfInput as Blob).type && (pdfInput as Blob).type !== "application/pdf") {
      return NextResponse.json({ error: "El archivo debe ser PDF" }, { status: 400 });
    }

    const deal = await prisma.crmDeal.findUnique({ where: { id: dealId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
    if (!isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, deal as any)) {
      return NextResponse.json({ error: "No puedes crear cotizaciones para este deal" }, { status: 403 });
    }

    const typeRaw = String(formData.get("type") || deal.pipelineType || "B2B").toUpperCase();
    const quoteType = typeRaw === "B2C" ? QuoteType.B2C : QuoteType.B2B;
    const notes = formData.get("notes") ? String(formData.get("notes")) : null;
    const totalInput = formData.get("total");
    const declaredTotal = totalInput ? Number(totalInput) : 0;
    const safeTotal = Number.isFinite(declaredTotal) && declaredTotal > 0 ? declaredTotal : 0;
    if (quoteType === QuoteType.B2B && safeTotal <= 0) {
      return NextResponse.json({ error: "total declarado obligatorio para B2B" }, { status: 400 });
    }

    const settings = await prisma.quoteSettings.findUnique({ where: { id: 1 } });
    const paymentTerms = formData.get("paymentTerms")
      ? String(formData.get("paymentTerms"))
      : settings?.defaultPaymentTerms || null;
    const deliveryTime = settings?.defaultDeliveryTime || null;
    const deliveryNote = settings?.defaultDeliveryNote || null;
    const pricesIncludeTax = settings?.showTaxIncludedText ?? true;

    const buffer = Buffer.from(await (pdfInput as Blob).arrayBuffer());
    const previous = await prisma.quote.findFirst({
      where: { dealId, type: quoteType, status: { in: [QuoteStatus.SENT, QuoteStatus.APPROVED] } },
      orderBy: { createdAt: "desc" }
    });

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextQuoteNumber(tx);
      return tx.quote.create({
        data: {
          dealId,
          type: quoteType,
          status: QuoteStatus.DRAFT,
          number,
          validityDays: settings?.defaultValidityDays || 30,
          templateId: null,
          notes,
          paymentTerms,
          deliveryTime,
          deliveryNote,
          pricesIncludeTax,
          chequePayableTo: settings?.defaultChequePayableTo,
          subtotal: new Prisma.Decimal(safeTotal),
          discountTotal: new Prisma.Decimal(0),
          taxTotal: new Prisma.Decimal(0),
          total: new Prisma.Decimal(safeTotal)
        },
        include: { items: true }
      });
    });

    const stored = await persistQuotePdf(buffer, created.id, auth.user?.id, dealId);
    await prisma.quote.update({
      where: { id: created.id },
      data: { pdfUrl: stored.pdfUrl, pdfGeneratedAt: new Date() }
    });
    const refreshed = await prisma.quote.findUnique({ where: { id: created.id }, include: { items: true } });

    await auditLog({
      action: previous ? "QUOTE_VERSION_CREATED" : "QUOTE_CREATED_PDF",
      entityType: "QUOTE",
      entityId: created.id,
      user: auth.user,
      req,
      after: { status: created.status, total: Number(created.total), dealId, pdfUrl: stored.pdfUrl },
      metadata: {
        source: "pdf-upload",
        fileAssetId: stored.fileAssetId,
        pdfHash: stored.pdfHash,
        previousQuoteId: previous?.id || null
      }
    });

    return NextResponse.json({ data: refreshed ? mapQuoteResponse(refreshed) : null });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la cotización desde PDF" }, { status: 400 });
  }
}
