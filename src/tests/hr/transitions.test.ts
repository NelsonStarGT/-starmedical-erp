import assert from "node:assert/strict";
import test from "node:test";
import { validateStatusTransition, normalizeCompletionStep } from "@/lib/hr/transitions";

const staffActor = { id: "u1", roles: ["staff"], permissions: [] };

test("validateStatusTransition rejects staff actors", () => {
  const result = validateStatusTransition({
    action: "terminate",
    employee: { status: "ACTIVE" as any, onboardingStatus: "ACTIVE" },
    actor: staffActor as any
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 403);
    assert.equal(result.error, "No autorizado");
    assert.equal(result.code, "FORBIDDEN");
  }
});

test("suspend transition validates current status", () => {
  const terminated = validateStatusTransition({
    action: "suspend",
    employee: { status: "TERMINATED" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["ADMIN"] } as any
  });
  assert.equal(terminated.ok, false);
  if (!terminated.ok) assert.equal(terminated.status, 409);

  const alreadySuspended = validateStatusTransition({
    action: "suspend",
    employee: { status: "SUSPENDED" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["ADMIN"] } as any
  });
  assert.equal(alreadySuspended.ok, false);

  const allowed = validateStatusTransition({
    action: "suspend",
    employee: { status: "ACTIVE" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["ADMIN"] } as any
  });
  assert.equal(allowed.ok, true);
});

test("activate transition requires onboarding active and not already active/terminated", () => {
  const onboardingIncomplete = validateStatusTransition({
    action: "activate",
    employee: { status: "INACTIVE" as any, onboardingStatus: "IN_REVIEW" },
    actor: { roles: ["HR_ADMIN"] } as any
  });
  assert.equal(onboardingIncomplete.ok, false);
  if (!onboardingIncomplete.ok) assert.equal(onboardingIncomplete.status, 409);

  const alreadyActive = validateStatusTransition({
    action: "activate",
    employee: { status: "ACTIVE" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["HR_ADMIN"] } as any
  });
  assert.equal(alreadyActive.ok, false);

  const ok = validateStatusTransition({
    action: "activate",
    employee: { status: "SUSPENDED" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["HR_ADMIN"] } as any
  });
  assert.equal(ok.ok, true);
});

test("terminate transition blocks already terminated", () => {
  const blocked = validateStatusTransition({
    action: "terminate",
    employee: { status: "TERMINATED" as any, onboardingStatus: "ACTIVE" },
    actor: { roles: ["ADMIN"] } as any
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.status, 409);
});

test("normalizeCompletionStep enforces minimum step", () => {
  assert.equal(normalizeCompletionStep(undefined), 3);
  assert.equal(normalizeCompletionStep(2), 3);
  assert.equal(normalizeCompletionStep(5), 5);
});
