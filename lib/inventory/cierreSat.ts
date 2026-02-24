import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

type Params = { dateFrom: Date; dateTo: Date; branchId?: string | null };

export type CierreSatRow = {
  productId: string;
  code: string;
  name: string;
  unit?: string | null;
  saldoInicial: number;
  entradas: number;
  salidas: number;
  ajustes: number;
  saldoFinal: number;
  avgCost?: number;
  valorInicial?: number;
  valorFinal?: number;
};

export async function calculateCierreSat({ dateFrom, dateTo, branchId }: Params) {
  const start = startOfDay(dateFrom);
  const end = endOfDay(dateTo);

  const baseWhere: any = {
    createdAt: { lt: end }
  };
  if (branchId) baseWhere.branchId = branchId;

  const [beforeEntries, beforeExits, beforeAdjust, rangeEntries, rangeExits, rangeAdjust] = await Promise.all([
    groupByType("ENTRY", { ...baseWhere, createdAt: { lt: start } }),
    groupByType("EXIT", { ...baseWhere, createdAt: { lt: start } }),
    groupByType("ADJUSTMENT", { ...baseWhere, createdAt: { lt: start } }),
    groupByType("ENTRY", { ...baseWhere, createdAt: { gte: start, lte: end } }),
    groupByType("EXIT", { ...baseWhere, createdAt: { gte: start, lte: end } }),
    groupByType("ADJUSTMENT", { ...baseWhere, createdAt: { gte: start, lte: end } })
  ]);

  const productIds = new Set<string>();
  [beforeEntries, beforeExits, beforeAdjust, rangeEntries, rangeExits, rangeAdjust].forEach((group) => {
    group.forEach((g) => productIds.add(g.productId));
  });

  if (productIds.size === 0) {
    return { rows: [] as CierreSatRow[], totals: buildTotals([], []), range: { dateFrom: start, dateTo: end } };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(productIds) } },
    select: { id: true, name: true, code: true, unit: true, avgCost: true }
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const rows: CierreSatRow[] = [];

  productIds.forEach((productId) => {
    const saldoInicial =
      (sumFor(productId, beforeEntries) || 0) - (sumFor(productId, beforeExits) || 0) + (sumFor(productId, beforeAdjust) || 0);
    const entradas = sumFor(productId, rangeEntries) || 0;
    const salidas = Math.abs(sumFor(productId, rangeExits) || 0);
    const ajustes = sumFor(productId, rangeAdjust) || 0;
    const saldoFinal = saldoInicial + entradas - salidas + ajustes;
    const product = productMap.get(productId);
    const avgCost = product?.avgCost ? Number(product.avgCost) : undefined;
    const valorInicial = avgCost !== undefined ? round2((saldoInicial || 0) * (avgCost || 0)) : undefined;
    const valorFinal = avgCost !== undefined ? round2((saldoFinal || 0) * (avgCost || 0)) : undefined;
    rows.push({
      productId,
      code: product?.code || productId,
      name: product?.name || "",
      unit: product?.unit || "",
      saldoInicial,
      entradas,
      salidas,
      ajustes,
      saldoFinal,
      avgCost,
      valorInicial,
      valorFinal
    });
  });

  rows.sort((a, b) => a.code.localeCompare(b.code));
  const totals = buildTotals(rows, rows);

  return { rows, totals, range: { dateFrom: start, dateTo: end } };
}

export async function generateCierreSatXlsx(params: Params) {
  const { rows, range } = await calculateCierreSat(params);
  const headers = [
    "Código",
    "Producto",
    "Unidad",
    "Saldo inicial",
    "Entradas",
    "Salidas",
    "Ajustes",
    "Saldo final",
    "Valor inicial (Q)",
    "Valor final (Q)"
  ];
  const dataRows = rows.map((row) => [
    row.code,
    row.name,
    row.unit || "",
    row.saldoInicial,
    row.entradas,
    row.salidas,
    row.ajustes,
    row.saldoFinal,
    row.valorInicial ?? "",
    row.valorFinal ?? ""
  ]);
  const { buffer } = await exportExcelViaProcessingService({
    context: {
      tenantId: process.env.DEFAULT_TENANT_ID || "global",
      actorId: "inventory-cierre-sat"
    },
    fileName: "cierre-sat.xlsx",
    sheets: [
      {
        name: "Cierre SAT",
        headers,
        rows: [
          [
            `Rango: ${formatDate(range.dateFrom)} a ${formatDate(range.dateTo)}`,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
          ],
          ...dataRows
        ]
      }
    ],
    limits: {
      maxFileMb: 16,
      maxRows: 60_000,
      maxCols: 120,
      timeoutMs: 25_000
    }
  });
  return buffer;
}

