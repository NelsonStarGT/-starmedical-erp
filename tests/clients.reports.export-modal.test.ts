import test from "node:test";
import assert from "node:assert/strict";
import { buildClientsReportsExportQuery } from "@/components/clients/reports/ClientsReportsExportModal";

test("export modal construye query con secciones, formato y máscara", () => {
  const query = buildClientsReportsExportQuery({
    baseFilters: {
      q: "ana",
      type: "PERSON",
      from: "2025-01-01",
      to: "2026-02-28",
      sourceId: "",
      referred: "1"
    },
    format: "xlsx",
    mask: true,
    selectedSections: ["by_type", "geo", "clients_list"]
  });

  const search = new URLSearchParams(query);
  assert.equal(search.get("q"), "ana");
  assert.equal(search.get("type"), "PERSON");
  assert.equal(search.get("format"), "xlsx");
  assert.equal(search.get("mask"), "1");
  assert.equal(search.get("sections"), "by_type,geo,clients_list");
  assert.equal(search.has("sourceId"), false);
});

test("export modal omite mask cuando no aplica", () => {
  const query = buildClientsReportsExportQuery({
    baseFilters: {
      q: "",
      referred: ""
    },
    format: "pdf",
    mask: false,
    selectedSections: ["birthdays"]
  });

  const search = new URLSearchParams(query);
  assert.equal(search.get("format"), "pdf");
  assert.equal(search.get("sections"), "birthdays");
  assert.equal(search.has("mask"), false);
  assert.equal(search.has("q"), false);
});

test("export modal incluye capa geo en PDF cuando sección geo está seleccionada", () => {
  const query = buildClientsReportsExportQuery({
    baseFilters: {},
    format: "pdf",
    mask: false,
    selectedSections: ["geo"],
    geoLayerMode: "bubbles",
    geoScope: "REGION",
    geoRegion: "AMERICAS"
  });

  const search = new URLSearchParams(query);
  assert.equal(search.get("sections"), "geo");
  assert.equal(search.get("geoLayer"), "bubbles");
  assert.equal(search.get("geoScope"), "REGION");
  assert.equal(search.get("geoRegion"), "AMERICAS");
});

test("export modal serializa preferencias compact ON/OFF", () => {
  const query = buildClientsReportsExportQuery({
    baseFilters: {},
    format: "xlsx",
    mask: false,
    selectedSections: ["clients_list"],
    compactPdf: true,
    compactXlsx: false
  });

  const search = new URLSearchParams(query);
  assert.equal(search.get("compactXlsx"), "0");
  assert.equal(search.has("compactPdf"), false);
});
