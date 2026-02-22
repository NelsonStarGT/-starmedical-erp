import test from "node:test";
import assert from "node:assert/strict";
import { isEligible, validateSequence } from "@/lib/hr/attendance/events";

test("eligibility blocks onboarding incompleto", () => {
  assert.throws(() => isEligible({ status: "ACTIVE", onboardingStatus: "DRAFT" }), { status: 409 });
});

test("sequence blocks double check-in", () => {
  const day = [{ type: "CHECK_IN", occurredAt: new Date("2024-01-01T08:00:00Z") }];
  assert.throws(() => validateSequence(day as any, { type: "CHECK_IN", occurredAt: new Date("2024-01-01T09:00:00Z") }), { status: 409 });
});

test("sequence blocks checkout without checkin", () => {
  assert.throws(() => validateSequence([], { type: "CHECK_OUT", occurredAt: new Date("2024-01-01T09:00:00Z") }), { status: 409 });
});
