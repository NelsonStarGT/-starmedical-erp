import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessConfigOps,
  canViewConfigProcessing,
  canWriteConfigProcessing,
  hasConfigCapability
} from "@/lib/security/configCapabilities";

test("config capabilities: solo SUPER_ADMIN/OPS acceden a operaciones", () => {
  assert.equal(
    canAccessConfigOps({
      roles: ["SUPER_ADMIN"],
      permissions: []
    }),
    true
  );

  assert.equal(
    canAccessConfigOps({
      roles: ["OPS"],
      permissions: []
    }),
    true
  );

  assert.equal(
    canAccessConfigOps({
      roles: ["TENANT_ADMIN"],
      permissions: []
    }),
    false
  );
});

test("config capabilities: TENANT_ADMIN puede ver processing pero no escribir", () => {
  const user = {
    roles: ["TENANT_ADMIN"],
    permissions: []
  };

  assert.equal(canViewConfigProcessing(user), true);
  assert.equal(canWriteConfigProcessing(user), false);
});

test("config capabilities: fallback por permiso legacy para processing view", () => {
  const user = {
    roles: ["STAFF"],
    permissions: ["CONFIG_SERVICES_READ"]
  };

  assert.equal(hasConfigCapability(user, "CONFIG_PROCESSING_VIEW"), true);
  assert.equal(hasConfigCapability(user, "CONFIG_PROCESSING_WRITE"), false);
});
