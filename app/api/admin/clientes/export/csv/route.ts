import { NextRequest, NextResponse } from "next/server";
import { ClientNoteType, ClientProfileType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { buildClientBulkDataRow, type ClientBulkExportProfile } from "@/lib/clients/bulk/clientBulkExport";
import { canExportClientData } from "@/lib/clients/bulk/permissions";
import { getClientBulkTemplateHeaders } from "@/lib/clients/bulk/clientBulkSchema";
import { normalizeClientsCountryFilterInput, readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";
import { prisma } from "@/lib/prisma";
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
  countryId: string | null;
  q: string;
  statusId?: string;
  alert?: ClientListAlertFilter;
  includeArchived: boolean;
  archivedOnly?: boolean;
}) {
  const items: ClientListItem[] = [];
  const pageSize = 1000;
  let page = 1;

  while (true) {
    const current = await listClients({
      tenantId: params.tenantId,
      type: params.type,
      countryId: params.countryId,
      q: params.q,
      statusId: params.statusId,
      alert: params.alert,
      includeArchived: params.includeArchived,
      archivedOnly: params.archivedOnly,
      page,
      pageSize
    });
    items.push(...current.items);
    if (items.length >= current.total) break;
    page += 1;
  }

  return items;
}

async function fetchProfilesByIds(params: {
  tenantId: string;
  type: ClientProfileType;
  ids: string[];
}) {
  if (!params.ids.length) return [];

  const rows = await prisma.clientProfile.findMany({
    where: {
      tenantId: params.tenantId,
      type: params.type,
      id: { in: params.ids }
    },
    include: {
      status: { select: { name: true } },
      institutionType: { select: { name: true } },
      acquisitionSource: { select: { name: true, code: true } },
      acquisitionDetailOption: { select: { name: true, code: true } },
      companyRecord: {
        select: {
          id: true,
          kind: true,
          legalName: true,
          tradeName: true,
          taxId: true,
          billingEmail: true,
          billingPhone: true,
          website: true,
          notes: true,
          metadata: true
        }
      },
      clientLocations: {
        where: {
          isPrimary: true,
          isActive: true
        },
        select: {
          address: true,
          addressLine1: true,
          postalCode: true,
          city: true,
          department: true,
          country: true
        },
        take: 1
      },
      clientNotes: {
        where: { noteType: ClientNoteType.ADMIN },
        select: { body: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    }
  });

  return rows as ClientBulkExportProfile[];
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !canExportClientData(auth.user)) {
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
  const archivedOnly = qs.get("archivedOnly") === "1";
  const selectedIds = parseSelectedIds(qs);
  const tenantId = tenantIdFromUser(auth.user);
  const queryCountryId = normalizeClientsCountryFilterInput(qs.get("countryId"));
  const cookieCountryId = readClientsCountryFilterCookie(req.cookies);
  const countryId = queryCountryId ?? cookieCountryId;

  const items = selectedIds.length
    ? (() => {
        return fetchAllItems({
          tenantId,
          type,
          countryId,
          q,
          statusId,
          alert,
          includeArchived: true,
          archivedOnly
        }).then((rows) => {
          const byId = new Map(rows.map((row) => [row.id, row]));
          return selectedIds.map((id) => byId.get(id)).filter((item): item is ClientListItem => Boolean(item));
        });
      })()
    : fetchAllItems({
        tenantId,
        type,
        countryId,
        q,
        statusId,
        alert,
        includeArchived,
        archivedOnly
      });
  const resolvedItems = await items;

  const profiles = await fetchProfilesByIds({
    tenantId,
    type,
    ids: resolvedItems.map((item) => item.id)
  });
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const orderedProfiles = resolvedItems
    .map((item) => profileById.get(item.id))
    .filter((profile): profile is ClientBulkExportProfile => Boolean(profile));

  const header = getClientBulkTemplateHeaders(type);
  const rows = orderedProfiles.map((profile) => buildClientBulkDataRow(type, profile));
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
