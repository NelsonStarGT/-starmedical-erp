import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPolicyOrderToContextualItems,
  isContextualItemActive,
  resolveContextualModule
} from "@/components/layout/contextual-nav";
import {
  applyNavOrderPreference,
  parseNavOrderPreference,
  serializeNavOrderPreference
} from "@/lib/ui/contextual-nav-order";

test("parseNavOrderPreference y serializeNavOrderPreference manejan dedupe", () => {
  const parsed = parseNavOrderPreference('["facturacion","facturacion"," servicios ","",12]');
  assert.deepEqual(parsed, ["facturacion", "servicios"]);

  const serialized = serializeNavOrderPreference([" facturacion ", "", "servicios", "facturacion"]);
  assert.equal(serialized, '["facturacion","servicios"]');
});

test("applyNavOrderPreference respeta orden preferido y conserva faltantes", () => {
  const ordered = applyNavOrderPreference(
    [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" }
    ],
    ["c", "a"]
  );

  assert.deepEqual(
    ordered.map((item) => item.id),
    ["c", "a", "b"]
  );
});

test("resolveContextualModule detecta modulo por pathname y item activo", () => {
  const contextualModule = resolveContextualModule("/admin/configuracion/servicios");
  assert.ok(contextualModule);
  assert.equal(contextualModule?.id, "configuracion");

  const serviciosItem = contextualModule?.items.find((item) => item.id === "servicios");
  assert.ok(serviciosItem);
  assert.equal(isContextualItemActive("/admin/configuracion/servicios", serviciosItem!), true);
  assert.equal(isContextualItemActive("/admin/configuracion/servicios/extra", serviciosItem!), true);
  assert.equal(isContextualItemActive("/admin/configuracion/tema", serviciosItem!), false);
});

test("applyPolicyOrderToContextualItems usa tokens de id/href/label", () => {
  const contextualModule = resolveContextualModule("/admin/facturacion");
  assert.ok(contextualModule);

  const ordered = applyPolicyOrderToContextualItems(contextualModule!.items, [
    "documentos",
    "/admin/facturacion/caja",
    "dashboard"
  ]);

  assert.deepEqual(
    ordered.slice(0, 3).map((item) => item.id),
    ["documentos", "caja", "dashboard"]
  );
});
