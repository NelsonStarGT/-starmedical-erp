import Link from "next/link";
import { ClientProfileType } from "@prisma/client";
import { Download, FilterX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getClientsReportList, getClientsReportSummary, type ClientsReportFilters } from "@/lib/clients/reports.service";

type SearchParams = {
  q?: string | string[];
  type?: string | string[];
  from?: string | string[];
  to?: string | string[];
  country?: string | string[];
  sourceId?: string | string[];
  detailId?: string | string[];
  referred?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

const TYPE_OPTIONS: Array<{ value: "ALL" | ClientProfileType; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: ClientProfileType.PERSON, label: "Persona" },
  { value: ClientProfileType.COMPANY, label: "Empresa" },
  { value: ClientProfileType.INSTITUTION, label: "Institución" },
  { value: ClientProfileType.INSURER, label: "Aseguradora" }
];

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildFilters(searchParams?: SearchParams): ClientsReportFilters {
  const page = Number(firstValue(searchParams?.page) || "1");
  const pageSize = Number(firstValue(searchParams?.pageSize) || "25");
  const rawType = firstValue(searchParams?.type);

  return {
    q: firstValue(searchParams?.q)?.trim() || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(firstValue(searchParams?.from) || null),
    to: parseDate(firstValue(searchParams?.to) || null),
    country: firstValue(searchParams?.country) || undefined,
    acquisitionSourceId: firstValue(searchParams?.sourceId) || undefined,
    acquisitionDetailOptionId: firstValue(searchParams?.detailId) || undefined,
    referredOnly: firstValue(searchParams?.referred) === "1",
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25
  };
}

function buildQuery(next: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (!value) continue;
    params.set(key, value);
  }
  return params.toString();
}

