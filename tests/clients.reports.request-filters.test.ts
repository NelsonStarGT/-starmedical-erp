import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildClientsReportFiltersFromRequest } from "@/lib/clients/reports/requestFilters";
import { CLIENTS_COUNTRY_FILTER_COOKIE } from "@/lib/clients/operatingCountryContext";

test("report filters usan countryId desde cookie cuando no viene en query", () => {
  const req = new NextRequest("http://localhost/api/clientes/reportes/summary", {
    headers: {
      cookie: `${CLIENTS_COUNTRY_FILTER_COOKIE}=country-gt`
    }
  });

  const filters = buildClientsReportFiltersFromRequest(req, "DMY", "tenant-alpha", {
    withPagination: false,
    forcePage: 1,
    forcePageSize: 25
  });

  assert.equal(filters.countryId, "country-gt");
});

test("report filters priorizan countryId explícito en query sobre cookie", () => {
  const req = new NextRequest("http://localhost/api/clientes/reportes/list?countryId=country-co", {
    headers: {
      cookie: `${CLIENTS_COUNTRY_FILTER_COOKIE}=country-gt`
    }
  });

  const filters = buildClientsReportFiltersFromRequest(req, "DMY", "tenant-alpha");
  assert.equal(filters.countryId, "country-co");
});

