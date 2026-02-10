import { PORTAL_CHALLENGE_MAX_ATTEMPTS } from "@/lib/portal/constants";
import { buildPortalAccessExpiry, buildPortalChallengeExpiry, buildPortalRefreshExpiry } from "@/lib/portal/security";

export type PortalChallengeValidationReason = "CONSUMED" | "EXPIRED" | "MAX_ATTEMPTS" | "NO_CLIENT";

export type PortalChallengeStateInput = {
  consumedAt: Date | null;
  expiresAt: Date;
  attempts: number;
  clientId: string | null;
};

export function buildPortalChallengeDates(now = new Date()) {
  return {
    createdAt: now,
    expiresAt: buildPortalChallengeExpiry(now)
  };
}

export function buildPortalSessionDates(now = new Date()) {
  return {
    createdAt: now,
    accessExpiresAt: buildPortalAccessExpiry(now),
    refreshExpiresAt: buildPortalRefreshExpiry(now)
  };
}

export function validatePortalChallengeState(
  state: PortalChallengeStateInput,
  now = new Date(),
  maxAttempts = PORTAL_CHALLENGE_MAX_ATTEMPTS
): { ok: true } | { ok: false; reason: PortalChallengeValidationReason } {
  if (state.consumedAt) return { ok: false, reason: "CONSUMED" };
  if (state.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "EXPIRED" };
  if (state.attempts >= maxAttempts) return { ok: false, reason: "MAX_ATTEMPTS" };
  if (!state.clientId) return { ok: false, reason: "NO_CLIENT" };
  return { ok: true };
}

export function incrementPortalChallengeAttempts(attempts: number) {
  return attempts + 1;
}
