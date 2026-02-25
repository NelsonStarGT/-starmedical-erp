import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(5, Math.floor(parsed)));
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
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const params = req.nextUrl.searchParams;
  const countryParam = (params.get("countryId") || params.get("country") || "").trim();
  const q = (params.get("q") || "").trim();
  const level = Number(params.get("level") || "2");
  const parentId = (params.get("parentId") || "").trim() || null;
  const limit = parseLimit(params.get("limit"));

  if (!countryParam) {
    return NextResponse.json({ ok: false, error: "Parámetro countryId requerido." }, { status: 400 });
  }
  if (!Number.isFinite(level) || level < 1 || level > 8) {
    return NextResponse.json({ ok: false, error: "Parámetro level inválido (1..8)." }, { status: 400 });
  }
  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const countryId = await resolveCountryId(countryParam);
  if (!countryId) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const rows = await prisma.geoDivision.findMany({
    where: {
      countryId,
      level,
      ...(parentId ? { parentId } : {}),
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } }
      ]
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
      dataSource: true,
      isActive: true
    }
  });

  const response = NextResponse.json({ ok: true, items: rows });
  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return response;
}
