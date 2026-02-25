import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 250) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(500, Math.max(10, Math.floor(parsed)));
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

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
      callingCode: true,
      admin1Label: true,
      admin2Label: true,
      admin3Label: true,
      adminMaxLevel: true,
      isActive: true,
      meta: {
        select: {
          level1Label: true,
          level2Label: true,
          level3Label: true,
          maxLevel: true
        }
      }
    }
  });

  const response = NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.id,
      code: row.iso2,
      iso3: row.iso3,
      name: row.name,
      callingCode: row.callingCode,
      isActive: row.isActive,
      meta: {
        level1Label: row.admin1Label || row.meta?.level1Label || "Nivel 1",
        level2Label: row.admin2Label || row.meta?.level2Label || "Nivel 2",
        level3Label: row.admin3Label || row.meta?.level3Label || null,
        maxLevel: row.adminMaxLevel || row.meta?.maxLevel || 2
      }
    }))
  });

  response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  return response;
}
