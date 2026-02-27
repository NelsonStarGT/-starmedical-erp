import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAuth } from "@/lib/auth";
import { normalizeClientsCountryFilterInput, readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";
import { isAdmin } from "@/lib/rbac";
import { parseClientsDateInput, parseIsoDateString, type ClientsDateFormat } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { getClientsReportList, type ClientsReportFilters } from "@/lib/clients/reports.service";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null, dateFormat: ClientsDateFormat) {
  if (!value) return null;
  const byFormat = parseClientsDateInput(value, dateFormat);
  if (byFormat) return byFormat;
  return parseIsoDateString(value);
}

function buildFilters(req: NextRequest, dateFormat: ClientsDateFormat, tenantId: string): ClientsReportFilters {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("type");
  const queryCountryId = normalizeClientsCountryFilterInput(searchParams.get("countryId"));
  const cookieCountryId = readClientsCountryFilterCookie(req.cookies);

  return {
    tenantId,
    q: searchParams.get("q") || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(searchParams.get("from"), dateFormat),
    to: parseDate(searchParams.get("to"), dateFormat),
    countryId: queryCountryId ?? cookieCountryId ?? undefined,
    acquisitionSourceId: searchParams.get("sourceId") || undefined,
    acquisitionDetailOptionId: searchParams.get("detailId") || undefined,
    referredOnly: searchParams.get("referred") === "1",
    page: 1,
    pageSize: 1000
  };
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
  if (!isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const dateFormat = await getClientsDateFormat(tenantIdFromUser(auth.user));
    const filters = buildFilters(req, dateFormat, tenantIdFromUser(auth.user));
    const list = await getClientsReportList(filters);

    const header = [
      "createdAt",
      "clientId",
      "displayName",
      "type",
      "identifier",
      "country",
      "department",
      "city",
      "phone",
      "email",
      "acquisitionSource",
      "acquisitionDetail",
      "referredBy"
    ];

    const lines = [header.join(",")];
    for (const row of list.items) {
      lines.push(
        [
          row.createdAt.toISOString(),
          row.id,
          row.displayName,
          row.type,
          row.identifier,
          row.country,
          row.department,
          row.city,
          row.phone,
          row.email,
          row.acquisitionSource,
          row.acquisitionDetail,
          row.referredBy
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    const rows = list.items.map((row) => ({
      createdAt: row.createdAt.toISOString(),
      clientId: row.id,
      displayName: row.displayName,
      type: row.type,
      identifier: row.identifier ?? "",
      country: row.country ?? "",
      department: row.department ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      acquisitionSource: row.acquisitionSource ?? "",
      acquisitionDetail: row.acquisitionDetail ?? "",
      referredBy: row.referredBy ?? ""
    }));

    const csv = lines.join("\n");
    const nowTag = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const { buffer } = await exportExcelViaProcessingService({
        context: {
          tenantId: auth.user.tenantId,
          actorId: auth.user.id
        },
        fileName: `clientes-reportes-${nowTag}.xlsx`,
        sheets: [
          {
            name: "Clientes",
            headers: header,
            rows: rows.map((row) => header.map((key) => row[key as keyof typeof row] ?? ""))
          }
        ],
        limits: {
          maxFileMb: 8,
          maxRows: 10_000,
          maxCols: 80,
          timeoutMs: 15_000
        }
      });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=\"clientes-reportes-${nowTag}.xlsx\"`
        }
      });
    }

    if (format === "pdf") {
      const doc = await PDFDocument.create();
      const page = doc.addPage([842, 595]); // landscape A4
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      page.drawText("Reporte de clientes", {
        x: 30,
        y: 565,
        size: 13,
        font: fontBold,
        color: rgb(0.18, 0.46, 0.73)
      });
      page.drawText(`Generado: ${new Date().toLocaleString()}`, {
        x: 30,
        y: 548,
        size: 9,
        font
      });

      const maxRows = 22;
      let y = 525;
      const viewRows = rows.slice(0, maxRows);
      const line = (values: string[]) =>
        values
          .map((value) => value.replace(/\s+/g, " ").trim())
          .map((value) => (value.length > 28 ? `${value.slice(0, 27)}…` : value))
          .join(" | ");

      page.drawText(line(["Fecha", "Nombre", "Tipo", "País", "Tel", "Canal", "Referido por"]), {
        x: 30,
        y,
        size: 8.5,
        font: fontBold
      });
      y -= 12;

      for (const row of viewRows) {
        page.drawText(
          line([
            row.createdAt.slice(0, 10),
            row.displayName,
            row.type,
            row.country || "—",
            row.phone || "—",
            row.acquisitionSource || "—",
            row.referredBy || "—"
          ]),
          { x: 30, y, size: 8, font }
        );
        y -= 11;
        if (y < 40) break;
      }

      page.drawText(`Filas exportadas: ${rows.length} (vista PDF muestra hasta ${maxRows})`, {
        x: 30,
        y: 24,
        size: 8,
        font
      });

      const pdfBytes = await doc.save();
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"clientes-reportes-${nowTag}.pdf\"`
        }
      });
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clientes-reportes-${nowTag}.csv"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo exportar reportes.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
