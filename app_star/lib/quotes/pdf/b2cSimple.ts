import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Prisma, QuoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: { items: true; template: true; deal: { include: { account: true; contact: true } } };
}>;

function toNumber(value: any) {
  return Number(value || 0);
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("es-GT");
}

function formatCurrency(amount?: number | null, currency = "GTQ") {
  const safe = Number(amount || 0);
  return new Intl.NumberFormat("es-GT", { style: "currency", currency, maximumFractionDigits: 2 }).format(safe);
}

function deriveTotals(quote: QuoteWithRelations) {
  const subtotal = toNumber(quote.subtotal);
  if (subtotal > 0) {
    return {
      subtotal,
      discountTotal: toNumber(quote.discountTotal),
      taxTotal: toNumber(quote.taxTotal),
      total: toNumber(quote.total)
    };
  }
  const computedSubtotal = quote.items.reduce((acc, it) => acc + toNumber(it.lineTotal), 0);
  return {
    subtotal: computedSubtotal,
    discountTotal: toNumber(quote.discountTotal),
    taxTotal: toNumber(quote.taxTotal),
    total: computedSubtotal - toNumber(quote.discountTotal) + toNumber(quote.taxTotal)
  };
}

function drawTextLine(page: any, font: any, text: string, x: number, y: number, size = 10, options: { fontAlt?: any; color?: any } = {}) {
  page.drawText(text, {
    x,
    y,
    size,
    font: options.fontAlt || font,
    color: options.color || rgb(0, 0, 0)
  });
}

function addHeader(page: any, font: any, fontBold: any, margin: number, width: number, quote: QuoteWithRelations) {
  const header = (quote.template?.headerJson as any) || {};
  const company = header.companyName || "StarMedical";
  const address = header.address || "Guatemala";
  const phone = header.phone || "";
  const email = header.email || "";
  const topY = page.getSize().height - margin;

  drawTextLine(page, fontBold, company, margin, topY, 14, { fontAlt: fontBold });
  drawTextLine(page, font, address, margin, topY - 14, 10);
  if (phone) drawTextLine(page, font, `Tel: ${phone}`, margin, topY - 26, 10);
  if (email) drawTextLine(page, font, `Email: ${email}`, margin, topY - 38, 10);

  const noLabel = `Cotización No.: ${quote.number}`;
  const dateLabel = `Fecha: ${formatDate(quote.issuedAt)}`;
  const rightX = width - margin - Math.max(noLabel.length, dateLabel.length) * 5;
  drawTextLine(page, fontBold, noLabel, rightX, topY, 11, { fontAlt: fontBold });
  drawTextLine(page, font, dateLabel, rightX, topY - 14, 10);

  return topY - 50;
}

function addClientBlock(page: any, font: any, fontBold: any, x: number, y: number, quote: QuoteWithRelations) {
  const clientName = quote.deal.account?.name || `${quote.deal.contact?.firstName || ""} ${quote.deal.contact?.lastName || ""}`.trim() || "Cliente";
  const nit = quote.deal.account?.nit || "C/F";
  const address = quote.deal.account?.address || "-";
  const phone = (quote.deal.contact as any)?.phone || (quote.deal.account as any)?.phone || "-";
  const email = quote.deal.contact?.email || (quote.deal.account as any)?.email || "-";
  const seller = quote.createdById || "Ventas";

  drawTextLine(page, fontBold, "Cliente", x, y, 11, { fontAlt: fontBold });
  drawTextLine(page, font, `Nombre: ${clientName}`, x, y - 14);
  drawTextLine(page, font, `NIT/CUI: ${nit}`, x, y - 28);
  drawTextLine(page, font, `Dirección: ${address}`, x, y - 42);
  drawTextLine(page, font, `Teléfono: ${phone}`, x, y - 56);
  drawTextLine(page, font, `Email: ${email}`, x, y - 70);
  drawTextLine(page, font, `Vendedor: ${seller}`, x, y - 84);
  return y - 96;
}

function addValidity(page: any, font: any, x: number, y: number, quote: QuoteWithRelations) {
  drawTextLine(page, font, `Validez de oferta: ${quote.validityDays || 0} días`, x, y, 10);
  return y - 16;
}

function addItemsTable(doc: PDFDocument, page: any, font: any, fontBold: any, x: number, y: number, quote: QuoteWithRelations) {
  const headers = ["Producto", "Enlace", "Cantidad", "Precio", "Sub-Total"];
  const colWidths = [170, 110, 60, 70, 80];
  let cursorY = y;
  let pageRef = page;

  const drawHeader = () => {
    let xPos = x;
    headers.forEach((h, idx) => {
      drawTextLine(pageRef, fontBold, h, xPos, cursorY, 10);
      xPos += colWidths[idx];
    });
    cursorY -= 14;
  };

  const drawRow = (values: string[]) => {
    let xPos = x;
    values.forEach((val, idx) => {
      drawTextLine(pageRef, font, val, xPos, cursorY, 10);
      xPos += colWidths[idx];
    });
    cursorY -= 14;
  };

  drawHeader();
  const { height } = pageRef.getSize();
  const minY = 80;
  for (const item of quote.items) {
    if (cursorY < minY) {
      pageRef = doc.addPage();
      cursorY = height - 60;
      drawHeader();
    }
    const values = [
      item.productName,
      item.enlace || item.refCode || "-",
      `${toNumber(item.qty)}`,
      formatCurrency(toNumber(item.unitPrice), quote.currency),
      formatCurrency(toNumber(item.lineTotal), quote.currency)
    ];
    drawRow(values);
  }

  return { page: pageRef, cursorY };
}

