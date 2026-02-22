import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

type Modality = "LAB" | "RX" | "USG";

type ServiceSearchItem = {
  id: string;
  code: string | null;
  title: string;
  modality: Modality;
  price: number | null;
};

const FALLBACK_SERVICES: ServiceSearchItem[] = [
  { id: "svc-lab-001", code: "LAB-HMG", title: "Hemograma completo", modality: "LAB", price: 95 },
  { id: "svc-lab-002", code: "LAB-GLI", title: "Glicemia en ayunas", modality: "LAB", price: 55 },
  { id: "svc-lab-003", code: "LAB-LIP", title: "Perfil lipídico", modality: "LAB", price: 180 },
  { id: "svc-lab-004", code: "LAB-HBA1C", title: "Hemoglobina glicosilada (HbA1c)", modality: "LAB", price: 145 },
  { id: "svc-lab-005", code: "LAB-CRE", title: "Creatinina sérica", modality: "LAB", price: 65 },
  { id: "svc-lab-006", code: "LAB-URO", title: "Uroanálisis", modality: "LAB", price: 60 },
  { id: "svc-lab-007", code: "LAB-TSH", title: "TSH", modality: "LAB", price: 155 },
  { id: "svc-lab-008", code: "LAB-TGO", title: "TGO/TGP", modality: "LAB", price: 125 },
  { id: "svc-lab-009", code: "LAB-PCR", title: "Proteína C reactiva", modality: "LAB", price: 140 },
  { id: "svc-lab-010", code: "LAB-VSG", title: "Velocidad de sedimentación globular", modality: "LAB", price: 70 },
  { id: "svc-rx-001", code: "RX-TOR-APLAT", title: "Rayos X de tórax (AP/Lat)", modality: "RX", price: 220 },
  { id: "svc-rx-002", code: "RX-COL-CER", title: "Rayos X columna cervical", modality: "RX", price: 245 },
  { id: "svc-rx-003", code: "RX-COL-LUM", title: "Rayos X columna lumbar", modality: "RX", price: 245 },
  { id: "svc-rx-004", code: "RX-MIE-SUP", title: "Rayos X miembro superior", modality: "RX", price: 210 },
  { id: "svc-rx-005", code: "RX-MIE-INF", title: "Rayos X miembro inferior", modality: "RX", price: 210 },
  { id: "svc-rx-006", code: "RX-SENOS", title: "Rayos X senos paranasales", modality: "RX", price: 240 },
  { id: "svc-rx-007", code: "RX-ABD", title: "Rayos X abdomen simple", modality: "RX", price: 230 },
  { id: "svc-rx-008", code: "RX-MANO", title: "Rayos X mano", modality: "RX", price: 195 },
  { id: "svc-rx-009", code: "RX-ROD", title: "Rayos X rodilla", modality: "RX", price: 215 },
  { id: "svc-rx-010", code: "RX-PEL", title: "Rayos X pelvis", modality: "RX", price: 235 },
  { id: "svc-usg-001", code: "USG-ABD", title: "Ultrasonido abdominal", modality: "USG", price: 320 },
  { id: "svc-usg-002", code: "USG-PEL", title: "Ultrasonido pélvico", modality: "USG", price: 330 },
  { id: "svc-usg-003", code: "USG-REN", title: "Ultrasonido renal", modality: "USG", price: 315 },
  { id: "svc-usg-004", code: "USG-OBS", title: "Ultrasonido obstétrico", modality: "USG", price: 360 },
  { id: "svc-usg-005", code: "USG-MAM", title: "Ultrasonido mamario", modality: "USG", price: 350 },
  { id: "svc-usg-006", code: "USG-TIRO", title: "Ultrasonido tiroideo", modality: "USG", price: 310 },
  { id: "svc-usg-007", code: "USG-PRO", title: "Ultrasonido prostático", modality: "USG", price: 345 },
  { id: "svc-usg-008", code: "USG-TEJ", title: "Ultrasonido de tejidos blandos", modality: "USG", price: 300 },
  { id: "svc-usg-009", code: "USG-CAR", title: "Doppler carotídeo", modality: "USG", price: 420 },
  { id: "svc-usg-010", code: "USG-VEN", title: "Doppler venoso de miembros inferiores", modality: "USG", price: 440 }
];

function toNullableNumber(value: Prisma.Decimal | string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeModality(raw: unknown): Modality {
  const value = String(raw || "").toLowerCase();
  if (value.includes("rx") || value.includes("rayos") || value.includes("radi")) return "RX";
  if (value.includes("usg") || value.includes("ultra") || value.includes("sono") || value.includes("eco")) return "USG";
  if (value.includes("lab") || value.includes("labor")) return "LAB";
  return "LAB";
}

function filterFallback(query: string, modality: Modality | "ALL") {
  const normalized = query.trim().toLowerCase();
  return FALLBACK_SERVICES.filter((item) => {
    if (modality !== "ALL" && item.modality !== modality) return false;
    if (!normalized) return true;
    return item.title.toLowerCase().includes(normalized) || (item.code || "").toLowerCase().includes(normalized);
  }).slice(0, 30);
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const modalityParam = (url.searchParams.get("modality") || "ALL").toUpperCase();
  const modality: Modality | "ALL" = modalityParam === "LAB" || modalityParam === "RX" || modalityParam === "USG" ? modalityParam : "ALL";

  try {
    const like = `%${q}%`;
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        code: string | null;
        name: string;
        price: number | string | null;
        categoryName: string | null;
        subcategoryName: string | null;
      }>
    >`SELECT s.id, s.code, s.name, s.price,
         c.name as "categoryName",
         sc.name as "subcategoryName"
       FROM "Service" s
       LEFT JOIN "ServiceCategory" c ON c.id = s."categoryId"
       LEFT JOIN "ServiceSubcategory" sc ON sc.id = s."subcategoryId"
       WHERE (s.status IS NULL OR s.status <> 'Inactivo')
         AND (${q} = '' OR s.name ILIKE ${like} OR s.code ILIKE ${like})
       ORDER BY s.name ASC
       LIMIT 120`;

    const items = rows
      .map((row) => {
        const inferred = normalizeModality(`${row.categoryName || ""} ${row.subcategoryName || ""} ${row.name}`);
        return {
          id: row.id,
          code: row.code,
          title: row.name,
          modality: inferred,
          price: toNullableNumber(row.price as Prisma.Decimal | string | number | null)
        } satisfies ServiceSearchItem;
      })
      .filter((row) => (modality === "ALL" ? true : row.modality === modality))
      .slice(0, 30);

    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    if (!isPrismaMissingTableError(error)) {
      const message = error instanceof Error ? error.message : "No se pudo buscar catálogo de servicios";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
    warnDevMissingTable("medical-services-search", error);
    const items = filterFallback(q, modality);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: items.length,
        source: "fallback"
      }
    });
  }
}
