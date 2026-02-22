import test from "node:test";
import assert from "node:assert/strict";

function computeLegacyIsActive(status: string, onboardingStatus: string) {
  return status === "ACTIVE" && onboardingStatus === "ACTIVE";
}

test("isActive false cuando status != ACTIVE", () => {
  assert.equal(computeLegacyIsActive("SUSPENDED", "ACTIVE"), false);
});

test("isActive false cuando onboarding != ACTIVE", () => {
  assert.equal(computeLegacyIsActive("ACTIVE", "DRAFT"), false);
});

test("isActive true solo si ambos ACTIVE", () => {
  assert.equal(computeLegacyIsActive("ACTIVE", "ACTIVE"), true);
});
