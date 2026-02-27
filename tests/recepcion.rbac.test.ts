import test from "node:test";
import assert from "node:assert/strict";
import { buildRecepcionAccess, hasRecepcionCapability } from "@/lib/recepcion/rbac";

function buildUser(input: {
  roles?: string[];
  permissions?: string[];
  deniedPermissions?: string[];
}) {
  return {
    id: "u-recepcion",
    email: "recepcion@test.local",
    roles: input.roles || [],
    permissions: input.permissions || [],
    deniedPermissions: input.deniedPermissions || []
  };
}

test("recepcion rbac: RECEPTIONIST puede operar cola/admisión pero no cobrar", () => {
  const access = buildRecepcionAccess(buildUser({ roles: ["RECEPTIONIST"] }));

  assert.equal(access.canViewModule, true);
  assert.equal(access.canWriteQueue, true);
  assert.equal(access.canWriteAdmissions, true);
  assert.equal(access.canWriteCashier, false);
});

test("recepcion rbac: CASHIER puede registrar pagos", () => {
  const access = buildRecepcionAccess(buildUser({ roles: ["CASHIER"] }));

  assert.equal(access.canViewModule, true);
  assert.equal(access.canViewCashier, true);
  assert.equal(access.canWriteCashier, true);
  assert.equal(access.canWriteQueue, false);
});

test("recepcion rbac: permiso explícito habilita acceso aunque el rol no sea de recepción", () => {
  const user = buildUser({ roles: ["STAFF"], permissions: ["RECEPTION_VIEW", "RECEPTION_APPOINTMENTS_VIEW"] });

  assert.equal(hasRecepcionCapability(user, "RECEPTION_VIEW"), true);
  assert.equal(hasRecepcionCapability(user, "RECEPTION_APPOINTMENTS_VIEW"), true);
  assert.equal(hasRecepcionCapability(user, "RECEPTION_APPOINTMENTS_WRITE"), false);
});

test("recepcion rbac: deny explícito bloquea capability", () => {
  const user = buildUser({
    roles: ["TENANT_ADMIN"],
    deniedPermissions: ["RECEPTION_CASHIER_WRITE"]
  });

  const access = buildRecepcionAccess(user);
  assert.equal(access.canViewCashier, true);
  assert.equal(access.canWriteCashier, false);
});
