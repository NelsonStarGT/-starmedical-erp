import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { normalizeClientsCountryFilterInput, readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";
import { getClientsReportList, type ClientsReportFilters } from "@/lib/clients/reports.service";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFilters(req: NextRequest, tenantId: string): ClientsReportFilters {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("type");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "25");
  const queryCountryId = normalizeClientsCountryFilterInput(searchParams.get("countryId"));
  const cookieCountryId = readClientsCountryFilterCookie(req.cookies);

  return {
    tenantId,
    q: searchParams.get("q") || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
    countryId: queryCountryId ?? cookieCountryId ?? undefined,
    acquisitionSourceId: searchParams.get("sourceId") || undefined,
    acquisitionDetailOptionId: searchParams.get("detailId") || undefined,
    referredOnly: searchParams.get("referred") === "1",
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const filters = buildFilters(req, tenantIdFromUser(auth.user));
    const list = await getClientsReportList(filters);
    return NextResponse.json({ ok: true, data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar reportes.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
