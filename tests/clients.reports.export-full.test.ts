import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReportListPagination } from "@/lib/clients/reports.service";

test("export puede elevar pageSize por encima de 100 con pageSizeMax explícito", () => {
  const pagination = normalizeReportListPagination(
    {
      tenantId: "tenant-a",
      page: 2,
      pageSize: 1000
    },
    { pageSizeMax: 1000 }
  );

  assert.equal(pagination.pageSize, 1000);
  assert.equal(pagination.page, 2);
  assert.equal(pagination.skip, 1000);
});

test("modo listado mantiene cap por defecto de 100", () => {
  const pagination = normalizeReportListPagination({
    tenantId: "tenant-a",
    page: 1,
    pageSize: 1000
  });
  assert.equal(pagination.pageSize, 100);
});
