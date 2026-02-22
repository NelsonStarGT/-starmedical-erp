import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2000, Math.max(10, Math.floor(parsed)));
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

  const levelParam = (params.get("level") || "").trim();
  const level = Number(levelParam);
  if (!Number.isFinite(level) || level < 1 || level > 8) {
    return NextResponse.json({ ok: false, error: "Parámetro level inválido (1..8)." }, { status: 400 });
  }

  const countryId = await resolveCountryId(countryParam);
  if (!countryId) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const parentIdParam = params.get("parentId");
  const parentId = parentIdParam && parentIdParam.trim().length ? parentIdParam.trim() : null;

  const q = (params.get("q") || "").trim();
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));

  const rows = await prisma.geoDivision.findMany({
    where: {
      countryId,
      level,
      ...(parentIdParam !== null ? { parentId } : {}),
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
    orderBy: [{ name: "asc" }],
    take: limit,
    select: {
      id: true,
      countryId: true,
      level: true,
      code: true,
      name: true,
      parentId: true,
      isActive: true
    }
  });

  return NextResponse.json({
    ok: true,
    items: rows
  });
}
