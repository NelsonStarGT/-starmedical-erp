import Link from "next/link";
import { CompanyContractStatus, CompanyKind, CompanyStatus } from "@prisma/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { listCompanies } from "@/lib/companies/services/company.service";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { parseCompanyListSearchParams, type CompanyListPageSearchParams } from "@/lib/companies/list/searchParams";

const KIND_LABEL: Record<CompanyKind, string> = {
  COMPANY: "Empresa",
  INSTITUTION: "Institución",
  INSURER: "Aseguradora"
};

const STATUS_LABEL: Record<CompanyStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  SUSPENDED: "Suspendida",
  ARCHIVED: "Archivada"
};

const CONTRACT_STATUS_LABEL: Record<CompanyContractStatus, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Vigente",
  SUSPENDED: "Suspendido",
  EXPIRED: "Vencido",
  TERMINATED: "Terminado"
};

function fmtDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function buildHref(basePath: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (!value) return;
    params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function CompanyListEngine({
  kind,
  basePath,
  title,
  searchParams
}: {
  kind: CompanyKind;
  basePath: string;
  title: string;
  searchParams?: CompanyListPageSearchParams;
}) {
  const parsed = parseCompanyListSearchParams(searchParams);

  const listResult = await (async () => {
    try {
      const data = await listCompanies({
        tenantId: "default",
        q: parsed.q || undefined,
        kind,
        status: parsed.status || undefined,
        contractStatus: parsed.contractStatus || undefined,
        includeArchived: parsed.includeArchived,
        page: parsed.page,
        pageSize: parsed.pageSize
      });
      return { missingCompanyTables: false, data };
    } catch (error) {
      warnDevMissingTable("admin.empresas.list", error);
      if (isPrismaMissingTableError(error)) {
        return {
          missingCompanyTables: true,
          data: {
            items: [],
            total: 0,
            page: 1,
            pageSize: parsed.pageSize,
            pageCount: 1
          }
        };
      }
      throw error;
    }
  })();

  if (listResult.missingCompanyTables) {
    return (
      <EmptyState
        title="Módulo de empresas pendiente de migración"
        description="Aplica la migración companies_module_core para habilitar Company, CompanyContact, CompanyLocation y CompanyDocument."
      />
    );
  }

  const result = listResult.data;
  const totalPages = Math.max(1, result.pageCount);
  const page = Math.min(parsed.page, totalPages);

  const sharedQuery = {
    q: parsed.q || undefined,
    status: parsed.status || undefined,
    contractStatus: parsed.contractStatus || undefined,
    includeArchived: parsed.includeArchived ? "1" : undefined,
    pageSize: String(parsed.pageSize)
  };

  const prevHref = buildHref(basePath, {
    ...sharedQuery,
    page: page > 1 ? String(page - 1) : undefined
  });

  const nextHref = buildHref(basePath, {
    ...sharedQuery,
    page: page < totalPages ? String(page + 1) : String(totalPages)
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Empresas · Listado</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">Base corporativa conectada a Company (B2B core).</p>
      </div>

      <FilterBar>
        <form className="flex flex-wrap items-center gap-2" action={basePath} method="GET">
          <input
            name="q"
            defaultValue={parsed.q}
            placeholder="Buscar por nombre, NIT, código o email…"
            className="min-w-[280px] rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />

          <select name="status" defaultValue={parsed.status} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="">Estado (todos)</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            name="contractStatus"
            defaultValue={parsed.contractStatus}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">Contrato (todos)</option>
            {Object.entries(CONTRACT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select name="pageSize" defaultValue={String(parsed.pageSize)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="10">10 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="includeArchived" value="1" defaultChecked={parsed.includeArchived} className="h-4 w-4" />
            Incluir archivadas
          </label>

          <button type="submit" className="inline-flex items-center rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white hover:bg-diagnostics-primary/90">
            Aplicar
          </button>
        </form>
      </FilterBar>

      <DataTable
        columns={[
          {
            header: "Entidad",
            render: (row) => (
              <div>
                <Link href={`/admin/empresas/${row.id}`} className="font-semibold text-slate-900 hover:text-diagnostics-corporate">
                  {row.legalName}
                </Link>
                <p className="text-xs text-slate-500">{row.tradeName || "Sin nombre comercial"}</p>
              </div>
            )
          },
          {
            header: "Tipo",
            width: "w-[130px]",
            render: (row) => <span>{KIND_LABEL[row.kind]}</span>
          },
          {
            header: "Estado",
            width: "w-[140px]",
            render: (row) => <span>{row.deletedAt ? "Archivada" : STATUS_LABEL[row.status]}</span>
          },
          {
            header: "Contrato",
            width: "w-[140px]",
            render: (row) => <span>{CONTRACT_STATUS_LABEL[row.contractStatus]}</span>
          },
          {
            header: "NIT / Código",
            width: "w-[180px]",
            render: (row) => (
              <div>
                <p>{row.taxId || "—"}</p>
                <p className="text-xs text-slate-500">{row.code || "Sin código"}</p>
              </div>
            )
          },
          {
            header: "Contacto facturación",
            width: "w-[240px]",
            render: (row) => (
              <div>
                <p>{row.billingEmail || "—"}</p>
                <p className="text-xs text-slate-500">{row.billingPhone || ""}</p>
              </div>
            )
          },
          {
            header: "Estructura",
            width: "w-[180px]",
            render: (row) => (
              <div className="text-xs text-slate-600">
                <p>Contactos: {row._count.contacts}</p>
                <p>Sedes: {row._count.locations}</p>
                <p>Docs: {row._count.documents}</p>
              </div>
            )
          },
          {
            header: "Actualizado",
            width: "w-[130px]",
            render: (row) => <span>{fmtDate(row.updatedAt)}</span>
          }
        ]}
        data={result.items}
        empty={
          <EmptyState
            title={`Sin ${title.toLowerCase()}`}
            description="No hay registros para los filtros actuales en el módulo Company."
          />
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 text-sm text-slate-600">
        <span>
          Mostrando {result.items.length} de {result.total} registros
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            className={`rounded-full border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:border-diagnostics-primary hover:text-diagnostics-corporate"}`}
          >
            Anterior
          </Link>
          <span>
            Página {page} / {totalPages}
          </span>
          <Link
            href={nextHref}
            className={`rounded-full border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:border-diagnostics-primary hover:text-diagnostics-corporate"}`}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}
