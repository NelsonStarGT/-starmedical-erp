import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 250) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(10, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));

  const rows = await prisma.geoCountry.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { iso2: { contains: q.toUpperCase() } },
              { iso3: { contains: q.toUpperCase() } }
            ]
          }
        : {})
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      iso2: true,
      iso3: true,
      name: true,
      isActive: true
    }
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.id,
      code: row.iso2,
      iso3: row.iso3,
      name: row.name,
      isActive: row.isActive
    }))
  });
}