export async function generateCierreSatPdf(params: Params) {
  const { rows, range, totals } = await calculateCierreSat(params);
  const doc = await PDFDocument.create();
  let page = doc.addPage();
  const { width, height } = page.getSize();
  const margin = 40;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = height - margin;

  const write = (text: string, options: { x?: number; y?: number; size?: number; font?: any; color?: any }) => {
    const size = options.size || 10;
    page.drawText(text, {
      x: options.x ?? margin,
      y: options.y ?? y,
      size,
      font: options.font || font,
      color: options.color || rgb(0, 0, 0)
    });
  };

  // Encabezado corporativo
  write("StarMedical", { font: fontBold, size: 16 });
  y -= 16;
  write("Km 37.2 Ruta a San Vicente de Pacaya, Palín Escuintla", { size: 10 });
  y -= 12;
  write("Tel: 7729-3636", { size: 10 });
  y -= 18;
  write("Cierre de Inventario (SAT)", { font: fontBold, size: 14 });
  y -= 14;
  write(`Rango: ${formatDate(range.dateFrom)} a ${formatDate(range.dateTo)}`, { size: 10 });
  y -= 14;
  write(`Generado: ${formatDateTime(new Date())}`, { size: 10, color: rgb(0.2, 0.2, 0.2) });
  y -= 16;

  const headers = ["Código", "Producto", "Unidad", "Saldo ini.", "Entradas", "Salidas", "Ajustes", "Saldo fin."];
  const widths = [70, 140, 50, 60, 60, 60, 60, 70];

  const drawHeader = () => {
    let x = margin;
    headers.forEach((h, idx) => {
      page.drawText(h, { x, y, size: 9, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
      x += widths[idx];
    });
    y -= 16;
  };

  drawHeader();

  const drawRow = (row: CierreSatRow) => {
    let x = margin;
    const values = [
      row.code,
      row.name,
      row.unit || "",
      formatNumber(row.saldoInicial),
      formatNumber(row.entradas),
      formatNumber(row.salidas),
      formatNumber(row.ajustes),
      formatNumber(row.saldoFinal)
    ];
    values.forEach((v, idx) => {
      page.drawText(truncate(v, widths[idx] / 5.6), { x, y, size: 9, font, color: rgb(0.05, 0.05, 0.05) });
      x += widths[idx];
    });
    y -= 14;
  };

  rows.forEach((row) => {
    if (y < 80) {
      page = doc.addPage();
      y = page.getSize().height - margin;
      drawHeader();
    }
    drawRow(row);
  });

  if (y < 120) {
    page = doc.addPage();
    y = page.getSize().height - margin;
  }

  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + widths.reduce((a, b) => a + b, 0), y },
    color: rgb(0.8, 0.8, 0.8)
  });
  y -= 14;

  write("Totales", { font: fontBold, size: 11, y });
  y -= 14;
  const summary = [
    `Saldo inicial: ${formatNumber(totals.saldoInicial)}`,
    `Entradas: ${formatNumber(totals.entradas)}`,
    `Salidas: ${formatNumber(totals.salidas)}`,
    `Ajustes: ${formatNumber(totals.ajustes)}`,
    `Saldo final: ${formatNumber(totals.saldoFinal)}`
  ];
  summary.forEach((line) => {
    write(line, { size: 10, y });
    y -= 12;
  });

  const pdfBytes = await doc.save();
  const finalized = await PDFDocument.load(pdfBytes);
  const totalPages = finalized.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = finalized.getPage(i);
    p.drawText(`Página ${i + 1} de ${totalPages}`, {
      x: p.getWidth() - margin - 90,
      y: margin - 10,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });
  }
  const finalBytes = await finalized.save();
  return Buffer.from(finalBytes);
}

async function groupByType(type: string, where: any) {
  return prisma.inventoryMovement.groupBy({
    by: ["productId"],
    where: { ...where, type, quantity: { not: null } },
    _sum: { quantity: true }
  });
}

function sumFor(productId: string, groups: Array<{ productId: string; _sum: { quantity: number | null } }>) {
  return groups.find((g) => g.productId === productId)?._sum.quantity || 0;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function truncate(text: string, maxChars: number) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, Math.floor(maxChars) - 3)) + "...";
}

function formatNumber(value: number) {
  if (value === undefined || value === null) return "0";
  return Number(value).toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildTotals(rows: CierreSatRow[], source: CierreSatRow[]) {
  const totals = { saldoInicial: 0, entradas: 0, salidas: 0, ajustes: 0, saldoFinal: 0, valorInicial: 0, valorFinal: 0 };
  source.forEach((r) => {
    totals.saldoInicial += r.saldoInicial || 0;
    totals.entradas += r.entradas || 0;
    totals.salidas += r.salidas || 0;
    totals.ajustes += r.ajustes || 0;
    totals.saldoFinal += r.saldoFinal || 0;
    totals.valorInicial += r.valorInicial || 0;
    totals.valorFinal += r.valorFinal || 0;
  });
  return totals;
}