function addTotals(
  page: any,
  font: any,
  fontBold: any,
  x: number,
  y: number,
  totals: { subtotal: number; discountTotal: number; taxTotal: number; total: number },
  currency: string
) {
  drawTextLine(page, fontBold, `Total: ${formatCurrency(totals.total, currency)}`, x, y, 12);
  return y - 18;
}

function addNotesAndConditions(
  page: any,
  font: any,
  x: number,
  y: number,
  quote: QuoteWithRelations,
  pricesIncludeTax: boolean
) {
  const nextY = y;
  drawTextLine(page, font, "Observaciones:", x, nextY, 10);
  const notes = quote.notes || "-";
  drawTextLine(page, font, notes, x, nextY - 14, 10);

  let cursor = nextY - 30;
  drawTextLine(page, font, "Condiciones comerciales:", x, cursor, 10);
  cursor -= 14;
  if (quote.paymentTerms) {
    drawTextLine(page, font, `Forma de pago: ${quote.paymentTerms}`, x, cursor, 10);
    cursor -= 14;
  }
  if (quote.deliveryTime) {
    drawTextLine(page, font, `Tiempo de entrega: ${quote.deliveryTime}`, x, cursor, 10);
    cursor -= 14;
  }
  if (quote.deliveryNote) {
    drawTextLine(page, font, `Nota de entrega: ${quote.deliveryNote}`, x, cursor, 10);
    cursor -= 14;
  }
  if (pricesIncludeTax) {
    drawTextLine(page, font, "Todos los precios incluyen IVA.", x, cursor, 10);
    cursor -= 14;
  }
  return cursor;
}

function addBanks(
  page: any,
  font: any,
  fontBold: any,
  x: number,
  y: number,
  bankAccounts: any[],
  chequePayableTo?: string | null
) {
  if (!bankAccounts?.length) return y;
  drawTextLine(page, fontBold, "Cuentas bancarias", x, y, 11);
  let cursor = y - 14;
  for (const bank of bankAccounts) {
    const line = `${bank.bank || bank.bankName || ""} · ${bank.accountNumber || ""} · ${bank.accountName || ""} (${bank.currency || ""})`;
    drawTextLine(page, font, line.trim(), x, cursor, 10);
    cursor -= 12;
  }
  if (chequePayableTo) {
    drawTextLine(page, font, `Emitir cheques a nombre de: ${chequePayableTo}`, x, cursor - 6, 10);
    cursor -= 18;
  }
  return cursor;
}

export async function generateB2CSimplePdf(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: true,
      template: true,
      deal: { include: { account: true, contact: true } }
    }
  });
  if (!quote) throw new Error("Cotizacion no encontrada");
  if (quote.type !== QuoteType.B2C) throw new Error("Solo aplica para cotizaciones B2C");

  const settings = await prisma.quoteSettings.findUnique({ where: { id: 1 } });
  const bankAccounts =
    (quote.template?.bankAccountsJson as any) ||
    (settings?.defaultBankAccountsJson as any) ||
    [];

  const pricesIncludeTax = quote.pricesIncludeTax ?? settings?.showTaxIncludedText ?? true;
  const chequePayableTo = quote.chequePayableTo || settings?.defaultChequePayableTo || null;

  quote.paymentTerms = quote.paymentTerms || settings?.defaultPaymentTerms || null;
  quote.deliveryTime = quote.deliveryTime || settings?.defaultDeliveryTime || null;
  quote.deliveryNote = quote.deliveryNote || settings?.defaultDeliveryNote || null;
  quote.notes = quote.notes || (quote.template?.termsHtml as string | undefined) || settings?.defaultTermsB2CHtml || "";

  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 40;

  let cursorY = addHeader(page, font, fontBold, margin, width, quote);
  cursorY = addClientBlock(page, font, fontBold, margin, cursorY, quote);
  cursorY = addValidity(page, font, margin, cursorY, quote);

  const itemsResult = addItemsTable(doc, page, font, fontBold, margin, cursorY, quote);
  const totals = deriveTotals(quote);
  cursorY = addTotals(itemsResult.page, font, fontBold, margin, itemsResult.cursorY - 6, totals, quote.currency);
  cursorY = addNotesAndConditions(itemsResult.page, font, margin, cursorY, quote, pricesIncludeTax);
  cursorY = addBanks(itemsResult.page, font, fontBold, margin, cursorY - 6, bankAccounts, chequePayableTo);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
