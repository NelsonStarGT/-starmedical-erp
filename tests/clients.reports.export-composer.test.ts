import test from "node:test";
import assert from "node:assert/strict";
import { composeClientsReportsExportPlan, type ReportExportSectionLike } from "@/lib/clients/reports/exportComposer";
import type { ClientsReportFilters } from "@/lib/clients/reports.service";
import type { ClientsReportPanelKey } from "@/lib/clients/reports/panels";

function baseFilters(overrides?: Partial<ClientsReportFilters>): ClientsReportFilters {
  return {
    tenantId: "tenant-a",
    countryId: "country-gt",
    q: "ana",
    referredOnly: true,
    ...overrides
  };
}

function section(key: ClientsReportPanelKey, rows: string[][], headers: string[] = ["A", "B"]): ReportExportSectionLike {
  return {
    key,
    title: key,
    headers,
    rows
  };
}

test("composer conserva filtros efectivos (incluye country) y no trunca filas grandes", () => {
  const bigRows = Array.from({ length: 150 }, (_, index) => [String(index + 1), `row-${index + 1}`]);
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["clients_list"],
    format: "xlsx",
    masked: false,
    sections: [section("clients_list", bigRows)]
  });

  assert.equal(plan.effectiveFilters.countryId, "country-gt");
  assert.equal(plan.nonEmptySections[0]?.rows.length, 150);
});

test("composer retorna hasData=false cuando todas las secciones están vacías", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "pdf",
    masked: true,
    sections: [section("by_type", []), section("top_channels", [])]
  });

  assert.equal(plan.hasData, false);
  assert.equal(plan.nonEmptySections.length, 0);
});

test("pdf usa layout compacto para <=3 secciones pequeñas sin geo", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "pdf",
    masked: false,
    sections: [
      section("by_type", [["Persona", "12"], ["Empresa", "2"]]),
      section("top_channels", [["Portal", "8"], ["WhatsApp", "4"]])
    ]
  });

  assert.equal(plan.pdfLayoutMode, "compact_two_column");
});

test("pdf usa layout por sección cuando incluye geo", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["geo"],
    format: "pdf",
    masked: false,
    sections: [section("geo", [["País", "GT"]])] 
  });

  assert.equal(plan.pdfLayoutMode, "section_per_page");
});

test("xlsx usa hoja Resumen cuando dataset es pequeño", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "xlsx",
    masked: false,
    sections: [
      section("by_type", [["Persona", "10"]], ["Tipo", "Total"]),
      section("top_channels", [["Portal", "7"]], ["Canal", "Total"])
    ]
  });

  assert.equal(plan.xlsxLayoutMode, "summary_sheet");
  assert.equal(plan.xlsxSheets.length, 1);
  assert.equal(plan.xlsxSheets[0]?.name, "Resumen");
});

test("xlsx fuerza hojas separadas cuando compact está desactivado", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "xlsx",
    masked: false,
    compact: { xlsx: false },
    sections: [
      section("by_type", [["Persona", "10"]], ["Tipo", "Total"]),
      section("top_channels", [["Portal", "7"]], ["Canal", "Total"])
    ]
  });

  assert.equal(plan.xlsxLayoutMode, "section_sheets");
  assert.equal(plan.xlsxSheets.length, 2);
});

test("xlsx mantiene hoja separada cuando incluye geo aunque compact esté activo", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["geo", "clients_list"],
    format: "xlsx",
    masked: false,
    compact: { xlsx: true },
    sections: [
      section("geo", [["País", "GT"]], ["Nivel", "Total"]),
      section("clients_list", [["Cliente 1", "Activo"]], ["Cliente", "Estado"])
    ]
  });

  assert.equal(plan.xlsxLayoutMode, "section_sheets");
  assert.equal(plan.xlsxSheets.length, 2);
});

test("pdf fuerza sección por página cuando compact está desactivado", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "pdf",
    masked: false,
    compact: { pdf: false },
    sections: [
      section("by_type", [["Persona", "12"], ["Empresa", "2"]]),
      section("top_channels", [["Portal", "8"], ["WhatsApp", "4"]])
    ]
  });

  assert.equal(plan.pdfLayoutMode, "section_per_page");
});

test("csv multi-sección mantiene modo ZIP", () => {
  const plan = composeClientsReportsExportPlan({
    filters: baseFilters(),
    selectedSections: ["by_type", "top_channels"],
    format: "csv",
    masked: false,
    sections: [
      section("by_type", [["Persona", "10"]]),
      section("top_channels", [["Portal", "7"]])
    ]
  });

  assert.equal(plan.csvDeliveryMode, "zip_csv");
});
