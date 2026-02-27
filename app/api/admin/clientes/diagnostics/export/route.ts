import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  canViewClientsConfigDiagnostics,
  filterDiagnosticsEvents,
  getRecommendedAction,
  normalizeDiagnosticsDomain,
  type DiagnosticsDateWindow,
  type DiagnosticsEventFilters
} from "@/lib/clients/configDiagnostics";
import type { SystemEventSeverity } from "@/lib/ops/eventLog";
import { listSystemEventLogs } from "@/lib/ops/eventLog.server";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiagnosticsExportFormat = "csv" | "json";

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (text.includes(";") || text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function resolveFormat(value: string | null): DiagnosticsExportFormat {
  return value?.trim().toLowerCase() === "json" ? "json" : "csv";
}

function resolveDateWindow(value: string | null): DiagnosticsDateWindow {
  if (value === "24h") return "24h";
  if (value === "7d") return "7d";
  if (value === "30d") return "30d";
  return "all";
}

function resolveSeverity(value: string | null): DiagnosticsEventFilters["severity"] {
  if (value === "INFO" || value === "WARN" || value === "ERROR" || value === "CRITICAL") return value;
  return "all";
}

function resolveModuleDomain(moduleParam: string | null) {
  if (!moduleParam) return null;
  if (moduleParam === "summary") return null;
  return normalizeDiagnosticsDomain(moduleParam);
}

function resolveDbDomainFilter(domain: DiagnosticsEventFilters["domain"]) {
  if (domain === "all") return ["clients", "reception", "portal", "portals", "ops", "medical"];
  if (domain === "portals") return ["portal", "portals", "portales"];
  return [domain];
}

function resolveClassification(metaJson: Record<string, unknown> | null, eventType: string) {
  const fromMeta = metaJson && typeof metaJson.classification === "string" ? metaJson.classification.trim().toUpperCase() : "";
  if (fromMeta === "REQUIRED" || fromMeta === "OPTIONAL") return fromMeta;
  const normalizedType = eventType.toUpperCase();
  if (normalizedType.includes("REQUIRED")) return "REQUIRED";
  if (normalizedType.includes("OPTIONAL") || normalizedType.includes("FALLBACK")) return "OPTIONAL";
  return "";
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsConfigDiagnostics(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const qs = req.nextUrl.searchParams;
  const format = resolveFormat(qs.get("format"));
  const moduleDomain = resolveModuleDomain(qs.get("module"));
  const requestedDomain = normalizeDiagnosticsDomain(qs.get("domain"));
  const effectiveDomain = moduleDomain ?? requestedDomain ?? "all";
  const severity = resolveSeverity(qs.get("severity"));
  const dateWindow = resolveDateWindow(qs.get("dateWindow"));
  const rawCode = (qs.get("code") || "all").trim();
  const code = rawCode.toLowerCase() === "all" ? "all" : rawCode.toUpperCase();
  const search = (qs.get("search") || "").trim();

  const tenantId = tenantIdFromUser(auth.user);
  const dbDomains = resolveDbDomainFilter(effectiveDomain);
  const logs = await listSystemEventLogs({
    tenantId,
    domains: dbDomains,
    limit: 5000,
    ...(severity !== "all" ? { severities: [severity as SystemEventSeverity] } : {})
  });

  const filters: DiagnosticsEventFilters = {
    domain: effectiveDomain,
    severity,
    dateWindow,
    code: code || "all",
    search
  };
  const filteredEvents = filterDiagnosticsEvents(logs.items, filters);

  const rows = filteredEvents.map((event) => {
    const action = getRecommendedAction(event);
    const classification = resolveClassification(event.metaJson, event.eventType);
    return {
      id: event.id,
      createdAt: event.createdAt,
      tenantId: event.tenantId,
      domain: event.domain,
      eventType: event.eventType,
      severity: event.severity,
      code: event.code,
      resource: event.resource,
      messageShort: event.messageShort,
      digest: event.digest,
      classification,
      recommendedActionKey: action.key,
      recommendedAction: action.description,
      docsAnchor: action.docsAnchor,
      resolvedAt: event.resolvedAt,
      resolvedByUserId: event.resolvedByUserId,
      resolutionNote: event.resolutionNote
    };
  });

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fileBase = `error-systems-${effectiveDomain === "all" ? "all" : effectiveDomain}-${date}`;

  if (format === "json") {
    return new NextResponse(JSON.stringify({ ok: true, total: rows.length, filters, source: logs.source, rows }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.json"`
      }
    });
  }

  const header = [
    "id",
    "createdAt",
    "tenantId",
    "domain",
    "eventType",
    "severity",
    "code",
    "resource",
    "messageShort",
    "digest",
    "classification",
    "recommendedActionKey",
    "recommendedAction",
    "docsAnchor",
    "resolvedAt",
    "resolvedByUserId",
    "resolutionNote"
  ];

  const csvRows = [header, ...rows.map((row) => header.map((key) => csvEscape(row[key as keyof typeof row])))].map((line) => line.join(";")).join("\n");
  const csv = `sep=;\n${csvRows}`;
  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileBase}.csv"`
    }
  });
}
