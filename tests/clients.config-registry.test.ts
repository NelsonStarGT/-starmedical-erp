import test from "node:test";
import assert from "node:assert/strict";
import { ClientCatalogType } from "@prisma/client";
import {
  CLIENTS_CONFIG_REGISTRY,
  canDeprecateClientsConfigEntry,
  parseClientsConfigDeprecatedCookie,
  serializeClientsConfigDeprecatedCookie,
  withResolvedRegistryDeprecation
} from "@/lib/clients/clientsConfigRegistry";
import { getClientCatalogDefaultsByType } from "@/lib/catalogs/clientCatalogDefaults";

test("parsea cookie deprecado en formato JSON y deduplica", () => {
  const parsed = parseClientsConfigDeprecatedCookie('[\"legacy_relation_type\",\"legacy_relation_type\",\"catalog_social_network\"]');
  assert.deepEqual(parsed, ["legacy_relation_type", "catalog_social_network"]);
});

test("parsea cookie deprecado en formato CSV", () => {
  const parsed = parseClientsConfigDeprecatedCookie("legacy_relation_type,catalog_social_network");
  assert.deepEqual(parsed, ["legacy_relation_type", "catalog_social_network"]);
});

test("serializa cookie deprecado sin duplicados", () => {
  const serialized = serializeClientsConfigDeprecatedCookie([
    "legacy_relation_type",
    "legacy_relation_type",
    "catalog_social_network"
  ]);
  assert.equal(serialized, '[\"legacy_relation_type\",\"catalog_social_network\"]');
});

test("solo entradas sin uso y deprecables pueden marcarse", () => {
  const deprecable = CLIENTS_CONFIG_REGISTRY.find((entry) => entry.key === "legacy_relation_type");
  assert.ok(deprecable);
  assert.equal(canDeprecateClientsConfigEntry(deprecable!), true);

  const notDeprecable = CLIENTS_CONFIG_REGISTRY.find((entry) => entry.key === "catalog_person_category");
  assert.ok(notDeprecable);
  assert.equal(canDeprecateClientsConfigEntry(notDeprecable!), false);
});

test("resuelve estado deprecado combinando registry y cookie", () => {
  const resolved = withResolvedRegistryDeprecation(CLIENTS_CONFIG_REGISTRY, ["catalog_social_network"]);
  const social = resolved.find((entry) => entry.key === "catalog_social_network");
  assert.equal(Boolean(social?.deprecated), true);

  const personCategory = resolved.find((entry) => entry.key === "catalog_person_category");
  assert.equal(Boolean(personCategory?.deprecated), false);
});

test("directorios/canales/validaciones tienen microcopy de resumen para cards", () => {
  const rows = CLIENTS_CONFIG_REGISTRY.filter((entry) =>
    ["directorios", "canales", "validaciones"].includes(entry.section)
  );
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.ok((row.summary ?? "").trim().length > 0, `Falta summary en ${row.key}`);
  }
});

test("registry incluye consola de documentos en validaciones", () => {
  const row = CLIENTS_CONFIG_REGISTRY.find((entry) => entry.key === "geo_country_documents");
  assert.ok(row);
  assert.equal(row?.managerComponentId, "validations:documents");
});

test("catálogos legacy comerciales tienen defaults para CTA de carga inicial", () => {
  assert.ok(getClientCatalogDefaultsByType(ClientCatalogType.RELATION_TYPE).length > 0);
  assert.ok(getClientCatalogDefaultsByType(ClientCatalogType.RELATIONSHIP_TYPE).length > 0);
  assert.ok(getClientCatalogDefaultsByType(ClientCatalogType.SOCIAL_NETWORK).length > 0);
});