export default async function ClientesReportesPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filters = buildFilters(resolvedSearchParams);

  const [summary, list, sources, sourceDetails, countries] = await Promise.all([
    getClientsReportSummary(filters),
    getClientsReportList(filters),
    prisma.clientAcquisitionSource.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true }
    }),
    prisma.clientAcquisitionDetailOption.findMany({
      where: { isActive: true },
      orderBy: [{ source: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, sourceId: true }
    }),
    prisma.geoCountry.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { name: true }
    })
  ]);

  const queryParams = {
    q: filters.q || "",
    type: filters.type && filters.type !== "ALL" ? filters.type : "ALL",
    from: filters.from ? filters.from.toISOString().slice(0, 10) : "",
    to: filters.to ? filters.to.toISOString().slice(0, 10) : "",
    country: filters.country || "",
    sourceId: filters.acquisitionSourceId || "",
    detailId: filters.acquisitionDetailOptionId || "",
    referred: filters.referredOnly ? "1" : "",
    pageSize: String(filters.pageSize || 25)
  };

  const chips: Array<{ key: string; label: string }> = [];
  if (queryParams.q) chips.push({ key: "q", label: `Buscar: ${queryParams.q}` });
  if (queryParams.type && queryParams.type !== "ALL") chips.push({ key: "type", label: `Tipo: ${queryParams.type}` });
  if (queryParams.country) chips.push({ key: "country", label: `País: ${queryParams.country}` });
  if (queryParams.sourceId) {
    const sourceLabel = sources.find((source) => source.id === queryParams.sourceId)?.name || "Canal";
    chips.push({ key: "sourceId", label: `Canal: ${sourceLabel}` });
  }
  if (queryParams.detailId) {
    const detailLabel = sourceDetails.find((detail) => detail.id === queryParams.detailId)?.name || "Detalle";
    chips.push({ key: "detailId", label: `Detalle: ${detailLabel}` });
  }
  if (queryParams.from) chips.push({ key: "from", label: `Desde: ${queryParams.from}` });
  if (queryParams.to) chips.push({ key: "to", label: `Hasta: ${queryParams.to}` });
  if (queryParams.referred) chips.push({ key: "referred", label: "Solo referidos" });

  const exportQuery = buildQuery({
    q: queryParams.q || undefined,
    type: queryParams.type !== "ALL" ? queryParams.type : undefined,
    from: queryParams.from || undefined,
    to: queryParams.to || undefined,
    country: queryParams.country || undefined,
    sourceId: queryParams.sourceId || undefined,
    detailId: queryParams.detailId || undefined,
    referred: queryParams.referred || undefined
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Reportes operativos y marketing
        </h1>
        <p className="text-sm text-slate-600">Filtros avanzados, comparativos y exportación reproducible.</p>
      </section>

      {summary.referrals.source === "compat" && summary.referrals.warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {summary.referrals.warning}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Total en rango" value={summary.totalInRange} />
        <Kpi label="Con documento" value={`${summary.withDocumentPct}%`} />
        <Kpi label="Con teléfono" value={`${summary.withPhonePct}%`} />
        <Kpi label="Con email" value={`${summary.withEmailPct}%`} />
        <Kpi label="Con birthDate" value={`${summary.withBirthDatePct}%`} />
        <Kpi label="Referidos" value={summary.referrals.totalEdges} />
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <form method="GET" className="grid gap-2 md:grid-cols-4 lg:grid-cols-8">
          <input
            name="q"
            defaultValue={queryParams.q}
            placeholder="Buscar por nombre, documento, teléfono o email"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
          />

          <select name="type" defaultValue={queryParams.type} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="country"
            defaultValue={queryParams.country}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">País (todos)</option>
            {countries.map((country) => (
              <option key={country.name} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>

          <select
            name="sourceId"
            defaultValue={queryParams.sourceId}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Canal (todos)</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
              ))}
            </select>

          <select
            name="detailId"
            defaultValue={queryParams.detailId}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Detalle canal (todos)</option>
            {sourceDetails
              .filter((detail) => !queryParams.sourceId || detail.sourceId === queryParams.sourceId)
              .map((detail) => (
                <option key={detail.id} value={detail.id}>
                  {detail.name}
                </option>
              ))}
          </select>

          <input name="from" type="date" defaultValue={queryParams.from} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          <input name="to" type="date" defaultValue={queryParams.to} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="referred" value="1" defaultChecked={Boolean(queryParams.referred)} className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]" />
            Solo referidos
          </label>

          <input type="hidden" name="pageSize" value={queryParams.pageSize} />
          <div className="md:col-span-4 lg:col-span-8 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
            >
              Aplicar filtros
            </button>
            <Link
              href="/admin/clientes/reportes"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <FilterX size={15} />
              Limpiar
            </Link>
            <Link
              href={`/api/clientes/reportes/export?format=csv&${exportQuery}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Download size={15} />
              Exportar CSV
            </Link>
            <Link
              href={`/api/clientes/reportes/export?format=xlsx&${exportQuery}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Download size={15} />
              Exportar Excel
            </Link>
            <Link
              href={`/api/clientes/reportes/export?format=pdf&${exportQuery}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Download size={15} />
              Exportar PDF
            </Link>
          </div>
        </form>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={chip.key} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <SimpleTable
          title="Top canales"
          rows={summary.bySource.map((row) => ({ label: row.sourceName, value: row.total }))}
          emptyLabel="Sin canales para este rango"
        />
        <SimpleTable
          title="Top referrers"
          rows={summary.referrals.topReferrers.map((row) => ({ label: row.referrerLabel, value: row.total }))}
          emptyLabel="Sin referidos para este rango"
        />
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Fecha creación</th>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Ubicación</th>
                <th className="px-3 py-2 text-left font-semibold">Contacto</th>
                <th className="px-3 py-2 text-left font-semibold">Canal</th>
                <th className="px-3 py-2 text-left font-semibold">Detalle canal</th>
                <th className="px-3 py-2 text-left font-semibold">Referido por</th>
                <th className="px-3 py-2 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                    No hay resultados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                list.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2">{item.createdAt.toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.displayName}</td>
                    <td className="px-3 py-2">{item.type}</td>
                    <td className="px-3 py-2">{[item.department, item.city, item.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-3 py-2">{item.phone || item.email || "—"}</td>
                    <td className="px-3 py-2">{item.acquisitionSource || "—"}</td>
                    <td className="px-3 py-2">{item.acquisitionDetail || "—"}</td>
                    <td className="px-3 py-2">{item.referredBy || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/clientes/${item.id}`}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <p>
            Mostrando {(list.page - 1) * list.pageSize + 1}–{Math.min(list.page * list.pageSize, list.total)} de {list.total}
          </p>
          <div className="flex gap-2">
            <Link
              href={
                list.page > 1
                  ? `/admin/clientes/reportes?${buildQuery({
                      ...queryParams,
                      page: String(list.page - 1)
                    })}`
                  : "#"
              }
              className={
                list.page > 1
                  ? "rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                  : "cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold text-slate-400"
              }
            >
              Prev
            </Link>
            <Link
              href={
                list.page < list.totalPages
                  ? `/admin/clientes/reportes?${buildQuery({
                      ...queryParams,
                      page: String(list.page + 1)
                    })}`
                  : "#"
              }
              className={
                list.page < list.totalPages
                  ? "rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                  : "cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold text-slate-400"
              }
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function SimpleTable({
  title,
  rows,
  emptyLabel
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">{title}</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fafc] text-[#2e75ba]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Nombre</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-3 text-center text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.label}-${index}`} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
