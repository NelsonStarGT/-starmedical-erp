import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { Download, Plus } from "lucide-react";
import { actionApplyBulkClientMutation } from "@/app/admin/clientes/actions";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { listClients, type ClientListItem, type ClientListKpis } from "@/lib/clients/list.service";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { ClientStatusBadge } from "@/components/clients/ClientStatusBadge";
import AlertBadges from "@/components/clients/AlertBadges";
import ClientCsvImportButton from "@/components/clients/ClientCsvImportButton";
import ClientListKpiStrip from "@/components/clients/ClientListKpiStrip";
import DebouncedSearchInput from "@/components/clients/DebouncedSearchInput";
import ClientRowActions from "@/components/clients/ClientRowActions";
import { buildClientListHref, mergeHrefQuery, type HrefQuery } from "@/lib/clients/list/href";
import { parseClientListSearchParams, toSearchParamsObject, type ClientListSearchParams } from "@/lib/clients/list/searchParams";
import { getClientDocumentPermissions } from "@/lib/clients/permissions";
import { cn } from "@/lib/utils";

export type ClientListKind = "PERSON" | "COMPANY" | "INSURER" | "INSTITUTION";

export type ClientListPageSearchParams = Record<string, string | string[] | undefined>;

export type ColumnDef<Row> = {
  header: string;
  width?: string;
  render: (row: Row) => ReactNode;
};

export type ClientListFetchResult<Row> = {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  kpis: ClientListKpis;
};

export type ClientListConfig<Row> = {
  kind: ClientListKind;
  profileType: ClientProfileType;
  title: string;
  entityHeader: string;
  basePath: string;
  createPath: string;
  createLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  filters?: {
    showStatus?: boolean;
    showAlert?: boolean;
    pageSizeOptions?: number[];
  };
  columns: ColumnDef<Row>[];
  fetcher: (params: ClientListSearchParams) => Promise<ClientListFetchResult<Row>>;
};

function kindToProfileType(kind: ClientListKind) {
  if (kind === "PERSON") return ClientProfileType.PERSON;
  if (kind === "COMPANY") return ClientProfileType.COMPANY;
  if (kind === "INSURER") return ClientProfileType.INSURER;
  return ClientProfileType.INSTITUTION;
}

