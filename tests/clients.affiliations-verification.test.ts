import test from "node:test";
import assert from "node:assert/strict";
import { ClientAffiliationStatus } from "@prisma/client";
import {
  DEFAULT_AFFILIATION_VERIFY_MONTHS,
  isAffiliationPendingVerification,
  normalizeAffiliationVerifyMonths,
  resolveAffiliationEffectiveStatus
} from "@/lib/clients/affiliations";

test("normalizeAffiliationVerifyMonths aplica default y mínimo", () => {
  assert.equal(normalizeAffiliationVerifyMonths(undefined), DEFAULT_AFFILIATION_VERIFY_MONTHS);
  assert.equal(normalizeAffiliationVerifyMonths("0"), 1);
  assert.equal(normalizeAffiliationVerifyMonths("9"), 9);
});

test("ACTIVE reciente no cae en pending", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");
  const lastVerifiedAt = new Date("2025-11-01T00:00:00.000Z");
  assert.equal(
    isAffiliationPendingVerification({
      status: ClientAffiliationStatus.ACTIVE,
      lastVerifiedAt,
      verifyAfterMonths: 6,
      now
    }),
    false
  );
  assert.equal(
    resolveAffiliationEffectiveStatus({
      status: ClientAffiliationStatus.ACTIVE,
      lastVerifiedAt,
      verifyAfterMonths: 6,
      now
    }),
    ClientAffiliationStatus.ACTIVE
  );
});

test("ACTIVE vencida se marca PENDING_VERIFY", () => {
  const now = new Date("2026-02-01T00:00:00.000Z");
  const lastVerifiedAt = new Date("2025-05-01T00:00:00.000Z");
  assert.equal(
    resolveAffiliationEffectiveStatus({
      status: ClientAffiliationStatus.ACTIVE,
      lastVerifiedAt,
      verifyAfterMonths: 6,
      now
    }),
    ClientAffiliationStatus.PENDING_VERIFY
  );
});

test("INACTIVE no se marca pendiente", () => {
  assert.equal(
    resolveAffiliationEffectiveStatus({
      status: ClientAffiliationStatus.INACTIVE,
      lastVerifiedAt: null,
      verifyAfterMonths: 6,
      now: new Date("2026-02-01T00:00:00.000Z")
    }),
    ClientAffiliationStatus.INACTIVE
  );
});

