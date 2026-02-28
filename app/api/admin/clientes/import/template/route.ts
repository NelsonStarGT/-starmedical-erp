import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { buildClientBulkTemplateWorkbook } from "@/lib/clients/bulk/clientBulkTemplateWorkbook";
import { canExportClientTemplate } from "@/lib/clients/bulk/permissions";
import {
  getClientBulkSchema,
  getClientBulkTemplateExampleRow,
  getClientBulkTemplateHeaders
} from "@/lib/clients/bulk/clientBulkSchema";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";

export const runtime = "nodejs";

function sanitizeType(raw: string | null): ClientProfileType | null {
  if (raw === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (raw === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (raw === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (raw === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function sanitizeFormat(raw: string | null) {
  const normalized = (raw || "").trim().toLowerCase();
  if (normalized === "xlsx") return "xlsx";
  return "csv";
}

function csvEscape(value: string) {
  if (value.includes(";") || value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !canExportClientTemplate(auth.user)) {
    if (auth.user) {
      await recordClientsAccessBlocked({
        user: auth.user,
        route: "/api/admin/clientes/import/template",
        capability: "CLIENTS_EXPORT_TEMPLATE",
        resourceType: "bulk_template"
      });
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const type = sanitizeType(req.nextUrl.searchParams.get("type")) ?? ClientProfileType.PERSON;
  const format = sanitizeFormat(req.nextUrl.searchParams.get("format"));
  const schema = getClientBulkSchema(type);

  if (format === "xlsx") {
    const buffer = buildClientBulkTemplateWorkbook(type);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${schema.filenameXlsx}"`
      }
    });
  }

  const headers = getClientBulkTemplateHeaders(type);
  const sample = getClientBulkTemplateExampleRow(type);
  const csvRows = [headers, sample].map((row) => row.map(csvEscape).join(";")).join("\n");
  const csv = `sep=;\n${csvRows}`;

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${schema.filenameCsv}"`
    }
  });
}
