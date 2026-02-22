import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(value: string | null, fallback = 25) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(200, Math.max(1, Math.floor(parsed)));
}

function normalizePostalCode(value: string | null) {
  return (value || "").replace(/\s+/g, "").trim().toUpperCase();
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

async function resolveDivisionReference(
  countryId: string,
  value: string,
  level?: number
): Promise<{
  id: string;
  level: number;
  legacyGeoAdmin1Id: string | null;
  legacyGeoAdmin2Id: string | null;
  legacyGeoAdmin3Id: string | null;
} | null> {
  const normalized = value.trim();
  if (!normalized) return null;

  return prisma.geoDivision.findFirst({
    where: {
      countryId,
      ...(typeof level === "number" ? { level } : {}),
      OR: [
        { id: normalized },
        { legacyGeoAdmin1Id: normalized },
        { legacyGeoAdmin2Id: normalized },
        { legacyGeoAdmin3Id: normalized }
      ]
    },
    select: {
      id: true,
      level: true,
      legacyGeoAdmin1Id: true,
      legacyGeoAdmin2Id: true,
      legacyGeoAdmin3Id: true
    }
  });
}

type DivisionWithParents = {
  id: string;
  level: number;
  code: string;
  name: string;
  parent:
    | {
        id: string;
        level: number;
        code: string;
        name: string;
        parent:
          | {
              id: string;
              level: number;
              code: string;
              name: string;
              parent:
                | {
                    id: string;
                    level: number;
                    code: string;
                    name: string;
                    parent: {
                      id: string;
                      level: number;
                      code: string;
                      name: string;
                    } | null;
                  }
                | null;
            }
          | null;
      }
    | null;
};

function buildDivisionPath(division: DivisionWithParents | null) {
  if (!division) return [] as Array<{ id: string; level: number; code: string; name: string }>;

  const path: Array<{ id: string; level: number; code: string; name: string }> = [];
  let cursor: {
    id: string;
    level: number;
    code: string;
    name: string;
    parent: unknown;
  } | null = division as unknown as {
    id: string;
    level: number;
    code: string;
    name: string;
    parent: unknown;
  };

  while (cursor) {
    path.push({
      id: cursor.id,
      level: cursor.level,
      code: cursor.code,
      name: cursor.name
    });
    cursor = (cursor.parent as {
      id: string;
      level: number;
      code: string;
      name: string;
      parent: unknown;
    } | null) ?? null;
  }

  return path.sort((a, b) => a.level - b.level);
}

function mapRow(row: {
  id: string;
  postalCode: string;
  label: string | null;
  dataSource: "official" | "operational";
  divisionId: string | null;
  division: DivisionWithParents | null;
  country: {
    id: string;
    iso2: string;
    name: string;
    meta: {
      level1Label: string;
      level2Label: string;
      level3Label: string | null;
      maxLevel: number;
    } | null;
  };
  admin1: { id: string; code: string; name: string } | null;
  admin2: { id: string; code: string; name: string } | null;
  admin3: { id: string; code: string; name: string } | null;
}) {
  const divisionPath = buildDivisionPath(row.division);

  return {
    id: row.id,
    postalCode: row.postalCode,
    label: row.label,
    dataSource: row.dataSource,
    isOperational: row.dataSource === "operational",
    divisionId: row.divisionId,
    divisionPath,
    labels: {
      level1Label: row.country.meta?.level1Label ?? "Nivel 1",
      level2Label: row.country.meta?.level2Label ?? "Nivel 2",
      level3Label: row.country.meta?.level3Label ?? null,
      maxLevel: row.country.meta?.maxLevel ?? 2
    },
    country: {
      id: row.country.id,
      code: row.country.iso2,
      name: row.country.name
    },
    admin1: row.admin1,
    admin2: row.admin2,
    admin3: row.admin3,
    admin1Id: row.admin1?.id ?? null,
    admin2Id: row.admin2?.id ?? null,
    admin3Id: row.admin3?.id ?? null
  };
}

function buildDivisionCoverageWhere(divisionId: string, level: number) {
  if (level <= 1) {
    return {
      OR: [
        { divisionId },
        { division: { parentId: divisionId } },
        { division: { parent: { parentId: divisionId } } }
      ]
    };
  }

  if (level === 2) {
    return {
      OR: [{ divisionId }, { division: { parentId: divisionId } }]
    };
  }

  return { divisionId };
}

function buildScopedAreaWhere(params: {
  rawId: string | null;
  resolvedDivision: {
    id: string;
    level: number;
    legacyGeoAdmin1Id: string | null;
    legacyGeoAdmin2Id: string | null;
    legacyGeoAdmin3Id: string | null;
  } | null;
  adminField?: "admin1Id" | "admin2Id" | "admin3Id";
}) {
  const rawId = params.rawId?.trim() || null;
  if (!rawId && !params.resolvedDivision) return null;

  if (!params.resolvedDivision) {
    if (params.adminField) return { [params.adminField]: rawId };
    return { divisionId: rawId };
  }

  const byDivision = buildDivisionCoverageWhere(params.resolvedDivision.id, params.resolvedDivision.level);
  const clauses: Array<Record<string, unknown>> = [byDivision];

  if (params.adminField) {
    const legacyId =
      params.adminField === "admin1Id"
        ? params.resolvedDivision.legacyGeoAdmin1Id
        : params.adminField === "admin2Id"
          ? params.resolvedDivision.legacyGeoAdmin2Id
          : params.resolvedDivision.legacyGeoAdmin3Id;

    if (legacyId) {
      clauses.push({ [params.adminField]: legacyId });
    }
    if (rawId && rawId !== legacyId) {
      clauses.push({ [params.adminField]: rawId });
    }
  } else if (rawId && rawId !== params.resolvedDivision.id) {
    clauses.push({ divisionId: rawId });
  }

  if (clauses.length === 1) return clauses[0];
  return { OR: clauses };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const countryParam = (params.get("country") || "").trim();
  if (!countryParam) {
    return NextResponse.json({ ok: false, error: "Selecciona un país antes de buscar código postal." }, { status: 400 });
  }

  const countryId = await resolveCountryId(countryParam);
  if (!countryId) {
    return NextResponse.json({ ok: true, resolved: false, matches: [] });
  }

  const postalCode = normalizePostalCode(params.get("postalCode"));
  const divisionId = (params.get("divisionId") || "").trim() || null;
  const admin1Id = (params.get("admin1Id") || "").trim() || null;
  const admin2Id = (params.get("admin2Id") || "").trim() || null;
  const admin3Id = (params.get("admin3Id") || "").trim() || null;
  const activeOnly = params.get("active") !== "0";
  const limit = parseLimit(params.get("limit"));

  const hasAreaFilter = Boolean(divisionId || admin1Id || admin2Id || admin3Id);
  if (!postalCode && !hasAreaFilter) {
    return NextResponse.json(
      { ok: false, error: "Debes enviar postalCode o una combinación de divisionId/admin1Id/admin2Id/admin3Id." },
      { status: 400 }
    );
  }

  const [resolvedDivision, resolvedAdmin1, resolvedAdmin2, resolvedAdmin3] = await Promise.all([
    divisionId ? resolveDivisionReference(countryId, divisionId) : Promise.resolve(null),
    admin1Id ? resolveDivisionReference(countryId, admin1Id, 1) : Promise.resolve(null),
    admin2Id ? resolveDivisionReference(countryId, admin2Id, 2) : Promise.resolve(null),
    admin3Id ? resolveDivisionReference(countryId, admin3Id, 3) : Promise.resolve(null)
  ]);

  const areaFilters = [
    buildScopedAreaWhere({ rawId: divisionId, resolvedDivision }),
    buildScopedAreaWhere({ rawId: admin1Id, resolvedDivision: resolvedAdmin1, adminField: "admin1Id" }),
    buildScopedAreaWhere({ rawId: admin2Id, resolvedDivision: resolvedAdmin2, adminField: "admin2Id" }),
    buildScopedAreaWhere({ rawId: admin3Id, resolvedDivision: resolvedAdmin3, adminField: "admin3Id" })
  ].filter(Boolean) as Array<Record<string, unknown>>;

  const baseWhere = {
    countryId,
    ...(activeOnly ? { isActive: true } : {}),
    ...(areaFilters.length ? { AND: areaFilters } : {})
  };

  const select = {
    id: true,
    postalCode: true,
    label: true,
    dataSource: true,
    divisionId: true,
    division: {
      select: {
        id: true,
        level: true,
        code: true,
        name: true,
        parent: {
          select: {
            id: true,
            level: true,
            code: true,
            name: true,
            parent: {
              select: {
                id: true,
                level: true,
                code: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    level: true,
                    code: true,
                    name: true,
                    parent: {
                      select: {
                        id: true,
                        level: true,
                        code: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    country: {
      select: {
        id: true,
        iso2: true,
        name: true,
        meta: {
          select: {
            level1Label: true,
            level2Label: true,
            level3Label: true,
            maxLevel: true
          }
        }
      }
    },
    admin1: {
      select: {
        id: true,
        code: true,
        name: true
      }
    },
    admin2: {
      select: {
        id: true,
        code: true,
        name: true
      }
    },
    admin3: {
      select: {
        id: true,
        code: true,
        name: true
      }
    }
  } as const;

  let rows = await prisma.geoPostalCode.findMany({
    where: {
      ...baseWhere,
      ...(postalCode ? { postalCode } : {})
    },
    orderBy: [{ dataSource: "asc" }, { postalCode: "asc" }],
    take: limit,
    select
  });

  if (postalCode && !rows.length) {
    rows = await prisma.geoPostalCode.findMany({
      where: {
        ...baseWhere,
        postalCode: { startsWith: postalCode }
      },
      orderBy: [{ dataSource: "asc" }, { postalCode: "asc" }],
      take: limit,
      select
    });
  }

  const matches = rows.map(mapRow);
  const resolved = matches.length === 1;

  return NextResponse.json({
    ok: true,
    resolved,
    match: resolved ? matches[0] : null,
    matches,
    items: matches
  });
}
