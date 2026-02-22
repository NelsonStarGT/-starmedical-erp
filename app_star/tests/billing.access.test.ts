import assert from "node:assert/strict";
import test from "node:test";
import type { SessionUser } from "@/lib/auth";
import { canAccessBillingActions, canRunBillingSupervisorActions } from "@/lib/billing/access";

function buildUser(roles: string[], permissions: string[] = []): SessionUser {
  return {
    id: "u-test",
    email: "test@starmedical.local",
    name: "Test",
    roles,
    permissions,
    deniedPermissions: []
  };
}

test("canAccessBillingActions allows reception and finance roles", () => {
  assert.equal(canAccessBillingActions(buildUser(["RECEPTION"])), true);
  assert.equal(canAccessBillingActions(buildUser(["finance"])), true);
});

test("canAccessBillingActions rejects staff without admin permission", () => {
  assert.equal(canAccessBillingActions(buildUser(["STAFF"])), false);
  assert.equal(canAccessBillingActions(buildUser(["STAFF"], ["SYSTEM:ADMIN"])), true);
});

test("canRunBillingSupervisorActions requires supervisor/admin roles", () => {
  assert.equal(canRunBillingSupervisorActions(buildUser(["SUPERVISOR"])), true);
  assert.equal(canRunBillingSupervisorActions(buildUser(["ADMIN"])), true);
  assert.equal(canRunBillingSupervisorActions(buildUser(["RECEPTION"])), false);
});
