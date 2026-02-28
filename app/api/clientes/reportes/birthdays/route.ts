import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { formatDateForClients } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { canViewClientsReports } from "@/lib/clients/reports/permissions";
import { buildClientsReportFiltersFromRequest } from "@/lib/clients/reports/requestFilters";
import { getClientsReportBirthdays } from "@/lib/clients/reports.service";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeMonth(value: string | null) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 12 ? parsed : null;
}

function normalizeNextDays(value: string | null) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 90 ? parsed : null;
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsReports(auth.user)) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/clientes/reportes/birthdays",
      capability: "CLIENTS_REPORTS_VIEW",
      resourceType: "reports"
    });
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const tenantId = tenantIdFromUser(auth.user);
    const dateFormat = await getClientsDateFormat(tenantId);
    const baseFilters = buildClientsReportFiltersFromRequest(req, dateFormat, tenantId, {
      withPagination: false,
      forcePage: 1,
      forcePageSize: 25
    });
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const month = normalizeMonth(searchParams.get("birthMonth"));
    const nextDays = normalizeNextDays(searchParams.get("birthNextDays"));

    const birthdays = await getClientsReportBirthdays({
      tenantId,
      countryId: baseFilters.countryId,
      q: baseFilters.q,
      type: baseFilters.type,
      month,
      nextDays,
      limit: format === "csv" ? 5_000 : 300
    });

    if (format === "csv") {
      const headers = [
        "Nombre",
        "Tipo",
        "FechaNacimiento",
        "ProximoCumpleanos",
        "DiasRestantes",
        "Edad",
        "Telefono",
        "WhatsApp",
        "Email"
      ];
      const lines = [headers.map(escapeCsv).join(",")];
      for (const row of birthdays.items) {
        lines.push(
          [
            row.displayName,
            row.type,
            formatDateForClients(row.birthDate, dateFormat),
            formatDateForClients(row.nextBirthday, dateFormat),
            row.daysUntil,
            row.age ?? "",
            row.phone ?? "",
            row.whatsappHref ?? "",
            row.email ?? ""
          ]
            .map(escapeCsv)
            .join(",")
        );
      }

      const nowTag = new Date().toISOString().slice(0, 10);
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"clientes-cumpleaneros-${nowTag}.csv\"`
        }
      });
    }

    return NextResponse.json({ ok: true, data: birthdays });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el reporte de cumpleaños.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
