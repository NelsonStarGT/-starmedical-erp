import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowClientsCountryFilterSelector } from "@/lib/clients/operatingCountryContext";

test("filtro país visible en secciones de consulta de Clientes", () => {
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/lista"), true);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/personas"), true);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/empresas"), true);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/instituciones"), true);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/aseguradoras"), true);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/reportes"), true);
});

test("filtro país oculto en dashboard/configuración y formularios de creación", () => {
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes"), false);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/configuracion"), false);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/personas/nuevo"), false);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/empresas/nuevo"), false);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/instituciones/nuevo"), false);
  assert.equal(shouldShowClientsCountryFilterSelector("/admin/clientes/aseguradoras/nuevo"), false);
});
