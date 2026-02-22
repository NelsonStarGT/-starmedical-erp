import { Prisma, QuoteStatus } from "@prisma/client";

export type ItemInput = {
  category: string;
  productName: string;
  enlace?: string | null;
  refCode?: string | null;
  description?: string | null;
  qty: number;
  unitPrice: number;
  discountPct?: number | null;
};

export function normalizeItems(raw: any[]): ItemInput[] {
  if (!Array.isArray(raw) || !raw.length) throw new Error("items requeridos");
  return raw.map((it, idx) => {
    const category = String(it.category || "").trim();
    const productName = String(it.productName || "").trim();
    if (!category) throw new Error(`category requerido en fila ${idx + 1}`);
    if (!productName) throw new Error(`productName requerido en fila ${idx + 1}`);
    const qty = Number(it.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`qty inválido en fila ${idx + 1}`);
    const unitPrice = Number(it.unitPrice || 0);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`unitPrice inválido en fila ${idx + 1}`);
    const discountPct = it.discountPct !== undefined ? Number(it.discountPct || 0) : 0;
    return {
      category,
      productName,
      enlace: it.enlace ? String(it.enlace) : null,
      refCode: it.refCode ? String(it.refCode) : null,
      description: it.description ? String(it.description) : null,
      qty,
      unitPrice,
      discountPct
    };
  });
}

export function computeTotals(items: ItemInput[]) {
  let subtotal = 0;
  let discountTotal = 0;
  for (const it of items) {
    const lineSubtotal = it.qty * it.unitPrice;
    const lineDiscount = lineSubtotal * ((it.discountPct || 0) / 100);
    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
  }
  const taxTotal = 0;
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}

export function mapQuoteResponse<T extends Prisma.QuoteGetPayload<{ include: { items: true } }>>(quote: T) {
  return {
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
  };
}

export async function recalcDealAmount(tx: Prisma.TransactionClient, dealId: string) {
  const v2 = await tx.quote.findFirst({
    where: { dealId, status: QuoteStatus.APPROVED, isActive: true, type: "B2B" as any },
    orderBy: { approvedAt: "desc" },
    select: { total: true }
  });
  const legacy = await tx.crmQuote.findFirst({
    where: { dealId, status: "APPROVED", isActive: true },
    orderBy: { approvedAt: "desc" },
    select: { totalAmount: true }
  });
  const amount = v2?.total ?? legacy?.totalAmount ?? new Prisma.Decimal(0);
  await tx.crmDeal.update({
    where: { id: dealId },
    data: { amount, amountEstimated: amount }
  });
  return amount;
}

export async function nextQuoteNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const count = await tx.quote.count({
    where: { issuedAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59.999Z`) } }
  });
  const seq = count + 1;
  return `${String(seq).padStart(3, "0")}-${year}`;
}
