import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 300) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(10, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));

  const rows = await prisma.phoneCountryCode.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { iso2: { contains: q.toUpperCase() } },
              { countryName: { contains: q, mode: "insensitive" } },
              { dialCode: { contains: q } }
            ]
          }
        : {})
    },
    orderBy: [{ countryName: "asc" }],
    take: limit,
    select: {
      id: true,
      iso2: true,
      countryName: true,
      dialCode: true,
      minLength: true,
      maxLength: true,
      example: true,
      isActive: true
    }
  });

  const geoRows = await prisma.geoCountry.findMany({
    where: { iso2: { in: rows.map((row) => row.iso2) } },
    select: { id: true, iso2: true }
  });
  const geoByIso2 = new Map(geoRows.map((row) => [row.iso2, row.id]));

  return NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.id,
      iso2: row.iso2,
      countryName: row.countryName,
      dialCode: row.dialCode,
      minLength: row.minLength,
      maxLength: row.maxLength,
      example: row.example,
      isActive: row.isActive,
      geoCountryId: geoByIso2.get(row.iso2) ?? null
    }))
  });
}
