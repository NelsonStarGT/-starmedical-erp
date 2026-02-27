import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { Download, Eye, Mail, MessageCircle, Phone, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { tenantIdFromUser } from "@/lib/tenant";
import { formatDateForClients } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { listClientsCommercial, type ClientCommercialListItem, type ClientCommercialSort } from "@/lib/clients/commercialList.service";
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

function parseType(value: string): ClientProfileType | "" {
  if (value === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (value === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (value === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (value === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return "";
}

function parseSort(value: string): ClientCommercialSort {
  if (value === "name_asc") return "name_asc";
  return "createdAt_desc";
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

function CompactAction({
  href,
  label,
  icon,
  external = false
}: {
  href?: string | null;
  label: string;
  icon: ReactNode;
  external?: boolean;
}) {
  if (!href) {
    return (
      <span
        title="No disponible"
        aria-label={`${label} no disponible`}
        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400"
      >
        {icon}
      </span>
    );
  }

  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
    >
      {icon}
    </a>
  );
}

export default async function ClientesListaPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const currentUser = await getSessionUserFromCookies(cookies());
  if (!currentUser) redirect("/login");
  const tenantId = tenantIdFromUser(currentUser);
  const dateFormat = await getClientsDateFormat(tenantId);

  const q = firstValue(resolved?.q).trim();
  const type = parseType(firstValue(resolved?.type));
  const statusId = firstValue(resolved?.status).trim();
  const includeArchived = firstValue(resolved?.includeArchived) === "1";
  const pageSize = parsePositiveInt(firstValue(resolved?.pageSize), 10, 10, 10);
  const page = parsePositiveInt(firstValue(resolved?.page), 1, 1, 5000);
  const sort = parseSort(firstValue(resolved?.sort));

  const [statusOptions, result] = await Promise.all([
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    listClientsCommercial({
      tenantId,
      q,
      type,
      statusId,
      includeArchived,
      page,
      pageSize,
      sort
    })
  ]);

  const queryObject: HrefQuery = {
    q: q || undefined,
    type: type || undefined,
    status: statusId || undefined,
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

  const columns = [
    {
      header: "Correlativo",
      width: "w-[120px]",
      render: (row: ClientCommercialListItem) => <span className="font-mono text-xs font-semibold text-slate-700">{row.clientCode ?? "—"}</span>
    },
    {
      header: "Cliente",
      width: "w-[280px]",
      render: (row: ClientCommercialListItem) => (
        <div className="space-y-1">
          <Link href={`/admin/clientes/${row.id}`} className="font-semibold text-slate-900 hover:text-[#2e75ba]">
            {row.displayName}
          </Link>
          {row.identifier ? <p className="text-xs text-slate-500">{row.identifier}</p> : null}
        </div>
      )
    },
    {
      header: "Tipo",
      width: "w-[140px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-700">{typeLabel(row.type)}</span>
    },
    {
      header: "Contacto principal",
      width: "w-[220px]",
      render: (row: ClientCommercialListItem) => (
        <div className="space-y-0.5 text-sm text-slate-700">
          <p>{row.primaryPhone ?? "—"}</p>
          <p className="text-xs text-slate-500">{row.primaryEmail ?? "—"}</p>
        </div>
      )
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
      header: "Creado",
      width: "w-[140px]",
      render: (row: ClientCommercialListItem) => <span className="text-slate-600">{formatDateForClients(row.createdAt, dateFormat)}</span>
    },
    {
      header: "Acciones",
      width: "w-[210px]",
      render: (row: ClientCommercialListItem) => (
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={`/admin/clientes/${row.id}`}
            title="Ver perfil"
            aria-label="Ver perfil"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            <Eye size={14} />
          </Link>
          <CompactAction href={row.primaryPhoneHref} label="Llamar" icon={<Phone size={14} />} />
          <CompactAction href={row.whatsappHref} label="WhatsApp" icon={<MessageCircle size={14} />} external />
          <CompactAction href={row.primaryEmailHref} label="Email" icon={<Mail size={14} />} />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes · Lista</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Lista de Clientes
            </h1>
            <p className="text-sm text-slate-600">Catálogo maestro para consultar y gestionar la base de clientes del ERP.</p>
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

          <select name="sort" defaultValue={sort} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="createdAt_desc">Orden: creados reciente</option>
            <option value="name_asc">Orden: A-Z</option>
          </select>

          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="10">10 por página</option>
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
