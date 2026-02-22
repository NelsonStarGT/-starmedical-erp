import test from "node:test";
import assert from "node:assert/strict";
import { ensureCanActivate, ensureCanSuspend, ensureCanTerminate, ensureOnboardingForPayroll, ensureOnboardingNotActive } from "@/lib/hr/transitionGuards";

test("suspender terminado -> 409", () => {
  assert.throws(() => ensureCanSuspend("TERMINATED"), { status: 409 });
});

test("activar terminado -> 409", () => {
  assert.throws(() => ensureCanActivate("TERMINATED"), { status: 409 });
});

test("terminar terminado -> 409", () => {
  assert.throws(() => ensureCanTerminate("TERMINATED"), { status: 409 });
});

test("onboarding ya activo -> 409", () => {
  assert.throws(() => ensureOnboardingNotActive("ACTIVE"), { status: 409 });
});

test("payroll requiere onboarding activo", () => {
  assert.throws(() => ensureOnboardingForPayroll("DRAFT"), { status: 409 });
});
