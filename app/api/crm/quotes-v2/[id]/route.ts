import { NextRequest, NextResponse } from "next/server";
import { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { computeTotals, normalizeItems } from "../utils";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, deal: { select: { id: true, ownerId: true, ownerUserId: true, branchId: true } } }
    });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (quote.deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, quote.deal as any)) {
      return NextResponse.json({ error: "No puedes ver esta cotizacion" }, { status: 403 });
    }
    return NextResponse.json({
      data: {
        ...quote,
        subtotal: Number(quote.subtotal),
        discountTotal: Number(quote.discountTotal),
        taxTotal: Number(quote.taxTotal),
        total: Number(quote.total),
        items: quote.items.map((it) => ({
          ...it,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          discountPct: it.discountPct ? Number(it.discountPct) : null,
          lineTotal: Number(it.lineTotal)
        }))
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo cargar la cotizacion" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const current = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, deal: { select: { id: true, ownerId: true, ownerUserId: true, branchId: true } } }
    });
    if (!current) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (current.status !== QuoteStatus.DRAFT) {
      return NextResponse.json({ error: "Solo se puede editar una cotizacion en borrador" }, { status: 400 });
    }
    if (current.type === "B2B") {
      return NextResponse.json(
        { error: "Las cotizaciones B2B por PDF no se editan; crea una nueva versión con un nuevo PDF" },
        { status: 400 }
      );
    }
    if (current.deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, current.deal as any)) {
      return NextResponse.json({ error: "No puedes editar esta cotizacion" }, { status: 403 });
    }
    const body = await req.json();
    const items = normalizeItems(body.items || []);
    const totals = computeTotals(items);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: current.id } });
      const saved = await tx.quote.update({
        where: { id: current.id },
        data: {
          notes: body.notes ?? current.notes,
          paymentTerms: body.paymentTerms ?? current.paymentTerms,
          deliveryTime: body.deliveryTime ?? current.deliveryTime,
          deliveryNote: body.deliveryNote ?? current.deliveryNote,
          pricesIncludeTax: body.pricesIncludeTax ?? current.pricesIncludeTax,
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
      return saved;
    });

    await auditLog({
      action: "QUOTE_UPDATED",
      entityType: "QUOTE",
      entityId: quoteId,
      before: { status: current.status, total: Number(current.total) },
      after: { status: updated.status, total: Number(updated.total) },
      user: auth.user,
      req
    });

    return NextResponse.json({
      data: {
        ...updated,
        subtotal: Number(updated.subtotal),
        discountTotal: Number(updated.discountTotal),
        taxTotal: Number(updated.taxTotal),
        total: Number(updated.total),
        items: updated.items.map((it) => ({
          ...it,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          discountPct: it.discountPct ? Number(it.discountPct) : null,
          lineTotal: Number(it.lineTotal)
        }))
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cotizacion" }, { status: 400 });
  }
}
