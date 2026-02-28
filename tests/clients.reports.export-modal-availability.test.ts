import test from "node:test";
import assert from "node:assert/strict";
import { resolveClientsReportsExportAvailability } from "@/components/clients/reports/ClientsReportsExportModal";

test("modal deshabilita descarga cuando todas las secciones seleccionadas tienen 0 filas", () => {
  const availability = resolveClientsReportsExportAvailability({
    selectedSections: ["by_type", "top_channels"],
    sectionCounts: {
      by_type: 0,
      top_channels: 0
    }
  });

  assert.equal(availability.noDataForSelection, true);
  assert.equal(availability.canRunExport, false);
});

test("modal habilita descarga cuando al menos una sección seleccionada tiene filas", () => {
  const availability = resolveClientsReportsExportAvailability({
    selectedSections: ["by_type", "top_channels"],
    sectionCounts: {
      by_type: 3,
      top_channels: 0
    }
  });

  assert.equal(availability.noDataForSelection, false);
  assert.equal(availability.canRunExport, true);
});
