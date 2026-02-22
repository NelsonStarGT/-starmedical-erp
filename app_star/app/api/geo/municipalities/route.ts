import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 500) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1000, Math.max(10, Math.floor(parsed)));
}

async function resolveDepartmentDivisionId(departmentId: string, activeOnly: boolean) {
  const whereIsActive = activeOnly ? { isActive: true } : {};

  const byDivisionId = await prisma.geoDivision.findFirst({
    where: {
      id: departmentId,
      level: 1,
      ...whereIsActive
    },
    select: { id: true }
  });
  if (byDivisionId) return byDivisionId.id;

  const byLegacyAdminId = await prisma.geoDivision.findFirst({
    where: {
      level: 1,
      legacyGeoAdmin1Id: departmentId,
      ...whereIsActive
    },
    select: { id: true }
  });
  return byLegacyAdminId?.id ?? null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const departmentId = (params.get("departmentId") || "").trim();
  if (!departmentId) {
    return NextResponse.json({ ok: false, error: "Parámetro departmentId requerido." }, { status: 400 });
  }

  const q = (params.get("q") || "").trim();
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));
  const departmentDivisionId = await resolveDepartmentDivisionId(departmentId, activeOnly);

  if (!departmentDivisionId) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const rows = await prisma.geoDivision.findMany({
    where: {
      level: 2,
      parentId: departmentDivisionId,
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
      parentId: true,
      legacyGeoAdmin2Id: true
    }
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((row) => ({
      id: row.legacyGeoAdmin2Id ?? row.id,
      divisionId: row.id,
      parentDivisionId: row.parentId,
      legacyGeoAdmin2Id: row.legacyGeoAdmin2Id,
      code: row.code,
      name: row.name,
      isActive: row.isActive
    }))
  });
}
