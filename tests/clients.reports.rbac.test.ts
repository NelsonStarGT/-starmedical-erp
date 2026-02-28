import test from "node:test";
import assert from "node:assert/strict";
import type { SessionUser } from "@/lib/auth";
import {
  canViewClientsReports,
  resolveClientsReportsExportScope
} from "@/lib/clients/reports/permissions";

function createUser(overrides?: Partial<SessionUser>): SessionUser {
  return {
    id: "user-1",
    email: "reports@tenant.test",
    roles: ["STAFF"],
    permissions: [],
    deniedPermissions: [],
    branchId: null,
    tenantId: "tenant-a",
    ...overrides
  };
}

test("SSR/API comparten regla de vista por capability CLIENTS_REPORTS_VIEW", () => {
  const blocked = createUser();
  const allowed = createUser({ permissions: ["CLIENTS_REPORTS_VIEW"] });

  assert.equal(canViewClientsReports(blocked), false);
  assert.equal(canViewClientsReports(allowed), true);
});

test("scope de export distingue full/masked/none", () => {
  const none = createUser({ permissions: ["CLIENTS_REPORTS_VIEW"] });
  const masked = createUser({
    permissions: ["CLIENTS_REPORTS_VIEW", "CLIENTS_REPORTS_EXPORT", "CLIENTS_REPORTS_EXPORT_MASKED"]
  });
  const full = createUser({
    permissions: ["CLIENTS_REPORTS_VIEW", "CLIENTS_REPORTS_EXPORT", "CLIENTS_REPORTS_EXPORT_FULL"]
  });

  assert.equal(resolveClientsReportsExportScope(none), "none");
  assert.equal(resolveClientsReportsExportScope(masked), "masked");
  assert.equal(resolveClientsReportsExportScope(full), "full");
});
