import assert from "node:assert/strict";
import test from "node:test";
import { buildActiveEmployeesWhere, buildPendingEmployeesWhere } from "@/lib/hr/filters";

const staffUser = { id: "user-1", email: "staff@test.com", roles: ["STAFF"], permissions: [] };
const adminUser = { id: "admin-1", email: "admin@test.com", roles: ["ADMIN"], permissions: [] };

test("buildPendingEmployeesWhere applies onboarding, termination filter and staff scope", () => {
  const pending = buildPendingEmployeesWhere({ sessionUser: adminUser, excludeTerminated: false });
  assert.deepEqual(pending, { onboardingStatus: { not: "ACTIVE" }, status: { not: "ARCHIVED" } });

  const pendingExcludingTerminated = buildPendingEmployeesWhere({ sessionUser: adminUser, excludeTerminated: true });
  assert.deepEqual(pendingExcludingTerminated, {
    onboardingStatus: { not: "ACTIVE" },
    status: { notIn: ["TERMINATED", "ARCHIVED"] }
  });

  const staffPending = buildPendingEmployeesWhere({ sessionUser: staffUser as any, excludeTerminated: true });
  assert.deepEqual(staffPending, {
    onboardingStatus: { not: "ACTIVE" },
    status: { notIn: ["TERMINATED", "ARCHIVED"] },
    userId: staffUser.id
  });
});

test("buildActiveEmployeesWhere enforces active + onboarding + staff scope", () => {
  const active = buildActiveEmployeesWhere({ sessionUser: adminUser });
  assert.deepEqual(active, { status: "ACTIVE", onboardingStatus: "ACTIVE", NOT: { employeeCode: { startsWith: "EMP-DEMO" } } });

  const staffActive = buildActiveEmployeesWhere({ sessionUser: staffUser as any });
  assert.deepEqual(staffActive, {
    status: "ACTIVE",
    onboardingStatus: "ACTIVE",
    userId: staffUser.id,
    NOT: { employeeCode: { startsWith: "EMP-DEMO" } }
  });
});
