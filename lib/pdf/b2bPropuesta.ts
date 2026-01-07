import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { QuoteStatus, QuoteType, Prisma } from "@prisma/client";

type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: {
    items: true;
    template: true;
    deal: { include: { account: true; contact: true } };
  };
}>;

const MARGIN_LEFT = 55;
const MARGIN_RIGHT = 55;
const MARGIN_TOP = 85;
const MARGIN_BOTTOM = 65;

function toNumber(value: any) {
  return Number(value || 0);
}

function formatCurrency(amount?: number | null, currency = "GTQ") {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency, maximumFractionDigits: 2 }).format(toNumber(amount));
}

function stripHtml(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadImageBytes(url?: string | null) {
  if (!url) return null;
  try {
    if (url.startsWith("http")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return new Uint8Array(arr);
    }
    const filePath = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
    return await fs.promises.readFile(filePath);
  } catch {
    return null;
  }
}

function drawLetterhead(page: any, letterheadImage?: any) {
  if (!letterheadImage) return;
  const { width, height } = page.getSize();
  page.drawImage(letterheadImage, { x: 0, y: 0, width, height });
}

function drawWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, font: any, size: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth) {
      page.drawText(line, { x, y: cursorY, size, font });
      cursorY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cursorY, size, font });
    cursorY -= lineHeight;
  }
  return cursorY;
}

async function embedCached(doc: PDFDocument, cache: Map<string, any>, url?: string | null) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  const bytes = await loadImageBytes(url);
  if (!bytes) return null;
  const image = url.toLowerCase().endsWith(".png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  cache.set(url, image);
  return image;
}

function drawTableWithPagination(
  doc: PDFDocument,
  page: any,
  font: any,
  fontBold: any,
  items: QuoteWithRelations["items"],
  startY: number,
  letterhead: any
) {
  const headers = ["Producto", "Enlace", "Cantidad", "Precio", "Desc", "Subtotal"];
  const colWidths = [180, 90, 60, 70, 50, 80];
  let y = startY;
  let currentPage = page;

  const drawHeader = () => {
    let x = MARGIN_LEFT;
    headers.forEach((h, idx) => {
      currentPage.drawText(h, { x, y, size: 10, font: fontBold });
      x += colWidths[idx];
    });
    y -= 16;
  };

  drawHeader();
  const pageHeight = currentPage.getSize().height;
  const minY = MARGIN_BOTTOM + 40;

  for (const item of items) {
    const rowHeight = 14;
    if (y < minY) {
      currentPage = doc.addPage();
      drawLetterhead(currentPage, letterhead);
      y = pageHeight - MARGIN_TOP;
      drawHeader();
    }
    let x = MARGIN_LEFT;
    const values = [
      item.productName || "",
      item.enlace || item.refCode || "-",
      `${toNumber(item.qty)}`,
      formatCurrency(toNumber(item.unitPrice), "GTQ"),
      `${item.discountPct ? toNumber(item.discountPct) : 0}%`,
      formatCurrency(toNumber(item.lineTotal), "GTQ")
    ];
    values.forEach((val, idx) => {
      currentPage.drawText(val, { x, y, size: 10, font });
      x += colWidths[idx];
    });
    y -= rowHeight;
  }

  return { page: currentPage, cursorY: y };
}

function computeTotals(quote: QuoteWithRelations) {
  return {
    subtotal: toNumber(quote.subtotal) || quote.items.reduce((acc, it) => acc + toNumber(it.lineTotal), 0),
    discountTotal: toNumber(quote.discountTotal),
    taxTotal: toNumber(quote.taxTotal),
    total: toNumber(quote.total)
  };
}

