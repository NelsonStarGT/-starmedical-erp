import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

type InventorySearchItem = {
  id: string;
  sku: string | null;
  name: string;
  unit: string | null;
  unitPrice: number | null;
};

const FALLBACK_ITEMS: InventorySearchItem[] = [
  { id: "inv-001", sku: "INS-GLV-PAR", name: "Guantes estériles", unit: "par", unitPrice: 8.5 },
  { id: "inv-002", sku: "INS-GASA-EST", name: "Gasa estéril", unit: "unidad", unitPrice: 1.75 },
  { id: "inv-003", sku: "INS-TOR-ALG", name: "Torunda de algodón", unit: "unidad", unitPrice: 0.6 },
  { id: "inv-004", sku: "INS-JER-5ML", name: "Jeringa 5 ml", unit: "unidad", unitPrice: 2.25 },
  { id: "inv-005", sku: "INS-JER-10ML", name: "Jeringa 10 ml", unit: "unidad", unitPrice: 2.95 },
  { id: "inv-006", sku: "INS-AGU-21G", name: "Aguja 21G", unit: "unidad", unitPrice: 1.1 },
  { id: "inv-007", sku: "INS-AGU-23G", name: "Aguja 23G", unit: "unidad", unitPrice: 1.1 },
  { id: "inv-008", sku: "INS-MASC-QUI", name: "Mascarilla quirúrgica", unit: "unidad", unitPrice: 1.5 },
  { id: "inv-009", sku: "INS-ALCO-70", name: "Alcohol 70%", unit: "ml", unitPrice: 0.12 },
  { id: "inv-010", sku: "INS-GEL-ANT", name: "Gel antiséptico", unit: "ml", unitPrice: 0.18 },
  { id: "inv-011", sku: "INS-CINT-MIC", name: "Cinta micropore", unit: "rollo", unitPrice: 12 },
  { id: "inv-012", sku: "INS-VEN-ELA", name: "Venda elástica", unit: "unidad", unitPrice: 9.25 },
  { id: "inv-013", sku: "INS-SUER-500", name: "Suero fisiológico 500 ml", unit: "frasco", unitPrice: 14.5 },
  { id: "inv-014", sku: "INS-LLAVE-3V", name: "Llave de 3 vías", unit: "unidad", unitPrice: 4.75 },
  { id: "inv-015", sku: "INS-CAT-IV", name: "Catéter IV", unit: "unidad", unitPrice: 5.6 },
  { id: "inv-016", sku: "INS-APOS", name: "Apósito adhesivo", unit: "unidad", unitPrice: 2.35 },
  { id: "inv-017", sku: "INS-LANC", name: "Lanceta estéril", unit: "unidad", unitPrice: 0.9 },
  { id: "inv-018", sku: "INS-CUB-BOT", name: "Cubrebotas desechable", unit: "par", unitPrice: 2.8 },
  { id: "inv-019", sku: "INS-CUB-CAB", name: "Gorro desechable", unit: "unidad", unitPrice: 1.4 },
  { id: "inv-020", sku: "INS-GASA-ROL", name: "Rollo de gasa", unit: "rollo", unitPrice: 16.2 }
];

function toNumber(value: Prisma.Decimal | string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function filterFallbackItems(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return FALLBACK_ITEMS.slice(0, 20);
  return FALLBACK_ITEMS.filter((item) => {
    const name = item.name.toLowerCase();
    const sku = (item.sku || "").toLowerCase();
    return name.includes(normalized) || sku.includes(normalized);
  }).slice(0, 20);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") || "").trim();

  try {
    const like = `%${query}%`;
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        code: string | null;
        name: string;
        unit: string | null;
        price: Prisma.Decimal | string | number | null;
      }>
    >`SELECT id, code, name, unit, price
       FROM "Product"
       WHERE (status IS NULL OR status <> 'Inactivo')
         AND (${query} = '' OR name ILIKE ${like} OR code ILIKE ${like})
       ORDER BY name ASC
       LIMIT 20`;

    const items = rows.map((row) => ({
      id: row.id,
      sku: row.code,
      name: row.name,
      unit: row.unit,
      unitPrice: toNumber(row.price)
    }));

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    if (!isPrismaMissingTableError(error)) {
      const message = error instanceof Error ? error.message : "No se pudo buscar inventario";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    warnDevMissingTable("medical-inventory-search", error);
    const fallbackItems = filterFallbackItems(query);
    return NextResponse.json({
      ok: true,
      data: {
        items: fallbackItems,
        total: fallbackItems.length,
        source: "fallback"
      }
    });
  }
}
