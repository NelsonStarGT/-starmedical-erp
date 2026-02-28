import test from "node:test";
import assert from "node:assert/strict";
import { resolveClientsReportsCsvDeliveryMode } from "@/lib/clients/reports/exportDelivery";

test("export CSV multi-sección activa entrega ZIP", () => {
  const mode = resolveClientsReportsCsvDeliveryMode({
    format: "csv",
    sectionsCount: 3
  });
  assert.equal(mode, "zip_csv");
});

test("export CSV simple conserva archivo único", () => {
  const mode = resolveClientsReportsCsvDeliveryMode({
    format: "csv",
    sectionsCount: 1
  });
  assert.equal(mode, "single_csv");
});
