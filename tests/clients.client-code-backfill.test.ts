import test from "node:test";
import assert from "node:assert/strict";
import { ClientProfileType } from "@prisma/client";
import { buildClientCodeBackfillPlan } from "@/lib/clients/clientCodeBackfill";

test("backfill plan asigna correlativos por tipo sin colisiones", () => {
  const plan = buildClientCodeBackfillPlan({
    clientType: ClientProfileType.COMPANY,
    existingCodes: ["E001", "E002", "E004", null, ""],
    pendingClientIds: ["c-1", "c-2", "c-3"]
  });

  assert.equal(plan.prefix, "E");
  assert.deepEqual(
    plan.updates,
    [
      { clientId: "c-1", clientCode: "E005" },
      { clientId: "c-2", clientCode: "E006" },
      { clientId: "c-3", clientCode: "E007" }
    ]
  );
  assert.equal(plan.nextNumber, 8);
});

test("backfill plan es idempotente si no quedan pendientes", () => {
  const firstRun = buildClientCodeBackfillPlan({
    clientType: ClientProfileType.PERSON,
    existingCodes: ["C001", "C002"],
    pendingClientIds: ["p-1", "p-2"]
  });

  const secondRun = buildClientCodeBackfillPlan({
    clientType: ClientProfileType.PERSON,
    existingCodes: ["C001", "C002", ...firstRun.updates.map((item) => item.clientCode)],
    pendingClientIds: []
  });

  assert.equal(secondRun.updates.length, 0);
  assert.equal(secondRun.nextNumber, 5);
});

