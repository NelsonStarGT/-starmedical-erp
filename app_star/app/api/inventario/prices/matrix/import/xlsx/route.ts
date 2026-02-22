import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeItemType(raw: string | null) {
  if (raw === "SERVICE") return "SERVICE";
  if (raw === "COMBO") return "COMBO";
  return "PRODUCT";
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file as any).arrayBuffer) return NextResponse.json({ error: "Archivo requerido (field: file)" }, { status: 400 });
    const buffer = Buffer.from(await (file as any).arrayBuffer()) as Buffer;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)) as any);
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: "Hoja vacía" }, { status: 400 });

    const header: Record<string, number> = {};
    ws.getRow(1).eachCell((cell, col) => {
      header[(cell.value as string)?.toString().trim()] = col;
    });
    const codeCol = header["Código"] || header["codigo"] || header["codigo"];
    const nameCol = header["Nombre"] || header["nombre"];
    const typeCol = header["Tipo"] || header["tipo"];
    const listCols = Object.entries(header).filter(([key]) => !["Código", "codigo", "Nombre", "nombre", "Tipo", "tipo"].includes(key));

    const priceLists = await prisma.priceList.findMany();
    const listMap = listCols.reduce<Record<number, string>>((acc, [title, col]) => {
      const match = priceLists.find((l) => l.name === title || l.id === title);
      if (match) acc[col] = match.id;
      return acc;
    }, {});

    const changes: Array<{ priceListId: string; itemType: string; itemCode: string; price: number }> = [];
    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      const code = codeCol ? String(row.getCell(codeCol).value || "").trim() : "";
      const type = typeCol ? String(row.getCell(typeCol).value || "").trim().toUpperCase() : null;
      const itemType = normalizeItemType(type);
      if (!code) return;
      Object.entries(listMap).forEach(([colStr, priceListId]) => {
        const col = Number(colStr);
        const valueRaw = row.getCell(col).value;
        const num = Number(valueRaw ?? 0);
        if (!Number.isNaN(num)) {
          changes.push({ priceListId, itemType, itemCode: code, price: num });
        }
      });
    });

    const codesByType: Record<string, Set<string>> = {};
    changes.forEach((c) => {
      if (!codesByType[c.itemType]) codesByType[c.itemType] = new Set();
      codesByType[c.itemType].add(c.itemCode);
    });

    const idMap: Record<string, string> = {};
    await Promise.all(
      Object.entries(codesByType).map(async ([type, codes]) => {
        const arr = Array.from(codes);
        const map = await resolveIds(type, arr);
        Object.assign(idMap, map);
      })
    );

    for (const change of changes) {
      const itemId = idMap[change.itemCode] || idMap[change.itemCode.toUpperCase()] || idMap[change.itemCode.toLowerCase()];
      if (!itemId) continue;
      const existing = await prisma.priceListItem.findFirst({
        where: { priceListId: change.priceListId, itemType: change.itemType, itemId }
      });
      if (existing) {
        await prisma.priceListItem.update({ where: { id: existing.id }, data: { precio: change.price } });
      } else {
        await prisma.priceListItem.create({
          data: { priceListId: change.priceListId, itemType: change.itemType, itemId, precio: change.price, ivaIncluded: true } as any
        });
      }
    }

    return NextResponse.json({ imported: changes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo importar" }, { status: 400 });
  }
}

async function resolveIds(itemType: string, codes: string[]) {
  if (codes.length === 0) return {};
  if (itemType === "SERVICE") {
    const services = await prisma.service.findMany({ where: { OR: [{ code: { in: codes } }, { id: { in: codes } }] }, select: { id: true, code: true } });
    const map: Record<string, string> = {};
    services.forEach((s) => {
      if (s.code) map[s.code] = s.id;
      map[s.id] = s.id;
    });
    return map;
  }
  if (itemType === "COMBO") {
    const combos = await prisma.combo.findMany({ where: { id: { in: codes } }, select: { id: true } });
    const map: Record<string, string> = {};
    combos.forEach((c) => {
      map[c.id] = c.id;
    });
    return map;
  }
  const products = await prisma.product.findMany({ where: { OR: [{ code: { in: codes } }, { id: { in: codes } }] }, select: { id: true, code: true } });
  const map: Record<string, string> = {};
  products.forEach((p) => {
    map[p.code] = p.id;
    map[p.id] = p.id;
  });
  return map;
}
