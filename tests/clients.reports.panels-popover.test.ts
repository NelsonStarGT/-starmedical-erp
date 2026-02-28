import test from "node:test";
import assert from "node:assert/strict";
import {
  countActiveClientsReportsPanels,
  getAllVisibleClientsReportsPanels,
  getDefaultClientsReportsPanelsVisibility,
  parseClientsReportsPanelsVisibility,
  serializeClientsReportsPanelsVisibility
} from "@/lib/clients/reports/panelsPreferences";

test("paneles popover persiste selección serializando/parsing estado", () => {
  const hidden = getAllVisibleClientsReportsPanels(false);
  hidden.by_type = true;
  hidden.clients_list = true;

  const raw = serializeClientsReportsPanelsVisibility(hidden);
  const parsed = parseClientsReportsPanelsVisibility(raw);
  assert.ok(parsed);
  assert.equal(parsed?.by_type, true);
  assert.equal(parsed?.clients_list, true);
  assert.equal(parsed?.geo, false);
});

test("paneles popover expone conteo activo y fallback defaults", () => {
  const defaults = getDefaultClientsReportsPanelsVisibility();
  assert.equal(countActiveClientsReportsPanels(defaults), 7);

  const parsed = parseClientsReportsPanelsVisibility("{\"by_type\":false,\"geo\":false}");
  assert.ok(parsed);
  assert.equal(parsed?.by_type, false);
  assert.equal(parsed?.geo, false);
  assert.equal(parsed?.clients_list, true);
  assert.equal(countActiveClientsReportsPanels(parsed!), 5);
});
