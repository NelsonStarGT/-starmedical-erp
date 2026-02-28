import type { NextRequest } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { normalizeClientsCountryFilterInput, readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";
import { parseClientsDateInput, parseIsoDateString, type ClientsDateFormat } from "@/lib/clients/dateFormat";
import type { ClientsReportFilters } from "@/lib/clients/reports.service";

function parseDate(value: string | null, dateFormat: ClientsDateFormat) {
  if (!value) return null;
  const byFormat = parseClientsDateInput(value, dateFormat);
  if (byFormat) return byFormat;
  return parseIsoDateString(value);
}

type BuildRequestFiltersOptions = {
  withPagination?: boolean;
  defaultPage?: number;
  defaultPageSize?: number;
  forcePage?: number;
  forcePageSize?: number;
};

export function buildClientsReportFiltersFromRequest(
  req: NextRequest,
  dateFormat: ClientsDateFormat,
  tenantId: string,
  options?: BuildRequestFiltersOptions
): ClientsReportFilters {
  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("type");
  const queryCountryId = normalizeClientsCountryFilterInput(searchParams.get("countryId"));
  const cookieCountryId = readClientsCountryFilterCookie(req.cookies);
  const withPagination = options?.withPagination ?? true;
  const rawPage = Number(searchParams.get("page") || String(options?.defaultPage ?? 1));
  const rawPageSize = Number(searchParams.get("pageSize") || String(options?.defaultPageSize ?? 25));

  return {
    tenantId,
    q: searchParams.get("q") || undefined,
    type:
      rawType && rawType !== "ALL" && Object.values(ClientProfileType).includes(rawType as ClientProfileType)
        ? (rawType as ClientProfileType)
        : "ALL",
    from: parseDate(searchParams.get("from"), dateFormat),
    to: parseDate(searchParams.get("to"), dateFormat),
    countryId: queryCountryId ?? cookieCountryId ?? undefined,
    acquisitionSourceId: searchParams.get("sourceId") || undefined,
    acquisitionDetailOptionId: searchParams.get("detailId") || undefined,
    referredOnly: searchParams.get("referred") === "1",
    page: withPagination ? (Number.isFinite(rawPage) ? rawPage : (options?.defaultPage ?? 1)) : options?.forcePage ?? 1,
    pageSize: withPagination
      ? (Number.isFinite(rawPageSize) ? rawPageSize : (options?.defaultPageSize ?? 25))
      : options?.forcePageSize ?? options?.defaultPageSize ?? 25
  };
}
