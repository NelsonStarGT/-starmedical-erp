import assert from "node:assert/strict";
import test from "node:test";
import { isRequestedBranchAllowed, resolveEffectiveBranchId } from "@/lib/branch/scopeRules";

test("resolveEffectiveBranchId prioriza preferred y respeta allowlist", () => {
  const branchId = resolveEffectiveBranchId({
    allowedBranchIds: ["b-lock-1"],
    preferredBranchId: "b-lock-1",
    cookieBranchId: "b-other",
    sessionBranchId: "b-other"
  });

  assert.equal(branchId, "b-lock-1");
});

test("resolveEffectiveBranchId usa cookie válido cuando preferred no aplica", () => {
  const branchId = resolveEffectiveBranchId({
    allowedBranchIds: ["b-switch-1", "b-switch-2"],
    preferredBranchId: "b-legacy",
    cookieBranchId: "b-switch-2",
    sessionBranchId: "b-switch-1"
  });

  assert.equal(branchId, "b-switch-2");
});

test("isRequestedBranchAllowed bloquea sede fuera del alcance", () => {
  assert.equal(isRequestedBranchAllowed("b-switch-1", ["b-switch-1", "b-switch-2"]), true);
  assert.equal(isRequestedBranchAllowed("b-other", ["b-switch-1", "b-switch-2"]), false);
});
