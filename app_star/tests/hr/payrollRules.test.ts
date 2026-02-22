import test from "node:test";
import assert from "node:assert/strict";
import { assertApproved, assertDraft, computeNet, isEmployeeEligible, rangesOverlap } from "@/lib/hr/payrollMvp";

test("no editar si no es DRAFT", () => {
  assert.throws(() => assertDraft("APPROVED"), { status: 409 });
});

test("no publicar si no es APPROVED", () => {
  assert.throws(() => assertApproved("DRAFT"), { status: 409 });
});

test("overlap detecta periodos", () => {
  const aStart = new Date("2024-01-01");
  const aEnd = new Date("2024-01-15");
  const bStart = new Date("2024-01-10");
  const bEnd = new Date("2024-01-20");
  assert.equal(rangesOverlap(aStart, aEnd, bStart, bEnd), true);
});

test("elige solo activos con onboarding activo", () => {
  assert.equal(isEmployeeEligible({ status: "ACTIVE", onboardingStatus: "ACTIVE" }), true);
  assert.equal(isEmployeeEligible({ status: "ACTIVE", onboardingStatus: "DRAFT" }), false);
  assert.equal(isEmployeeEligible({ status: "TERMINATED", onboardingStatus: "ACTIVE" }), false);
});

test("net se calcula base + bonos - deducciones", () => {
  assert.equal(computeNet(1000, 200, 100), 1100);
});
