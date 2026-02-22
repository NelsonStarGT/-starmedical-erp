import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 300) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(10, Math.floor(parsed)));
}

async function resolveCountryId(country: string) {
  const normalized = country.trim();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();

  const byCode = await prisma.geoCountry.findFirst({
    where: {
      OR: [{ iso2: upper }, { iso3: upper }]
    },
    select: { id: true }
  });
  if (byCode) return byCode.id;

  const byId = await prisma.geoCountry.findUnique({
    where: { id: normalized },
    select: { id: true }
  });
  return byId?.id ?? null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const countryParam = (params.get("country") || "").trim();
  if (!countryParam) {
    return NextResponse.json({ ok: false, error: "Parámetro country requerido." }, { status: 400 });
  }

  const countryId = await resolveCountryId(countryParam);
  if (!countryId) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const q = (params.get("q") || "").trim();
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));

  const rows = await prisma.geoDivision.findMany({
    where: {
      countryId,
      level: 1,
      parentId: null,
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      legacyGeoAdmin1Id: true
    }
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.legacyGeoAdmin1Id ?? row.id,
      divisionId: row.id,
      legacyGeoAdmin1Id: row.legacyGeoAdmin1Id,
      code: row.code,
      name: row.name,
      isActive: row.isActive
    }))
  });
}
