import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { canViewClientsReports } from "@/lib/clients/reports/permissions";
import { buildClientsReportFiltersFromRequest } from "@/lib/clients/reports/requestFilters";
import {
  getClientCountsByGeo,
  getInsurersByLine
} from "@/lib/clients/reports.service";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsReports(auth.user)) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/clientes/reportes/geo",
      capability: "CLIENTS_REPORTS_VIEW",
      resourceType: "reports"
    });
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const tenantId = tenantIdFromUser(auth.user);
    const dateFormat = await getClientsDateFormat(tenantId);
    const filters = buildClientsReportFiltersFromRequest(req, dateFormat, tenantId, {
      withPagination: false,
      forcePage: 1,
      forcePageSize: 25
    });
    const [geo, insurersByLine] = await Promise.all([getClientCountsByGeo(filters), getInsurersByLine(filters)]);
    return NextResponse.json({ ok: true, data: { geo, insurersByLine } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo calcular reporte geo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
