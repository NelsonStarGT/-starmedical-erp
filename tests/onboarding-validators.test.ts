import { test } from "node:test";
import assert from "node:assert/strict";
import { documentOwnershipStatus, filterDocumentsForActor, resolveOnboardingRoleName } from "../lib/hr/access";
import type { SessionUser } from "../lib/auth";

test("staff cannot assign admin in onboarding role resolution", () => {
  const staffUser: SessionUser = {
    id: "user-staff",
    email: "staff@example.com",
    roles: ["STAFF"],
    permissions: ["HR:EMPLOYEES:WRITE"],
    deniedPermissions: []
  };

  const onboardingResult = resolveOnboardingRoleName({ actor: staffUser, requestedRoleName: "ADMIN" });
  assert.equal(onboardingResult.roleName, "STAFF");
});

test("staff only sees personal documents", () => {
  const docs = [
    { id: "doc-1", visibility: "PERSONAL" as const },
    { id: "doc-2", visibility: "RESTRINGIDO" as const }
  ];
  const filtered = filterDocumentsForActor({ documents: docs, level: "STAFF", isSelf: true });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "doc-1");
});

test("document ownership mismatch blocks update", () => {
  const ownership = documentOwnershipStatus({ employeeId: "emp-1" }, "emp-2");
  assert.equal(ownership.ok, false);
  assert.equal(ownership.status, 403);
});
