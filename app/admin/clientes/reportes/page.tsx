import Link from "next/link";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { Mail, MessageCircle, Phone } from "lucide-react";
import ClientsGeoMapPanel from "@/components/clients/reports/ClientsGeoMapPanel";
import ClientsReportsChartCard from "@/components/clients/reports/ClientsReportsChartCard";
import ClientsReportsFiltersForm from "@/components/clients/reports/ClientsReportsFiltersForm";
import ClientsReportsPanelsLayout from "@/components/clients/reports/ClientsReportsPanelsLayout";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getClientsCountryFilterFromCookies } from "@/lib/clients/countryFilterCookies.server";
import {
  canViewClientsReports,
  resolveClientsReportsExportScope
} from "@/lib/clients/reports/permissions";
import {
  formatDateForClients,
  parseClientsDateInput,
  parseIsoDateString,
  type ClientsDateFormat
} from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { CLIENTS_COUNTRY_FILTER_ALL } from "@/lib/clients/operatingCountryContext";
import {
  getClientsReportBirthdays,
  getClientsReportList,
  getClientsReportSummary,
  type ClientsReportFilters
} from "@/lib/clients/reports.service";
import { tenantIdFromUser } from "@/lib/tenant";

type SearchParams = {
  q?: string | string[];
  type?: string | string[];
  from?: string | string[];
  to?: string | string[];
  country?: string | string[];
  countryId?: string | string[];
  sourceId?: string | string[];
  detailId?: string | string[];
  referred?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
  birthMonth?: string | string[];
  birthNextDays?: string | string[];
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

function parseDate(value: string | null | undefined, dateFormat: ClientsDateFormat) {
  if (!value) return null;
  const byFormat = parseClientsDateInput(value, dateFormat);
  if (byFormat) return byFormat;
  return parseIsoDateString(value);
}

function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBirthdayMonth(value: string | undefined) {
  if (!value || value === "ALL") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 12 ? parsed : null;
}

function parseBirthdayNextDays(value: string | undefined) {
  if (!value || value === "ALL") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 90 ? parsed : null;
}

function buildFilters(
  searchParams: SearchParams | undefined,
  dateFormat: ClientsDateFormat,
  tenantId: string,
  defaultCountryId?: string | null
) {
  const page = Number(firstValue(searchParams?.page) || "1");
  const pageSize = Number(firstValue(searchParams?.pageSize) || "25");
  const rawType = firstValue(searchParams?.type);
  const countryFilterParam = defaultCountryId || CLIENTS_COUNTRY_FILTER_ALL;

  const filters: ClientsReportFilters = {
    tenantId,
    q: firstValue(searchParams?.q)?.trim() || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(firstValue(searchParams?.from) || null, dateFormat),
    to: parseDate(firstValue(searchParams?.to) || null, dateFormat),
    countryId: countryFilterParam === CLIENTS_COUNTRY_FILTER_ALL ? undefined : countryFilterParam,
    acquisitionSourceId: firstValue(searchParams?.sourceId) || undefined,
    acquisitionDetailOptionId: firstValue(searchParams?.detailId) || undefined,
    referredOnly: firstValue(searchParams?.referred) === "1",
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25
  };

  return { filters, countryFilterParam };
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
  const cookieStore = await cookies();
  const currentUser = await getSessionUserFromCookies(cookieStore);
  if (!currentUser) redirect("/login");
  if (!canViewClientsReports(currentUser)) forbidden();
  const tenantId = tenantIdFromUser(currentUser);
  const dateFormat = await getClientsDateFormat(tenantId);
  const exportScope = resolveClientsReportsExportScope(currentUser);
  const defaultCountryId = await getClientsCountryFilterFromCookies(cookieStore);
  const { filters, countryFilterParam } = buildFilters(
    resolvedSearchParams,
    dateFormat,
    tenantId,
    defaultCountryId
  );

  const birthdayMonth = parseBirthdayMonth(firstValue(resolvedSearchParams?.birthMonth));
  const birthdayNextDays = parseBirthdayNextDays(firstValue(resolvedSearchParams?.birthNextDays));

  const [summary, list, sources, sourceDetails, countries, birthdays] = await Promise.all([
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
      select: { id: true, name: true }
    }),
    getClientsReportBirthdays({
      tenantId,
      countryId: filters.countryId,
      q: filters.q,
      type: filters.type,
      month: birthdayMonth,
      nextDays: birthdayNextDays,
      limit: 300
    })
  ]);

  const queryParams = {
    q: filters.q || "",
    type: filters.type && filters.type !== "ALL" ? filters.type : "ALL",
    from: filters.from ? toIsoLocalDate(filters.from) : "",
    to: filters.to ? toIsoLocalDate(filters.to) : "",
    sourceId: filters.acquisitionSourceId || "",
    detailId: filters.acquisitionDetailOptionId || "",
    referred: filters.referredOnly ? "1" : "",
    pageSize: String(filters.pageSize || 25),
    birthMonth: birthdayMonth ? String(birthdayMonth) : "",
    birthNextDays: birthdayNextDays ? String(birthdayNextDays) : ""
  };

  const birthdayFiltersQuery = {
    q: queryParams.q || undefined,
    type: queryParams.type !== "ALL" ? queryParams.type : undefined,
    from: queryParams.from || undefined,
    to: queryParams.to || undefined,
    sourceId: queryParams.sourceId || undefined,
    detailId: queryParams.detailId || undefined,
    referred: queryParams.referred || undefined,
    pageSize: queryParams.pageSize || undefined
  };

  const chips: Array<{ key: string; label: string }> = [];
  if (queryParams.q) chips.push({ key: "q", label: `Buscar: ${queryParams.q}` });
  if (queryParams.type && queryParams.type !== "ALL") chips.push({ key: "type", label: `Tipo: ${queryParams.type}` });
  if (countryFilterParam && countryFilterParam !== CLIENTS_COUNTRY_FILTER_ALL) {
    const countryLabel = countries.find((country) => country.id === countryFilterParam)?.name ?? "País";
    chips.push({ key: "countryId", label: `País: ${countryLabel}` });
  }
  if (queryParams.sourceId) {
    const sourceLabel = sources.find((source) => source.id === queryParams.sourceId)?.name || "Canal";
    chips.push({ key: "sourceId", label: `Canal: ${sourceLabel}` });
  }
  if (queryParams.detailId) {
    const detailLabel = sourceDetails.find((detail) => detail.id === queryParams.detailId)?.name || "Detalle";
    chips.push({ key: "detailId", label: `Detalle: ${detailLabel}` });
  }
  if (filters.from) chips.push({ key: "from", label: `Desde: ${formatDateForClients(filters.from, dateFormat)}` });
  if (filters.to) chips.push({ key: "to", label: `Hasta: ${formatDateForClients(filters.to, dateFormat)}` });
  if (queryParams.referred) chips.push({ key: "referred", label: "Solo referidos" });
  if (birthdayMonth) {
    const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(2026, birthdayMonth - 1, 1));
    chips.push({ key: "birthMonth", label: `Cumpleaños mes: ${monthLabel}` });
  }
  if (birthdayNextDays) chips.push({ key: "birthNextDays", label: `Cumpleaños próximos: ${birthdayNextDays} días` });

  const baseExportParams = {
    q: queryParams.q || undefined,
    type: queryParams.type !== "ALL" ? queryParams.type : undefined,
    from: queryParams.from || undefined,
    to: queryParams.to || undefined,
    sourceId: queryParams.sourceId || undefined,
    detailId: queryParams.detailId || undefined,
    referred: queryParams.referred || undefined
  };
  const geoBaseQuery = buildQuery(baseExportParams);
  const selectedCountryLabel = countryFilterParam && countryFilterParam !== CLIENTS_COUNTRY_FILTER_ALL
    ? countries.find((country) => country.id === countryFilterParam)?.name ?? "País"
    : "Todos los países";
  const birthdayExportQuery = buildQuery({
    ...birthdayFiltersQuery,
    birthMonth: queryParams.birthMonth || undefined,
    birthNextDays: queryParams.birthNextDays || undefined,
    format: "csv"
  });
  const birthdayMonthOptions = Array.from({ length: 12 }).map((_, index) => {
    const month = index + 1;
    return {
      value: String(month),
      label: new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(2026, index, 1))
    };
  });
  const sectionCounts = {
    by_type: summary.byType.length,
    top_channels: summary.bySource.length,
    insurers_by_line: summary.insurersByLine.length,
    geo: summary.byGeo.countries.length + summary.byGeo.admin1.length + summary.byGeo.admin2.length,
    top_referrers: summary.referrals.topReferrers.length,
    birthdays: birthdays.total,
    clients_list: list.total
  } as const;

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
        <ClientsReportsFiltersForm
          initialFilters={{
            q: queryParams.q,
            type: queryParams.type,
            from: queryParams.from,
            to: queryParams.to,
            sourceId: queryParams.sourceId,
            detailId: queryParams.detailId,
            referred: Boolean(queryParams.referred),
            pageSize: queryParams.pageSize
          }}
          extraQuery={Object.fromEntries(
            Object.entries({
              birthMonth: queryParams.birthMonth,
              birthNextDays: queryParams.birthNextDays
            }).filter(([, value]) => Boolean(value))
          )}
          typeOptions={TYPE_OPTIONS}
          sources={sources}
          sourceDetails={sourceDetails}
          canExportFull={exportScope === "full"}
          canExportMasked={exportScope === "full" || exportScope === "masked"}
          sectionCounts={sectionCounts}
        />

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

      <ClientsReportsPanelsLayout
        byTypePanel={
          <ClientsReportsChartCard
            title="Clientes por tipo"
            rows={summary.byType.map((row) => ({
              label:
                row.type === ClientProfileType.PERSON
                  ? "Persona"
                  : row.type === ClientProfileType.COMPANY
                    ? "Empresa"
                    : row.type === ClientProfileType.INSTITUTION
                      ? "Institución"
                      : "Aseguradora",
              value: row.total
            }))}
            emptyLabel="Sin datos por tipo"
          />
        }
        topChannelsPanel={
          <ClientsReportsChartCard
            title="Top canales"
            rows={summary.bySource.map((row) => ({ label: row.sourceName, value: row.total }))}
            emptyLabel="Sin canales para este rango"
          />
        }
        insurersByLinePanel={
          <SimpleTable
            title="Aseguradoras por ramo"
            rows={summary.insurersByLine.map((row) => ({ label: row.line, value: row.total }))}
            emptyLabel="Sin aseguradoras en el rango"
          />
        }
        geoPanel={
          <div className="space-y-3">
            <ClientsGeoMapPanel
              initialGeo={summary.byGeo}
              baseQuery={geoBaseQuery}
              initialCountryId={countryFilterParam}
              initialCountryLabel={selectedCountryLabel}
            />
            <section className="grid gap-3 lg:grid-cols-3">
              <ClientsReportsChartCard
                title="Geo por país"
                rows={summary.byGeo.countries.map((row) => ({
                  label: row.source === "manual" ? `${row.label} · Manual entry` : row.label,
                  value: row.total
                }))}
                emptyLabel="Sin datos geográficos por país"
              />
              <SimpleTable
                title="Geo por departamento"
                rows={summary.byGeo.admin1.map((row) => ({
                  label: row.source === "manual" ? `${row.label} · Manual entry` : row.label,
                  value: row.total
                }))}
                emptyLabel="Sin datos geográficos por departamento"
              />
              <SimpleTable
                title="Geo por municipio/ciudad"
                rows={summary.byGeo.admin2.map((row) => ({
                  label: row.source === "manual" ? `${row.label} · Manual entry` : row.label,
                  value: row.total
                }))}
                emptyLabel="Sin datos geográficos por municipio/ciudad"
              />
            </section>
          </div>
        }
        topReferrersPanel={
          <section className="grid gap-3 lg:grid-cols-2">
            <SimpleTable
              title="Top referidores"
              rows={summary.referrals.topReferrers.map((row) => ({ label: row.referrerLabel, value: row.total }))}
              emptyLabel="Sin referidos para este rango"
            />
          </section>
        }
        birthdaysPanel={
          <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Cumpleaños</p>
                <p className="text-sm text-slate-600">Seguimiento operativo por mes y próximos días.</p>
              </div>
              <Link
                href={`/api/clientes/reportes/birthdays?${birthdayExportQuery}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                Exportar cumpleañeros CSV
              </Link>
            </div>

            <form method="GET" className="mt-3 grid gap-2 md:grid-cols-4">
              {Object.entries(birthdayFiltersQuery).map(([key, value]) =>
                value ? <input key={key} type="hidden" name={key} value={value} /> : null
              )}

              <select
                name="birthMonth"
                defaultValue={queryParams.birthMonth || "ALL"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">Mes (todos)</option>
                {birthdayMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                name="birthNextDays"
                defaultValue={queryParams.birthNextDays || "ALL"}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="ALL">Próximos días (todos)</option>
                <option value="7">Próximos 7 días</option>
                <option value="14">Próximos 14 días</option>
                <option value="30">Próximos 30 días</option>
              </select>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
                >
                  Aplicar cumpleaños
                </button>
                <Link
                  href={`/admin/clientes/reportes?${buildQuery(birthdayFiltersQuery)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Limpiar cumpleaños
                </Link>
              </div>
            </form>

            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f8fafc] text-[#2e75ba]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                    <th className="px-3 py-2 text-left font-semibold">Nacimiento</th>
                    <th className="px-3 py-2 text-left font-semibold">Próximo cumpleaños</th>
                    <th className="px-3 py-2 text-left font-semibold">Contacto</th>
                    <th className="px-3 py-2 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {birthdays.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                        No hay cumpleañeros para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    birthdays.items.map((item, index) => (
                      <tr key={item.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{item.displayName}</td>
                        <td className="px-3 py-2">
                          {formatDateForClients(item.birthDate, dateFormat)}
                          {typeof item.age === "number" ? (
                            <span className="ml-2 text-xs text-slate-500">{item.age} años</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {formatDateForClients(item.nextBirthday, dateFormat)}
                          <span className="ml-2 text-xs text-slate-500">en {item.daysUntil} días</span>
                        </td>
                        <td className="px-3 py-2">{item.phone || item.email || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/admin/clientes/${item.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                              title="Ver perfil"
                            >
                              <span className="text-[10px] font-semibold">Ver</span>
                            </Link>
                            {item.phoneHref ? (
                              <a
                                href={item.phoneHref}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                                title="Llamar"
                              >
                                <Phone size={14} />
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400"
                                title="No disponible"
                              >
                                <Phone size={14} />
                              </button>
                            )}
                            {item.whatsappHref ? (
                              <a
                                href={item.whatsappHref}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                                title="WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400"
                                title="No disponible"
                              >
                                <MessageCircle size={14} />
                              </button>
                            )}
                            {item.emailHref ? (
                              <a
                                href={item.emailHref}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                                title="Email"
                              >
                                <Mail size={14} />
                              </a>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400"
                                title="No disponible"
                              >
                                <Mail size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        }
        clientsListPanel={
          <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                        <td className="px-3 py-2">{formatDateForClients(item.createdAt, dateFormat)}</td>
                        <td className="px-3 py-2">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{item.displayName}</p>
                            <div className="flex flex-wrap gap-1">
                              {!item.hasPrimaryLocation ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                  Falta ubicación
                                </span>
                              ) : null}
                              {!item.hasPrimaryContact ? (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                  Falta contacto
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">{item.type}</td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[240px] truncate" title={[item.department, item.city, item.country].filter(Boolean).join(", ") || "—"}>
                            {[item.department, item.city, item.country].filter(Boolean).join(", ") || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-0.5">
                            <p>{item.phone || "—"}</p>
                            <p className="text-xs text-slate-500">{item.email || "—"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[180px] truncate" title={item.acquisitionSource || "—"}>
                            {item.acquisitionSource || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[220px] truncate" title={item.acquisitionDetail || "—"}>
                            {item.acquisitionDetail || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="block max-w-[220px] truncate" title={item.referredBy || "—"}>
                            {item.referredBy || "—"}
                          </span>
                        </td>
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
        }
      />
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
