import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getClientsReportSummary, type ClientsReportFilters } from "@/lib/clients/reports.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFilters(req: NextRequest): ClientsReportFilters {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("type");

  return {
    q: searchParams.get("q") || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
    country: searchParams.get("country") || undefined,
    acquisitionSourceId: searchParams.get("sourceId") || undefined,
    acquisitionDetailOptionId: searchParams.get("detailId") || undefined,
    referredOnly: searchParams.get("referred") === "1"
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const filters = buildFilters(req);
    const summary = await getClientsReportSummary(filters);
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular el resumen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
