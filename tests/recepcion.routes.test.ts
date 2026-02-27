import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveModuleNavConfig } from "@/components/nav/moduleNavRegistry";
import { RECEPCION_ROUTE_PATHS } from "@/lib/recepcion/routes";

const REQUIRED_PATHS = [
  "/admin/reception/dashboard",
  "/admin/reception/queues",
  "/admin/reception/appointments",
  "/admin/reception/check-in",
  "/admin/reception/caja",
  "/admin/reception/registros"
];

test("recepcion routes: incluye rutas v1 esperadas", () => {
  for (const path of REQUIRED_PATHS) {
    assert.equal(RECEPCION_ROUTE_PATHS.includes(path), true, `missing route: ${path}`);
  }
});

test("recepcion routes: nav contextual resuelve módulo y tabs", () => {
  const config = resolveModuleNavConfig("/admin/reception/queues");

  assert.ok(config);
  assert.equal(config?.moduleKey, "recepcion");
  assert.ok((config?.items.length || 0) >= 6);
  assert.ok(config?.items.some((item) => item.href === "/admin/reception/appointments"));
  assert.ok(config?.items.some((item) => item.href === "/admin/reception/queues"));
});

test("recepcion routes: archivos page.tsx existen para todas las rutas", () => {
  const cwd = process.cwd();

  const files = [
    "app/admin/recepcion/page.tsx",
    "app/admin/recepcion/[...slug]/page.tsx"
  ];

  for (const file of files) {
    assert.equal(existsSync(join(cwd, file)), true, `missing file: ${file}`);
  }
});

test("reception routes: archivos canonical principales existen", () => {
  const cwd = process.cwd();
  const files = [
    "app/admin/reception/page.tsx",
    "app/admin/reception/dashboard/page.tsx",
    "app/admin/reception/queues/page.tsx",
    "app/admin/reception/check-in/page.tsx",
    "app/admin/reception/appointments/page.tsx",
    "app/admin/reception/registros/page.tsx",
    "app/admin/reception/caja/page.tsx"
  ];

  for (const file of files) {
    assert.equal(existsSync(join(cwd, file)), true, `missing file: ${file}`);
  }
});
