import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { listClients, type ClientListAlertFilter, type ClientListItem } from "@/lib/clients/list.service";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";

function sanitizeType(raw: string | null): ClientProfileType | null {
  if (raw === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (raw === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (raw === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (raw === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function sanitizeAlert(raw: string | null): ClientListAlertFilter | undefined {
  if (raw === "INCOMPLETE") return "INCOMPLETE";
  if (raw === "DOCS_EXPIRED") return "DOCS_EXPIRED";
  if (raw === "DOCS_EXPIRING") return "DOCS_EXPIRING";
  if (raw === "REQUIRED_PENDING") return "REQUIRED_PENDING";
  if (raw === "REQUIRED_REJECTED") return "REQUIRED_REJECTED";
  if (raw === "REQUIRED_EXPIRED") return "REQUIRED_EXPIRED";
  return undefined;
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (text.includes(";") || text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function typeLabel(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "personas";
  if (type === ClientProfileType.COMPANY) return "empresas";
  if (type === ClientProfileType.INSTITUTION) return "instituciones";
  return "aseguradoras";
}

function parseSelectedIds(qs: URLSearchParams) {
  const all = qs.getAll("ids");
  const ids = new Set<string>();

  all.forEach((entry) => {
    entry
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((id) => ids.add(id));
  });

  return Array.from(ids);
}

async function fetchAllItems(params: {
  tenantId: string;
  type: ClientProfileType;
  q: string;
  statusId?: string;
  alert?: ClientListAlertFilter;
  includeArchived: boolean;
}) {
  const items: ClientListItem[] = [];
  const pageSize = 1000;
  let page = 1;

  while (true) {
    const current = await listClients({
      tenantId: params.tenantId,
      type: params.type,
      q: params.q,
      statusId: params.statusId,
      alert: params.alert,
      includeArchived: params.includeArchived,
      page,
      pageSize
    });
    items.push(...current.items);
    if (items.length >= current.total) break;
    page += 1;
  }

  return items;
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const qs = req.nextUrl.searchParams;
  const type = sanitizeType(qs.get("type"));
  if (!type) {
    return NextResponse.json({ error: "type inválido" }, { status: 400 });
  }

  const q = (qs.get("q") || "").trim();
  const statusId = (qs.get("status") || "").trim() || undefined;
  const alert = sanitizeAlert(qs.get("alert"));
  const includeArchived = qs.get("includeArchived") === "1";
  const selectedIds = parseSelectedIds(qs);
  const tenantId = tenantIdFromUser(auth.user);

  const items = selectedIds.length
    ? (() => {
        return fetchAllItems({
          tenantId,
          type,
          q,
          statusId,
          alert,
          includeArchived: true
        }).then((rows) => {
          const byId = new Map(rows.map((row) => [row.id, row]));
          return selectedIds.map((id) => byId.get(id)).filter((item): item is ClientListItem => Boolean(item));
        });
      })()
    : fetchAllItems({
        tenantId,
        type,
        q,
        statusId,
        alert,
        includeArchived
      });
  const resolvedItems = await items;

  const header = [
    "ID",
    "Correlativo",
    "Tipo",
    "Nombre",
    "Identificador",
    "Telefono",
    "Email",
    "Estado",
    "HealthScore",
    "Incompleto",
    "DocsVencidos",
    "DocsPorVencer",
    "ReqPendientes",
    "ReqRechazados",
    "ReqVencidos",
    "Archivado",
    "Creado"
  ];

  const rows = resolvedItems.map((item) => [
    item.id,
    item.clientCode,
    item.type,
    item.displayName,
    item.identifier,
    item.phone,
    item.email,
    item.statusLabel,
    item.healthScore,
    item.isIncomplete,
    item.hasExpiredDocs,
    item.hasExpiringDocs,
    item.requiredPendingCount,
    item.requiredRejectedCount,
    item.requiredExpiredCount,
    item.isArchived,
    item.createdAt.toISOString()
  ]);

  const csvRows = [header, ...rows].map((row) => row.map((value) => csvEscape(value)).join(";")).join("\n");
  const csv = `sep=;\n${csvRows}`;

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const scopeLabel = selectedIds.length ? "seleccion" : "filtros";
  const filename = `clientes-${typeLabel(type)}-${scopeLabel}-${date}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
