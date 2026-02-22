import test from "node:test";
import assert from "node:assert/strict";
import { resolveAuditActorUserId } from "@/lib/audit";

test("resolveAuditActorUserId retorna null cuando el actor no existe", async () => {
  const actorUserId = await resolveAuditActorUserId(
    {
      id: "missing-user-id",
      email: "ops@starmedical.test",
      roles: ["OPS"],
      permissions: []
    },
    async () => false
  );

  assert.equal(actorUserId, null);
});

test("resolveAuditActorUserId retorna el id cuando el actor existe", async () => {
  const actorUserId = await resolveAuditActorUserId(
    {
      id: "user-123",
      email: "admin@starmedical.test",
      roles: ["ADMIN"],
      permissions: []
    },
    async () => true
  );

  assert.equal(actorUserId, "user-123");
});

