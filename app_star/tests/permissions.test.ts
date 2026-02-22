import { test } from "node:test";
import assert from "node:assert/strict";
import { requirePermission, hasPermission } from "../lib/rbac";
import { resolveOnboardingRoleName } from "../lib/hr/access";

const hrUser = {
  id: "u-hr",
  email: "hr@example.com",
  roles: ["HR_USER"],
  permissions: ["HR:EMPLOYEES:WRITE", "HR:DOCS:UPLOAD"],
  deniedPermissions: []
};

const staffUser = {
  id: "u-staff",
  email: "staff@example.com",
  roles: ["STAFF"],
  permissions: ["HR:EMPLOYEES:READ", "HR:DOCS:READ"],
  deniedPermissions: []
};

test("hr user can write employees but cannot request restricted doc", () => {
  const res = requirePermission(hrUser, "HR:EMPLOYEES:WRITE");
  assert.equal(res.errorResponse, null);

  const restricted = requirePermission(hrUser, "HR:DOCS:RESTRICTED");
  assert.notEqual(restricted.errorResponse, null);
});

test("staff cannot change employee status", () => {
  const statusCheck = requirePermission(staffUser, "HR:EMPLOYEES:STATUS");
  assert.notEqual(statusCheck.errorResponse, null);
});

test("onboarding role resolution blocks admin assignment by HR_USER", () => {
  const result = resolveOnboardingRoleName({ actor: hrUser as any, requestedRoleName: "ADMIN" });
  if ("error" in result) {
    assert.equal(result.status, 403);
  } else {
    assert.equal(result.roleName, "STAFF");
  }
});

test("unknown permission keys are rejected", () => {
  const invalid = requirePermission(hrUser, "HR:NON_EXISTENT:ACTION");
  assert.notEqual(invalid.errorResponse, null);
});

test("hasPermission only respects explicit grants", () => {
  assert.equal(hasPermission(hrUser as any, "HR:EMPLOYEES:WRITE"), true);
  assert.equal(hasPermission({ ...hrUser, permissions: [] } as any, "HR:EMPLOYEES:WRITE"), false);
});