function buildBaseColumns(kind: ClientListKind): ColumnDef<ClientListItem>[] {
  return [
    {
      header: kind === "PERSON" ? "Persona" : kind === "COMPANY" ? "Empresa" : kind === "INSURER" ? "Aseguradora" : "Institución",
      render: (row) =>
        row.isArchived ? (
          <span className="font-semibold text-slate-700">{row.displayName}</span>
        ) : (
          <Link href={`/admin/clientes/${row.id}`} className="font-semibold text-slate-900 hover:text-diagnostics-corporate">
            {row.displayName}
          </Link>
        )
    },
    {
      header: kind === "PERSON" ? "DPI" : "NIT",
      width: "w-[160px]",
      render: (row) => <span className="text-slate-700">{row.identifier ?? "—"}</span>
    },
    ...(kind === "INSTITUTION"
      ? [
          {
            header: "Tipo",
            width: "w-[180px]",
            render: (row: ClientListItem) => <span className="text-slate-700">{row.institutionTypeName ?? "—"}</span>
          } satisfies ColumnDef<ClientListItem>
        ]
      : []),
    {
      header: "Contacto",
      width: "w-[220px]",
      render: (row) => (
        <div className="text-sm text-slate-700">
          <div>{row.phone ?? "—"}</div>
          <div className="text-xs text-slate-500">{row.email ?? ""}</div>
        </div>
      )
    },
    {
      header: "Estado",
      width: "w-[140px]",
      render: (row) => <ClientStatusBadge isArchived={row.isArchived} statusLabel={row.statusLabel} />
    },
    {
      header: "Health",
      width: "w-[130px]",
      render: (row) => {
        const missingPreview = row.requiredMissingLabels.slice(0, 5);
        const tooltip = missingPreview.length
          ? `Faltan: ${missingPreview.join(", ")}${row.requiredMissingLabels.length > 5 ? "..." : ""}`
          : "Checklist requerido al día";

        return (
          <div className="space-y-1" title={tooltip}>
          <p className="text-sm font-semibold text-slate-900">{row.healthScore}%</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full rounded-full",
                row.healthScore < 50 ? "bg-rose-500" : row.healthScore < 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${row.healthScore}%` }}
            />
          </div>
        </div>
        );
      }
    },
    {
      header: "Alertas",
      render: (row) => (
        <AlertBadges
          isIncomplete={row.isIncomplete}
          hasExpiredDocs={row.hasExpiredDocs}
          hasExpiringDocs={row.hasExpiringDocs}
          expiredDocsPreview={row.expiredDocsPreview}
          expiringDocsPreview={row.expiringDocsPreview}
        />
      )
    }
  ];
}

function buildActionsColumn({
  canViewDocs,
  kind
}: {
  canViewDocs: boolean;
  kind: ClientListKind;
}): ColumnDef<ClientListItem> {
  return {
    header: "Acciones",
    width: kind === "PERSON" ? "w-[156px]" : "w-[120px]",
    render: (row) => (
      <ClientRowActions
        row={{
          id: row.id,
          displayName: row.displayName,
          identifier: row.identifier,
          phone: row.phone,
          email: row.email,
          statusLabel: row.statusLabel,
          isIncomplete: row.isIncomplete,
          healthScore: row.healthScore,
          hasExpiredDocs: row.hasExpiredDocs,
          hasExpiringDocs: row.hasExpiringDocs,
          isArchived: row.isArchived
        }}
        canViewDocs={canViewDocs}
        mode={kind === "PERSON" ? "direct" : "menu"}
      />
    )
  };
}

function buildSelectionColumn(): ColumnDef<ClientListItem> {
  return {
    header: "",
    width: "w-[48px]",
    render: (row) => (
      <label className="inline-flex items-center justify-center">
        <input
          type="checkbox"
          name="ids"
          value={row.id}
          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          aria-label={`Seleccionar ${row.displayName}`}
        />
      </label>
    )
  };
}

async function defaultFetcher(type: ClientProfileType, params: ClientListSearchParams): Promise<ClientListFetchResult<ClientListItem>> {
  const result = await listClients({
    type,
    q: params.q,
    statusId: params.status || undefined,
    alert: params.alertFilter || undefined,
    includeArchived: params.includeArchivedBool,
    page: params.page,
    pageSize: params.pageSize
  });

  return {
    rows: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    kpis: result.kpis
  };
}

export function createClientListConfig(kind: ClientListKind): ClientListConfig<ClientListItem> {
  const profileType = kindToProfileType(kind);
  const map = {
    PERSON: {
      title: "Personas",
      basePath: "/admin/clientes/personas",
      createPath: "/admin/clientes/personas/nuevo",
      createLabel: "Crear persona",
      searchPlaceholder: "Nombre, DPI o teléfono…",
      emptyTitle: "Sin personas"
    },
    COMPANY: {
      title: "Empresas",
      basePath: "/admin/clientes/empresas",
      createPath: "/admin/clientes/empresas/nuevo",
      createLabel: "Crear empresa",
      searchPlaceholder: "Nombre, NIT, email o teléfono…",
      emptyTitle: "Sin empresas"
    },
    INSURER: {
      title: "Aseguradoras",
      basePath: "/admin/clientes/aseguradoras",
      createPath: "/admin/clientes/aseguradoras/nuevo",
      createLabel: "Crear aseguradora",
      searchPlaceholder: "Nombre, NIT, email o teléfono…",
      emptyTitle: "Sin aseguradoras"
    },
    INSTITUTION: {
      title: "Instituciones",
      basePath: "/admin/clientes/instituciones",
      createPath: "/admin/clientes/instituciones/nuevo",
      createLabel: "Crear institución",
      searchPlaceholder: "Nombre, NIT, email o teléfono…",
      emptyTitle: "Sin instituciones"
    }
  }[kind];

  return {
    kind,
    profileType,
    title: map.title,
    entityHeader: kind === "PERSON" ? "Persona" : kind === "COMPANY" ? "Empresa" : kind === "INSURER" ? "Aseguradora" : "Institución",
    basePath: map.basePath,
    createPath: map.createPath,
    createLabel: map.createLabel,
    searchPlaceholder: map.searchPlaceholder,
    emptyTitle: map.emptyTitle,
    filters: {
      showStatus: true,
      showAlert: true,
      pageSizeOptions: [10, 25, 50]
    },
    columns: buildBaseColumns(kind),
    fetcher: (params) => defaultFetcher(profileType, params)
  };
}

export async function ClientListEngine({
  config,
  searchParams
}: {
  config: ClientListConfig<ClientListItem>;
  searchParams?: ClientListPageSearchParams;
}) {
  const parsed = parseClientListSearchParams(searchParams);
  const pageSizeOptions = config.filters?.pageSizeOptions ?? [10, 25, 50];

  const queryObject = toSearchParamsObject(parsed);
  const queryForTabs: HrefQuery = {
    q: queryObject.q,
    status: queryObject.status,
    alert: queryObject.alert,
    includeArchived: queryObject.includeArchived,
    pageSize: queryObject.pageSize
  };

  const [statuses, result] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    config.fetcher(parsed)
  ]);
  const currentUser = await getSessionUserFromCookies(cookies());
  const canBulkMutate = Boolean(currentUser && isAdmin(currentUser));
  const docPermissions = getClientDocumentPermissions(currentUser);
  const columns = [
    ...(canBulkMutate ? [buildSelectionColumn()] : []),
    ...config.columns,
    buildActionsColumn({ canViewDocs: docPermissions.canViewDocs, kind: config.kind })
  ];

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const currentPage = Math.min(Math.max(1, result.page), totalPages);

  const listBaseQuery: HrefQuery = {
    ...queryObject,
    page: parsed.page > 1 ? String(parsed.page) : undefined,
    pageSize: String(parsed.pageSize)
  };

  const exportHref = buildClientListHref("/api/admin/clientes/export/csv", {
    ...queryForTabs,
    type: config.profileType
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Clientes · {config.title}</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          {config.title}
        </h2>
        <p className="text-sm text-slate-600">Motor unificado de listas con filtros, KPIs y flujo power-user.</p>
      </div>

      <ClientListKpiStrip basePath={config.basePath} currentQuery={queryForTabs} kpis={result.kpis} activeAlert={parsed.alert} />

      {parsed.error === "not_found" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No encontrado: no hay coincidencias para <span className="font-semibold">{parsed.q || "la búsqueda solicitada"}</span>.
        </div>
      )}

      <FilterBar
        actions={
          <>
            <Link
              href={config.createPath}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]"
              style={{ backgroundColor: "#4aa59c", color: "#ffffff" }}
            >
              <Plus size={16} />
              {config.createLabel}
            </Link>
            <Link
              href={exportHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Download size={16} />
              Exportar CSV
            </Link>
            <ClientCsvImportButton type={config.profileType} />
          </>
        }
      >
        <form className="flex flex-wrap items-center gap-2" action={config.basePath} method="GET">
          <DebouncedSearchInput
            basePath={config.basePath}
            initialValue={parsed.q}
            query={queryForTabs}
            placeholder={config.searchPlaceholder}
            delayMs={350}
          />

          {config.filters?.showStatus !== false && statuses.length > 0 && (
            <select
              name="status"
              defaultValue={parsed.status}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">Estado (todos)</option>
              {statuses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}

          {config.filters?.showAlert !== false && (
            <select
              name="alert"
              defaultValue={parsed.alert}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">Alertas (todas)</option>
              <option value="INCOMPLETE">Incompleto</option>
              <option value="DOCS_EXPIRED">Docs vencidos</option>
              <option value="DOCS_EXPIRING">Docs por vencer</option>
              <option value="REQUIRED_PENDING">Requeridos pendientes</option>
              <option value="REQUIRED_REJECTED">Requeridos rechazados</option>
              <option value="REQUIRED_EXPIRED">Requeridos vencidos</option>
            </select>
          )}

          <select
            name="pageSize"
            defaultValue={String(parsed.pageSize)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="includeArchived"
              value="1"
              defaultChecked={parsed.includeArchivedBool}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
            />
            Incluir archivados
          </label>

          <button
            type="submit"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-diagnostics-secondary hover:text-diagnostics-corporate"
          >
            Aplicar
          </button>
        </form>
      </FilterBar>

      {canBulkMutate ? (
        <form action={actionApplyBulkClientMutation} className="space-y-3">
          <input type="hidden" name="type" value={config.profileType} />
          {queryForTabs.q && <input type="hidden" name="q" value={queryForTabs.q} />}
          {queryForTabs.status && <input type="hidden" name="status" value={queryForTabs.status} />}
          {queryForTabs.alert && <input type="hidden" name="alert" value={queryForTabs.alert} />}
          {queryForTabs.includeArchived && <input type="hidden" name="includeArchived" value={queryForTabs.includeArchived} />}

          <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acciones masivas</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                name="intent"
                value="archive"
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Archivar seleccionados
              </button>
              <button
                type="submit"
                name="intent"
                value="restore"
                className="rounded-full border border-[#4aadf5] bg-[#f1f8ff] px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:bg-[#e3f1ff]"
              >
                Restaurar seleccionados
              </button>
              <select
                name="bulkStatusId"
                defaultValue=""
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="">Cambiar estado...</option>
                {statuses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                name="intent"
                value="status"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                Aplicar estado
              </button>
              <button
                type="submit"
                formAction="/api/admin/clientes/export/csv"
                formMethod="GET"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                <Download size={16} />
                Exportar seleccionados
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Selecciona filas en la tabla y ejecuta la acción. Las acciones aplican permisos de backend.
            </p>
          </section>

          <DataTable<ClientListItem>
            columns={columns.map((col) => ({
              header: col.header,
              width: col.width,
              render: (row) => col.render(row)
            }))}
            data={result.rows}
            empty={
              <EmptyState
                title={config.emptyTitle}
                description="No hay registros con estos filtros."
                action={
                  <Link
                    href={config.createPath}
                    className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
                    style={{ backgroundColor: "#4aa59c", color: "#ffffff" }}
                  >
                    <Plus size={16} />
                    {config.createLabel}
                  </Link>
                }
              />
            }
          />
        </form>
      ) : (
        <DataTable<ClientListItem>
          columns={columns.map((col) => ({
            header: col.header,
            width: col.width,
            render: (row) => col.render(row)
          }))}
          data={result.rows}
          empty={
            <EmptyState
              title={config.emptyTitle}
              description="No hay registros con estos filtros."
              action={
                <Link
                  href={config.createPath}
                  className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
                  style={{ backgroundColor: "#4aa59c", color: "#ffffff" }}
                >
                  <Plus size={16} />
                  {config.createLabel}
                </Link>
              }
            />
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Mostrando <span className="font-semibold text-slate-900">{result.rows.length}</span> de{" "}
          <span className="font-semibold text-slate-900">{result.total}</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildClientListHref(
              config.basePath,
              mergeHrefQuery(listBaseQuery, { page: currentPage > 1 ? String(currentPage - 1) : undefined })
            )}
            className={cn(
              "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
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
              config.basePath,
              mergeHrefQuery(listBaseQuery, { page: currentPage < totalPages ? String(currentPage + 1) : undefined })
            )}
            className={cn(
              "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
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
