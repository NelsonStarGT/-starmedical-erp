import Link from "next/link";
import { cookies } from "next/headers";
import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { Download, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { tenantIdFromUser } from "@/lib/tenant";
import { formatDateForClients } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import {
  listClientsCommercial,
  type ClientCommercialListItem,
  type ClientCommercialScoreFilter,
  type ClientCommercialSort,
  type ClientsListViewMode
} from "@/lib/clients/commercialList.service";
import { buildClientListHref, mergeHrefQuery, type HrefQuery } from "@/lib/clients/list/href";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import DebouncedSearchInput from "@/components/clients/DebouncedSearchInput";
import { cn } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseView(value: string): ClientsListViewMode {
  return value === "comercial" ? "comercial" : "operativa";
}

function parseType(value: string): ClientProfileType | "" {
  if (value === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (value === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (value === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (value === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return "";
}

function parseScore(value: string): ClientCommercialScoreFilter {
  if (value === "LOW") return "LOW";
  if (value === "MEDIUM") return "MEDIUM";
  if (value === "HIGH") return "HIGH";
  return "";
}

function parseSort(value: string, view: ClientsListViewMode): ClientCommercialSort {
  const allowed: ClientCommercialSort[] = [
    "createdAt_desc",
    "createdAt_asc",
    "code_asc",
    "code_desc",
    "name_asc",
    "name_desc",
    "score_desc",
    "score_asc",
    "lastActivity_desc",
    "lastActivity_asc"
  ];
  if (allowed.includes(value as ClientCommercialSort)) {
    return value as ClientCommercialSort;
  }
  return view === "comercial" ? "lastActivity_desc" : "createdAt_desc";
}

function parsePositiveInt(value: string, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function typeLabel(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "Persona";
  if (type === ClientProfileType.COMPANY) return "Empresa";
  if (type === ClientProfileType.INSTITUTION) return "Institución";
  return "Aseguradora";
}

function statusTone(isArchived: boolean) {
  if (isArchived) return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function scoreTone(score: number) {
  if (score < 50) return "text-rose-700";
  if (score < 80) return "text-amber-700";
  return "text-emerald-700";
}

export default async function ClientesListaPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const currentUser = await getSessionUserFromCookies(cookies());
  const tenantId = tenantIdFromUser(currentUser);
  const dateFormat = await getClientsDateFormat(tenantId);

  const view = parseView(firstValue(resolved?.view));
  const q = firstValue(resolved?.q).trim();
  const type = parseType(firstValue(resolved?.type));
  const statusId = firstValue(resolved?.status).trim();
  const acquisitionSourceId = firstValue(resolved?.source).trim();
  const activityOrLine = firstValue(resolved?.activity).trim();
  const location = firstValue(resolved?.location).trim();
  const score = parseScore(firstValue(resolved?.score));
  const dateFrom = firstValue(resolved?.dateFrom).trim();
  const dateTo = firstValue(resolved?.dateTo).trim();
  const includeArchived = firstValue(resolved?.includeArchived) === "1";
  const pageSize = parsePositiveInt(firstValue(resolved?.pageSize), 25, 10, 100);
  const page = parsePositiveInt(firstValue(resolved?.page), 1, 1, 5000);
  const sort = parseSort(firstValue(resolved?.sort), view);

  const [statusOptions, sourceOptions, result] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.clientAcquisitionSource.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true }
    }),
    listClientsCommercial({
      tenantId,
      q,
      type,
      statusId,
      acquisitionSourceId,
      activityOrLine,
      location,
      score,
      dateFrom,
      dateTo,
      includeArchived,
      page,
      pageSize,
      sort
    })
  ]);

  const queryObject: HrefQuery = {
    view,
    q: q || undefined,
    type: type || undefined,
    status: statusId || undefined,
    source: acquisitionSourceId || undefined,
    activity: activityOrLine || undefined,
    location: location || undefined,
    score: score || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    includeArchived: includeArchived ? "1" : undefined,
    sort: sort || undefined,
    pageSize: String(pageSize)
  };

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const currentPage = Math.min(Math.max(1, result.page), totalPages);

  const exportHref =
    type
      ? buildClientListHref("/api/admin/clientes/export/csv", {
          type,
          q: q || undefined,
          status: statusId || undefined,
          includeArchived: includeArchived ? "1" : undefined
        })
      : null;

  const commonColumns = [
    {
      header: "Correlativo",
      width: "w-[120px]",
      render: (row: ClientCommercialListItem) => <span className="font-mono text-xs font-semibold text-slate-700">{row.clientCode ?? "—"}</span>
    },
    {
      header: "Cliente",
      width: "w-[260px]",
      render: (row: ClientCommercialListItem) => (
        <div className="space-y-1">
          <Link href={`/admin/clientes/${row.id}`} className="font-semibold text-slate-900 hover:text-[#2e75ba]">
            {row.displayName}
          </Link>
          <p className="text-xs text-slate-500">{row.identifier ?? "Sin documento"}</p>
        </div>
      )
    },
    {
      header: "Tipo",
      width: "w-[130px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{typeLabel(row.type)}</span>
    }
  ];

  const operationalColumns = [
    ...commonColumns,
    {
      header: "Contacto",
      width: "w-[220px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.primaryContact ?? "—"}</span>
    },
    {
      header: "Estado",
      width: "w-[140px]",
      render: (row: ClientCommercialListItem) => (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", statusTone(row.isArchived))}>
          {row.statusLabel ?? (row.isArchived ? "Archivado" : "Activo")}
        </span>
      )
    },
    {
      header: "Score",
      width: "w-[90px]",
      render: (row: ClientCommercialListItem) => <span className={cn("font-semibold", scoreTone(row.healthScore))}>{row.healthScore}%</span>
    },
    {
      header: "Creado",
      width: "w-[140px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-600">{formatDateForClients(row.createdAt, dateFormat)}</span>
    }
  ];

  const commercialColumns = [
    ...commonColumns,
    {
      header: "NIT",
      width: "w-[150px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.identifier ?? "—"}</span>
    },
    {
      header: "Canal",
      width: "w-[160px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.acquisitionChannel ?? "—"}</span>
    },
    {
      header: "Actividad / ramo",
      width: "w-[220px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.activityOrLine ?? "—"}</span>
    },
    {
      header: "Ubicación",
      width: "w-[220px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.locationLabel ?? "—"}</span>
    },
    {
      header: "Contacto principal",
      width: "w-[220px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{row.primaryContact ?? "—"}</span>
    },
    {
      header: "Estado",
      width: "w-[130px]",
      render: (row: ClientCommercialListItem) => (
        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", statusTone(row.isArchived))}>
          {row.statusLabel ?? (row.isArchived ? "Archivado" : "Activo")}
        </span>
      )
    },
    {
      header: "Última actividad",
      width: "w-[150px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-600">{formatDateForClients(row.lastActivityAt, dateFormat)}</span>
    }
  ];

  const columns = view === "comercial" ? commercialColumns : operationalColumns;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes · Lista</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Lista de Clientes
            </h1>
            <p className="text-sm text-slate-600">Vista operativa y comercial unificada, con búsqueda por correlativo y filtros de negocio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildClientListHref("/admin/clientes/lista", { ...queryObject, view: "operativa", page: undefined })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                view === "operativa"
                  ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
            >
              Operativa
            </Link>
            <Link
              href={buildClientListHref("/admin/clientes/lista", { ...queryObject, view: "comercial", page: undefined })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                view === "comercial"
                  ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
            >
              Comercial
            </Link>
          </div>
        </div>
      </section>

      <FilterBar
        actions={
          <>
            <Link
              href="/admin/clientes/personas/nuevo"
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
            >
              <Plus size={16} />
              Crear cliente
            </Link>
            {exportHref ? (
              <Link
                href={exportHref}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                <Download size={16} />
                Exportar CSV
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                Exportar CSV (selecciona un tipo)
              </span>
            )}
          </>
        }
      >
        <form action="/admin/clientes/lista" method="GET" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="view" value={view} />
          <DebouncedSearchInput
            basePath="/admin/clientes/lista"
            initialValue={q}
            query={{ ...queryObject, page: undefined, error: undefined }}
            placeholder="Nombre, NIT/DPI, correlativo, teléfono o email..."
          />

          <select name="type" defaultValue={type} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Tipo (todos)</option>
            <option value={ClientProfileType.PERSON}>Persona</option>
            <option value={ClientProfileType.COMPANY}>Empresa</option>
            <option value={ClientProfileType.INSTITUTION}>Institución</option>
            <option value={ClientProfileType.INSURER}>Aseguradora</option>
          </select>

          <select name="status" defaultValue={statusId} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Estado (todos)</option>
            {statusOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select name="source" defaultValue={acquisitionSourceId} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Canal (todos)</option>
            {sourceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <input
            name="activity"
            defaultValue={activityOrLine}
            placeholder="Actividad / ramo"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />

          <input
            name="location"
            defaultValue={location}
            placeholder="Ubicación"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />

          <select name="score" defaultValue={score} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Score (todos)</option>
            <option value="LOW">Bajo (&lt;50)</option>
            <option value="MEDIUM">Medio (50-79)</option>
            <option value="HIGH">Alto (80+)</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Desde
            <input type="date" name="dateFrom" defaultValue={dateFrom} className="bg-transparent text-sm outline-none" />
          </label>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Hasta
            <input type="date" name="dateTo" defaultValue={dateTo} className="bg-transparent text-sm outline-none" />
          </label>

          <select name="sort" defaultValue={sort} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="createdAt_desc">Orden: creados reciente</option>
            <option value="createdAt_asc">Orden: creados antiguo</option>
            <option value="code_asc">Orden: código asc</option>
            <option value="code_desc">Orden: código desc</option>
            <option value="name_asc">Orden: nombre asc</option>
            <option value="name_desc">Orden: nombre desc</option>
            <option value="score_desc">Orden: score alto</option>
            <option value="score_asc">Orden: score bajo</option>
            <option value="lastActivity_desc">Orden: última actividad reciente</option>
            <option value="lastActivity_asc">Orden: última actividad antigua</option>
          </select>

          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="includeArchived" value="1" defaultChecked={includeArchived} className="h-4 w-4" />
            Incluir archivados
          </label>

          <button type="submit" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]">
            Aplicar
          </button>
        </form>
      </FilterBar>

      <DataTable<ClientCommercialListItem>
        columns={columns}
        data={result.items}
        empty={
          <EmptyState
            title="Sin resultados"
            description="No hay clientes para los filtros seleccionados."
            action={
              <Link href="/admin/clientes/personas/nuevo" className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]">
                <Plus size={16} />
                Crear cliente
              </Link>
            }
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Mostrando <span className="font-semibold text-slate-900">{result.items.length}</span> de{" "}
          <span className="font-semibold text-slate-900">{result.total}</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildClientListHref(
              "/admin/clientes/lista",
              mergeHrefQuery(queryObject, { page: currentPage > 1 ? String(currentPage - 1) : undefined })
            )}
            className={cn(
              "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
              currentPage <= 1 && "pointer-events-none opacity-50"
            )}
          >
            Anterior
          </Link>
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Página {currentPage} de {totalPages}
          </span>
          <Link
            href={buildClientListHref(
              "/admin/clientes/lista",
              mergeHrefQuery(queryObject, { page: currentPage < totalPages ? String(currentPage + 1) : undefined })
            )}
            className={cn(
              "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
              currentPage >= totalPages && "pointer-events-none opacity-50"
            )}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}
