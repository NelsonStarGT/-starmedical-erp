import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireConfigCentralCapability,
  server500
} from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_AUDIT_READ");
  if (auth.response) return auth.response;

  const tenantId = normalizeTenantId(auth.user?.tenantId);
  const search = req.nextUrl.searchParams;
  const action = search.get("action")?.trim() || null;
  const actorUserId = search.get("actorUserId")?.trim() || null;
  const dateFrom = parseDate(search.get("dateFrom"));
  const dateTo = parseDate(search.get("dateTo"));
  const takeRaw = Number(search.get("take") || 100);
  const take = Number.isInteger(takeRaw) ? Math.min(Math.max(takeRaw, 1), 250) : 100;

  try {
    enforceRateLimit(req, { limit: 60, windowMs: 60_000 });
    const rows = await prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(action ? { action } : {}),
        ...(actorUserId ? { actorUserId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {})
              }
            }
          : {})
      },
      orderBy: [{ createdAt: "desc" }],
      take,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
        actorRole: true,
        ip: true,
        userAgent: true,
        metadata: true,
        before: true,
        after: true
      }
    });

    return NextResponse.json({
      ok: true,
      data: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString()
      }))
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 429
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT",
          error: "Demasiadas solicitudes. Espera un momento para reintentar."
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudieron cargar los audit logs.";
    return server500(message);
  }
}
