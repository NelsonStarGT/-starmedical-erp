import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessOpsHealth,
  canExecuteOpsCritical,
  canManageOpsResources,
  canManageOpsSchedulerConfig
} from "@/lib/ops/rbac";

test("ops rbac: SUPER_ADMIN tiene acceso", () => {
  assert.equal(
    canAccessOpsHealth({
      id: "u1",
      email: "superadmin@test.local",
      roles: ["SUPER_ADMIN"],
      permissions: []
    }),
    true
  );
});

test("ops rbac: OPS tiene acceso", () => {
  assert.equal(
    canAccessOpsHealth({
      id: "u2",
      email: "ops@test.local",
      roles: ["OPS"],
      permissions: []
    }),
    true
  );
});

test("ops rbac: ADMIN sin OPS no tiene acceso", () => {
  assert.equal(
    canAccessOpsHealth({
      id: "u3",
      email: "admin@test.local",
      roles: ["ADMIN"],
      permissions: ["SYSTEM:ADMIN"]
    }),
    false
  );
});

test("ops rbac: SUPER_ADMIN puede ejecutar acciones críticas", () => {
  assert.equal(
    canExecuteOpsCritical({
      id: "u4",
      email: "super@test.local",
      roles: ["SUPER_ADMIN"],
      permissions: []
    }),
    true
  );
});

test("ops rbac: OPS no puede ejecutar acciones críticas", () => {
  assert.equal(
    canExecuteOpsCritical({
      id: "u5",
      email: "ops@test.local",
      roles: ["OPS"],
      permissions: []
    }),
    false
  );
});

test("ops rbac: OPS puede gestionar recursos", () => {
  assert.equal(
    canManageOpsResources({
      id: "u6",
      email: "ops@test.local",
      roles: ["OPS"],
      permissions: []
    }),
    true
  );
});

test("ops rbac: SOLO SUPER_ADMIN puede gestionar scheduler config", () => {
  assert.equal(
    canManageOpsSchedulerConfig({
      id: "u7",
      email: "super@test.local",
      roles: ["SUPER_ADMIN"],
      permissions: []
    }),
    true
  );

  assert.equal(
    canManageOpsSchedulerConfig({
      id: "u8",
      email: "ops@test.local",
      roles: ["OPS"],
      permissions: []
    }),
    false
  );
});
