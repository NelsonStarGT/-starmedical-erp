import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveModuleNavConfig } from "@/components/nav/moduleNavRegistry";
import { RECEPCION_ROUTE_PATHS } from "@/lib/recepcion/routes";

const REQUIRED_PATHS = [
  "/admin/recepcion",
  "/admin/recepcion/cola",
  "/admin/recepcion/citas",
  "/admin/recepcion/admisiones",
  "/admin/recepcion/caja",
  "/admin/recepcion/registros"
];

test("recepcion routes: incluye rutas v1 esperadas", () => {
  for (const path of REQUIRED_PATHS) {
    assert.equal(RECEPCION_ROUTE_PATHS.includes(path), true, `missing route: ${path}`);
  }
});

test("recepcion routes: nav contextual resuelve módulo y tabs", () => {
  const config = resolveModuleNavConfig("/admin/recepcion/cola");

  assert.ok(config);
  assert.equal(config?.moduleKey, "recepcion");
  assert.ok((config?.items.length || 0) >= 6);
  assert.ok(config?.items.some((item) => item.href === "/admin/recepcion/appointments"));
  assert.ok(config?.items.some((item) => item.href === "/admin/recepcion/queues"));
});

test("recepcion routes: archivos page.tsx existen para todas las rutas", () => {
  const cwd = process.cwd();

  const files = [
    "app/admin/recepcion/page.tsx",
    "app/admin/recepcion/cola/page.tsx",
    "app/admin/recepcion/citas/page.tsx",
    "app/admin/recepcion/admisiones/page.tsx",
    "app/admin/recepcion/caja/page.tsx",
    "app/admin/recepcion/registros/page.tsx"
  ];

  for (const file of files) {
    assert.equal(existsSync(join(cwd, file)), true, `missing file: ${file}`);
  }
});