export async function generateB2BPropuestaPdf(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      items: true,
      template: true,
      deal: { include: { account: true, contact: true } }
    }
  });
  if (!quote) throw new Error("Cotización no encontrada");
  if (quote.type !== QuoteType.B2B) throw new Error("Solo disponible para B2B");
  const settings = (await prisma.quoteSettings.findUnique({ where: { id: 1 }, include: { defaultTemplateB2B: true } })) || null;
  const template = quote.template || settings?.defaultTemplateB2B;
  if (!template) throw new Error("Template B2B no configurado");

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const imageCache = new Map<string, any>();

  const coverImage = await embedCached(doc, imageCache, template.coverImageUrl || settings?.defaultTemplateB2B?.coverImageUrl);
  const letterheadImage = await embedCached(
    doc,
    imageCache,
    (template.headerJson as any)?.letterheadUrl || (settings?.defaultFooterJson as any)?.letterheadUrl
  );
  const logos: Array<{ name?: string; logoUrl?: string }> = Array.isArray(template.experienceLogosJson)
    ? (template.experienceLogosJson as any)
    : [];

  // Page 1: Cover
  const coverPage = doc.addPage();
  const { width: pageWidth, height: pageHeight } = coverPage.getSize();
  if (coverImage) {
    coverPage.drawImage(coverImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  }

  const startNewPage = () => {
    const p = doc.addPage();
    drawLetterhead(p, letterheadImage);
    return p;
  };

  // Page 2: Carta de introducción
  let page2 = startNewPage();
  let cursorY = pageHeight - MARGIN_TOP;
  const clientName =
    quote.deal.account?.name || `${quote.deal.contact?.firstName || ""} ${quote.deal.contact?.lastName || ""}`.trim() || "Cliente";
  const introTemplate =
    stripHtml(template.introLetterHtml) ||
    stripHtml(settings?.defaultIntroLetterHtml) ||
    "Estimado cliente, adjuntamos la propuesta comercial.";
  const introText = introTemplate
    .replace(/{{\s*clientName\s*}}/gi, clientName)
    .replace(/{{\s*services\s*}}/gi, (quote.deal.servicesOtherNote || "servicios solicitados").toString())
    .replace(/{{\s*quoteNumber\s*}}/gi, quote.number || "");
  page2.drawText(new Date().toLocaleDateString("es-GT"), { x: MARGIN_LEFT, y: cursorY, size: 10, font });
  cursorY -= 20;
  cursorY = drawWrappedText(page2, `Estimado/a ${clientName},`, MARGIN_LEFT, cursorY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, fontBold, 12, 16);
  cursorY -= 6;
  cursorY = drawWrappedText(page2, introText, MARGIN_LEFT, cursorY, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, font, 11, 15);

  // Page 3: Logos experiencia
  let page3 = startNewPage();
  let yLogos = pageHeight - MARGIN_TOP;
  const colCount = 4;
  const cellWidth = (pageWidth - MARGIN_LEFT - MARGIN_RIGHT) / colCount;
  const cellHeight = 70;
  for (let i = 0; i < logos.length; i++) {
    if (yLogos - cellHeight < MARGIN_BOTTOM) {
      page3 = startNewPage();
      yLogos = pageHeight - MARGIN_TOP;
    }
    const row = Math.floor(i / colCount);
    const col = i % colCount;
    const x = MARGIN_LEFT + col * cellWidth + 8;
    const y = yLogos - row * cellHeight;
    const logo = logos[i];
    if (logo?.logoUrl) {
      const img = await embedCached(doc, imageCache, logo.logoUrl);
      if (img) {
        const imgDims = img.scale(1);
        const maxW = cellWidth - 16;
        const maxH = cellHeight - 20;
        const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height, 1);
        const w = imgDims.width * scale;
        const h = imgDims.height * scale;
        page3.drawImage(img, { x: x + (maxW - w) / 2, y: y - h + 10, width: w, height: h });
      }
    }
  }

  // Page 4: Cotización
  let page4 = startNewPage();
  let y = pageHeight - MARGIN_TOP;
  page4.drawText("Datos del cliente", { x: MARGIN_LEFT, y, size: 12, font: fontBold });
  y -= 16;
  const lines = [
    `Nombre: ${clientName}`,
    `NIT/CUI: ${quote.deal.account?.nit || "C/F"}`,
    `Dirección: ${quote.deal.account?.address || "-"}`,
    `Contacto: ${quote.deal.contact?.firstName || ""} ${quote.deal.contact?.lastName || ""}`,
    `Email: ${quote.deal.contact?.email || "-"}`,
    `Teléfono: ${quote.deal.contact?.phone || "-"}`
  ];
  lines.forEach((line) => {
    page4.drawText(line, { x: MARGIN_LEFT, y, size: 10, font });
    y -= 14;
  });
  y -= 6;
  const tableResult = drawTableWithPagination(doc, page4, font, fontBold, quote.items, y, letterheadImage);
  let tablePage = tableResult.page;
  let tableY = tableResult.cursorY;
  const totals = computeTotals(quote);
  const totalLabelY = tableY - 12;
  tablePage.drawText(`Subtotal: ${formatCurrency(totals.subtotal, quote.currency)}`, {
    x: pageWidth - MARGIN_RIGHT - 180,
    y: totalLabelY,
    size: 11,
    font: fontBold
  });
  tablePage.drawText(`Descuento: ${formatCurrency(totals.discountTotal, quote.currency)}`, {
    x: pageWidth - MARGIN_RIGHT - 180,
    y: totalLabelY - 14,
    size: 11,
    font: fontBold
  });
  tablePage.drawText(`Total: ${formatCurrency(totals.total, quote.currency)}`, {
    x: pageWidth - MARGIN_RIGHT - 180,
    y: totalLabelY - 28,
    size: 12,
    font: fontBold
  });

  // Page 5: Términos y bancos
  let page5 = startNewPage();
  let yTerms = pageHeight - MARGIN_TOP;
  page5.drawText("Términos y condiciones", { x: MARGIN_LEFT, y: yTerms, size: 12, font: fontBold });
  yTerms -= 18;
  const terms = stripHtml(template.termsHtml || settings?.defaultTermsB2BHtml || "Términos disponibles bajo solicitud.");
  const drawLongText = (text: string) => {
    const paragraphs = text.split(/\n\s*\n/);
    let currentPage = page5;
    let cursor = yTerms;
    for (const para of paragraphs) {
      const lines = para.split("\n");
      for (const line of lines) {
        if (cursor < MARGIN_BOTTOM + 40) {
          currentPage = startNewPage();
          cursor = pageHeight - MARGIN_TOP;
        }
        cursor = drawWrappedText(currentPage, line, MARGIN_LEFT, cursor, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, font, 10, 14);
      }
      cursor -= 8;
    }
    return { cursor, currentPage };
  };
  const termResult = drawLongText(terms);
  let cursorBanks = termResult.cursor;
  let banksPage = termResult.currentPage;

  const bankBlockEnabled = settings?.showBankBlock !== false;
  const banks: any[] =
    (template.bankAccountsJson as any) ||
    (settings?.defaultBankAccountsJson as any) ||
    (settings?.defaultTemplateB2B?.bankAccountsJson as any) ||
    [];
  if (bankBlockEnabled && banks.length) {
    if (cursorBanks < MARGIN_BOTTOM + 80) {
      banksPage = startNewPage();
      cursorBanks = pageHeight - MARGIN_TOP;
    }
    banksPage.drawText("Datos bancarios", { x: MARGIN_LEFT, y: cursorBanks, size: 12, font: fontBold });
    cursorBanks -= 16;
    banks.forEach((bank) => {
      const line = `${bank.bank || bank.bankName || ""} · ${bank.accountNumber || ""} · ${bank.accountName || ""} (${bank.currency || ""})`;
      cursorBanks = drawWrappedText(banksPage, line.trim(), MARGIN_LEFT, cursorBanks, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, font, 10, 14);
    });
    if (settings?.defaultChequePayableTo) {
      banksPage.drawText(`Emitir cheques a nombre de: ${settings.defaultChequePayableTo}`, {
        x: MARGIN_LEFT,
        y: cursorBanks - 10,
        size: 10,
        font
      });
    }
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
