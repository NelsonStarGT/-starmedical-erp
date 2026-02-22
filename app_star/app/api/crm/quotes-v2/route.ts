import { NextRequest, NextResponse } from "next/server";
import { Prisma, QuoteStatus, QuoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { computeTotals, normalizeItems, ItemInput, mapQuoteResponse, nextQuoteNumber } from "./utils";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  const dealId = req.nextUrl.searchParams.get("dealId") || undefined;
  if (!dealId) return NextResponse.json({ error: "dealId requerido" }, { status: 400 });
  try {
    const deal = await prisma.crmDeal.findUnique({ where: { id: dealId }, select: { id: true, ownerId: true, ownerUserId: true, branchId: true } });
    if (deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, deal as any)) {
      return NextResponse.json({ error: "No autorizado a ver cotizaciones de este deal" }, { status: 403 });
    }
    const quotes = await prisma.quote.findMany({
      where: { dealId },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({
      data: quotes.map(mapQuoteResponse)
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "No se pudieron obtener cotizaciones";
    return NextResponse.json(
      { error: "No se pudieron cargar las cotizaciones. Reintenta. Si persiste, verifica permisos o sesión.", detail: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const dealId = body.dealId ? String(body.dealId) : "";
    if (!dealId) return NextResponse.json({ error: "dealId requerido" }, { status: 400 });
    const deal = await prisma.crmDeal.findUnique({ where: { id: dealId } });
    if (!deal) return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
    if (!isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, deal)) {
      return NextResponse.json({ error: "No puedes crear cotizaciones para este deal" }, { status: 403 });
    }
    const items = normalizeItems(body.items || []);
    const statusRaw = body.status ? String(body.status).toUpperCase() : "DRAFT";
    const status = Object.values(QuoteStatus).includes(statusRaw as QuoteStatus) ? (statusRaw as QuoteStatus) : QuoteStatus.DRAFT;

    const settings = await prisma.quoteSettings.findUnique({ where: { id: 1 } });
    const quoteType: QuoteType = body.type === QuoteType.B2C || body.type === "B2C" ? QuoteType.B2C : QuoteType.B2B;
    const templateId =
      body.templateId ||
      (await prisma.quoteTemplate.findFirst({ where: { type: quoteType, isDefault: true } }))?.id ||
      undefined;
    const totals = computeTotals(items);
    const paymentTerms =
      body.paymentTerms || settings?.defaultPaymentTerms || (body.paymentMode === "CREDITO" ? "Crédito" : "Contado");
    const deliveryTime = body.deliveryTime || settings?.defaultDeliveryTime || null;
    const deliveryNote = body.deliveryNote || settings?.defaultDeliveryNote || null;
    const pricesIncludeTax = body.pricesIncludeTax ?? settings?.showTaxIncludedText ?? true;
    const notes = body.notes || "";

    const created = await prisma.$transaction(async (tx) => {
      const number = await nextQuoteNumber(tx);
      const quote = await tx.quote.create({
        data: {
          dealId,
          type: quoteType,
          status,
          number,
          validityDays: settings?.defaultValidityDays || 30,
          templateId,
          notes,
          paymentTerms,
          deliveryTime,
          deliveryNote,
          pricesIncludeTax,
          chequePayableTo: settings?.defaultChequePayableTo,
          subtotal: new Prisma.Decimal(totals.subtotal),
          discountTotal: new Prisma.Decimal(totals.discountTotal),
          taxTotal: new Prisma.Decimal(totals.taxTotal),
          total: new Prisma.Decimal(totals.total),
          items: {
            create: items.map((it) => {
              const lineSubtotal = it.qty * it.unitPrice;
              const lineDiscount = lineSubtotal * ((it.discountPct || 0) / 100);
              const lineTotal = lineSubtotal - lineDiscount;
              return {
                category: it.category,
                productName: it.productName,
                enlace: it.enlace || null,
                refCode: it.refCode || null,
                description: it.description || null,
                qty: new Prisma.Decimal(it.qty),
                unitPrice: new Prisma.Decimal(it.unitPrice),
                discountPct: it.discountPct ? new Prisma.Decimal(it.discountPct) : null,
                lineTotal: new Prisma.Decimal(lineTotal)
              };
            })
          }
        },
        include: { items: true }
      });
      return quote;
    });

    await auditLog({
      action: "QUOTE_CREATED",
      entityType: "QUOTE",
      entityId: created.id,
      after: { status: created.status, total: Number(created.total), dealId },
      user: auth.user,
      req
    });

    return NextResponse.json({ data: mapQuoteResponse(created) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la cotización" }, { status: 400 });
  }
}
