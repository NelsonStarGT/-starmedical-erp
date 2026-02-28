import test from "node:test";
import assert from "node:assert/strict";
import { createNoDataExportResponse } from "@/app/api/clientes/reportes/export/route";

test("export route responde 422 cuando no hay datos para filtros actuales", async () => {
  const response = createNoDataExportResponse();
  assert.equal(response.status, 422);

  const payload = (await response.json()) as { ok: boolean; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Sin datos para filtros actuales");
});
