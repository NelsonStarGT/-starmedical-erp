import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasReadAccess(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth;
  if (!isAdmin(auth.user)) {
    return {
      user: auth.user,
      errorResponse: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 })
    };
  }
  return auth;
}

export async function GET(req: NextRequest) {
  const auth = hasReadAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "1";
    const q = searchParams.get("q")?.trim() ?? "";

    const rows = await prisma.geoCountry.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { iso2: { contains: q, mode: "insensitive" } },
                { iso3: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        iso2: true,
        iso3: true,
        name: true,
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

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar países.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
