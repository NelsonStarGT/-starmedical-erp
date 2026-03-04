import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";
import { importExcelViaProcessingService } from "@/lib/processing-service/excel";

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
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file as any).arrayBuffer) return NextResponse.json({ error: "Archivo requerido (field: file)" }, { status: 400 });
    const buffer = Buffer.from(await (file as any).arrayBuffer()) as Buffer;
    const parsed = await importExcelViaProcessingService({
      context: {
        tenantId: scope.tenantId,
        actorId: `inventory-${auth.role || "admin"}`
      },
      fileBuffer: buffer,
      template: "generic",
      limits: {
        maxFileMb: 8,
        maxRows: 20_000,
        maxCols: 180,
        timeoutMs: 20_000
      }
    });
    const payload = ((parsed.artifactJson || {}) as { rows?: Record<string, unknown>[]; columns?: unknown[] }) || {};
    const columns = Array.isArray(payload.columns)
      ? payload.columns.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    if (!columns.length) return NextResponse.json({ error: "Hoja vacía" }, { status: 400 });

    const normalizedColumns = columns.map((column) => ({ raw: column, key: column.toLowerCase() }));
    const codeColumn = normalizedColumns.find((column) => column.key === "código" || column.key === "codigo")?.raw;
    const typeColumn = normalizedColumns.find((column) => column.key === "tipo")?.raw;
    const listCols = columns.filter(
      (column) => !["código", "codigo", "nombre", "tipo"].includes(column.toLowerCase())
    );

    const priceLists = await prisma.priceList.findMany({ where: inventoryWhere(scope, {}) });
    const listMap = listCols.reduce<Record<string, string>>((acc, title) => {
      const match = priceLists.find((list) => list.name === title || list.id === title);
      if (match) acc[title] = match.id;
      return acc;
    }, {});

    const changes: Array<{ priceListId: string; itemType: string; itemCode: string; price: number }> = [];
    rows.forEach((row) => {
      const code = codeColumn ? String(row[codeColumn] || "").trim() : "";
      const type = typeColumn ? String(row[typeColumn] || "").trim().toUpperCase() : null;
      const itemType = normalizeItemType(type);
      if (!code) return;
      Object.entries(listMap).forEach(([column, priceListId]) => {
        const valueRaw = row[column];
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
        const map = await resolveIds(scope.tenantId, type, arr);
        Object.assign(idMap, map);
      })
    );

    for (const change of changes) {
      const itemId = idMap[change.itemCode] || idMap[change.itemCode.toUpperCase()] || idMap[change.itemCode.toLowerCase()];
      if (!itemId) continue;
      const existing = await prisma.priceListItem.findFirst({
        where: inventoryWhere(scope, { priceListId: change.priceListId, itemType: change.itemType, itemId })
      });
      if (existing) {
        await prisma.priceListItem.update({ where: { id: existing.id }, data: { precio: change.price } });
      } else {
        await prisma.priceListItem.create({
          data: inventoryCreateData(scope, {
            priceListId: change.priceListId,
            itemType: change.itemType,
            itemId,
            precio: change.price,
            ivaIncluded: true
          } as any)
        });
      }
    }

    return NextResponse.json({ imported: changes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo importar" }, { status: 400 });
  }
}

async function resolveIds(tenantId: string, itemType: string, codes: string[]) {
  if (codes.length === 0) return {};
  if (itemType === "SERVICE") {
    const services = await prisma.service.findMany({
      where: { tenantId, deletedAt: null, OR: [{ code: { in: codes } }, { id: { in: codes } }] },
      select: { id: true, code: true }
    });
    const map: Record<string, string> = {};
    services.forEach((s) => {
      if (s.code) map[s.code] = s.id;
      map[s.id] = s.id;
    });
    return map;
  }
  if (itemType === "COMBO") {
    const combos = await prisma.combo.findMany({
      where: { tenantId, deletedAt: null, id: { in: codes } },
      select: { id: true }
    });
    const map: Record<string, string> = {};
    combos.forEach((c) => {
      map[c.id] = c.id;
    });
    return map;
  }
  const products = await prisma.product.findMany({
    where: { tenantId, deletedAt: null, OR: [{ code: { in: codes } }, { id: { in: codes } }] },
    select: { id: true, code: true }
  });
  const map: Record<string, string> = {};
  products.forEach((p) => {
    map[p.code] = p.id;
    map[p.id] = p.id;
  });
  return map;
}
