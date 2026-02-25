import test from "node:test";
import assert from "node:assert/strict";
import { parseBillingSeriesCreate, validateBillingSeriesRuleSet } from "@/lib/config-central/billing";

test("parseBillingSeriesCreate normaliza prefijo y valida rango", () => {
  const parsed = parseBillingSeriesCreate({
    legalEntityId: "le-1",
    name: "Serie Principal",
    prefix: "fa-01",
    nextNumber: 10,
    isDefault: true,
    isActive: true
  });

  assert.equal(parsed.prefix, "FA-01");
  assert.equal(parsed.nextNumber, 10);
  assert.equal(parsed.isDefault, true);
});

test("validateBillingSeriesRuleSet detecta duplicados y defaults múltiples", () => {
  const issues = validateBillingSeriesRuleSet([
    {
      id: "a",
      legalEntityId: "le-1",
      branchId: null,
      name: "Factura general",
      prefix: "FA",
      isDefault: true,
      isActive: true
    },
    {
      id: "b",
      legalEntityId: "le-1",
      branchId: null,
      name: "factura general",
      prefix: "FB",
      isDefault: true,
      isActive: true
    },
    {
      id: "c",
      legalEntityId: "le-1",
      branchId: null,
      name: "Serie sucursal",
      prefix: "fa",
      isDefault: false,
      isActive: true
    }
  ]);

  assert.equal(issues.some((issue) => issue.code === "DUPLICATE_NAME"), true);
  assert.equal(issues.some((issue) => issue.code === "DUPLICATE_PREFIX"), true);
  assert.equal(issues.some((issue) => issue.code === "MULTIPLE_ACTIVE_DEFAULTS"), true);
});
