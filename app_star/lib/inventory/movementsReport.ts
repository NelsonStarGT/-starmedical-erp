import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { MovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Filters = {
  dateFrom: Date;
  dateTo: Date;
  branchId?: string;
  type?: MovementType;
  productId?: string;
  createdById?: string;
};

type ReportOptions = Filters & {
  generatedBy?: string;
};

const REPORT_META = {
  companyName: "StarMedical",
  address: "Km 37.2 Ruta a San Vicente de Pacaya, Palín Escuintla",
  phone: "7729-3636",
  title: "Reporte de Movimientos de Inventario"
};

export async function fetchMovements(filters: Filters) {
  const where: Prisma.InventoryMovementWhereInput = {
    createdAt: { gte: filters.dateFrom, lte: filters.dateTo }
  };
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.type) where.type = filters.type;
  if (filters.productId) where.productId = filters.productId;
  if (filters.createdById) where.createdById = filters.createdById;

  const data = await prisma.inventoryMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" }
  });

  return data;
}

export async function generateMovementsPdf(filters: ReportOptions) {
  const movements = await fetchMovements(filters);
  const doc = await PDFDocument.create();
  let page = doc.addPage();
  const { height } = page.getSize();
  const margin = 40;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let cursorY = height - margin;

  const write = (text: string, options: { x?: number; y?: number; size?: number; font?: any; color?: any }) => {
    const size = options.size || 10;
    page.drawText(text, {
      x: options.x ?? margin,
      y: options.y ?? cursorY,
      size,
      font: options.font || font,
      color: options.color || rgb(0, 0, 0)
    });
  };

  write(REPORT_META.companyName, { font: fontBold, size: 14 });
  cursorY -= 16;
  write(REPORT_META.address, { size: 10 });
  cursorY -= 12;
  write(`Tel: ${REPORT_META.phone}`, { size: 10 });
  cursorY -= 18;
  write(REPORT_META.title, { font: fontBold, size: 12 });
  cursorY -= 14;
  write(`Rango: ${formatDate(filters.dateFrom)} a ${formatDate(filters.dateTo)}`, { size: 10 });
  cursorY -= 12;
  if (filters.branchId) {
    write(`Sucursal: ${filters.branchId}`, { size: 10 });
    cursorY -= 12;
  }
  write(`Generado: ${formatDateTime(new Date())}${filters.generatedBy ? ` · Usuario: ${filters.generatedBy}` : ""}`, { size: 9, color: rgb(0.2, 0.2, 0.2) });
  cursorY -= 20;

  const headers = ["Fecha/Hora", "Producto", "Tipo", "Cantidad", "Sucursal", "Referencia / Motivo", "Usuario"];
  const colWidths = [90, 140, 60, 60, 70, 130, 70];

  drawTableHeader(page, fontBold, headers, colWidths, margin, cursorY);
  cursorY -= 18;

  const totals = {
    entries: 0,
    exits: 0,
    adjustments: 0,
    movements: movements.length
  };

  for (const mov of movements) {
    const signedQty = movementDelta(mov.type as MovementType, mov.quantity ?? 0);
    if (mov.type === "ENTRY") totals.entries += signedQty;
    if (mov.type === "EXIT") totals.exits += Math.abs(signedQty);
    if (mov.type === "ADJUSTMENT") totals.adjustments += signedQty;

    const row = [
      formatDateTime(mov.createdAt),
      `${(mov.product as any)?.code || mov.productId} - ${mov.product?.name || ""}`,
      mov.type,
      `${signedQty}`,
      mov.branchId,
      `${mov.reference || ""} ${mov.reason ? " / " + mov.reason : ""}`.trim(),
      mov.createdById
    ];

    if (cursorY < 80) {
      cursorY = height - margin;
      page = doc.addPage();
      drawTableHeader(page, fontBold, headers, colWidths, margin, cursorY);
      cursorY -= 18;
    }

    drawRow(page, font, row, colWidths, margin, cursorY);
    cursorY -= 16;
  }

  cursorY -= 12;
  drawSummary(page, fontBold, font, totals, margin, cursorY);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

function drawTableHeader(page: any, font: any, headers: string[], widths: number[], margin: number, y: number) {
  let x = margin;
  headers.forEach((h, idx) => {
    page.drawText(h, { x, y, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
    x += widths[idx];
  });
  page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: margin + widths.reduce((a, b) => a + b, 0), y: y - 2 }, color: rgb(0.7, 0.7, 0.7) });
}

function drawRow(page: any, font: any, values: string[], widths: number[], margin: number, y: number) {
  let x = margin;
  values.forEach((v, idx) => {
    const text = truncate(v, widths[idx] / 5.5);
    page.drawText(text, { x, y, size: 9, font, color: rgb(0.05, 0.05, 0.05) });
    x += widths[idx];
  });
}

function drawSummary(page: any, fontBold: any, font: any, totals: { entries: number; exits: number; adjustments: number; movements: number }, margin: number, y: number) {
  const summary = [
    `Total entradas: ${totals.entries}`,
    `Total salidas: ${totals.exits}`,
    `Total ajustes: ${totals.adjustments}`,
    `Total movimientos: ${totals.movements}`
  ];
  page.drawText("Resumen", { x: margin, y, size: 10, font: fontBold });
  summary.forEach((line, idx) => {
    page.drawText(line, { x: margin + 10, y: y - 14 - idx * 12, size: 9, font });
  });
}

function movementDelta(type: MovementType, quantity: number) {
  if (type === "EXIT") return -Math.abs(quantity);
  if (type === "ADJUSTMENT") return quantity;
  return Math.abs(quantity);
}

function truncate(text: string, maxChars: number) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + "...";
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTime(date: Date) {
  const d = formatDate(date);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${d} ${h}:${m}`;
}
