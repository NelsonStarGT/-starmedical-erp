import { ClientAffiliationStatus } from "@prisma/client";

export const DEFAULT_AFFILIATION_VERIFY_MONTHS = 6;

export function normalizeAffiliationVerifyMonths(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(parsed));
    }
  }
  return DEFAULT_AFFILIATION_VERIFY_MONTHS;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isAffiliationPendingVerification(input: {
  status: ClientAffiliationStatus;
  lastVerifiedAt?: Date | null;
  verifyAfterMonths?: number;
  now?: Date;
}) {
  if (input.status === ClientAffiliationStatus.INACTIVE) return false;
  if (input.status === ClientAffiliationStatus.PENDING_VERIFY) return true;

  const verifyAfterMonths = normalizeAffiliationVerifyMonths(input.verifyAfterMonths);
  const now = input.now ?? new Date();
  const lastVerifiedAt = input.lastVerifiedAt;

  if (!lastVerifiedAt) return true;

  return addMonths(lastVerifiedAt, verifyAfterMonths).getTime() <= now.getTime();
}

export function resolveAffiliationEffectiveStatus(input: {
  status: ClientAffiliationStatus;
  lastVerifiedAt?: Date | null;
  verifyAfterMonths?: number;
  now?: Date;
}) {
  if (isAffiliationPendingVerification(input)) return ClientAffiliationStatus.PENDING_VERIFY;
  return input.status;
}

