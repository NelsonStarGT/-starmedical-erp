import test from "node:test";
import assert from "node:assert/strict";
import { ClientProfileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PORTAL_RATE_LIMIT_MAX, PORTAL_RATE_LIMIT_WINDOW_MS } from "@/lib/portal/constants";
import { clearPortalRateLimitStoreForTests, consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { resolvePortalInvoiceLookupSource } from "@/lib/portal/data";
import {
  buildPortalRefreshCookieOptions,
  buildPortalSessionCookieOptions,
  createPortalSession,
  rotatePortalSessionByRefreshToken
} from "@/lib/portal/session";
import { buildPortalChallengeDates, validatePortalChallengeState } from "@/lib/portal/workflow";

test("portal request crea challenge con expiración de 10 minutos", () => {
  const now = new Date("2026-02-10T10:00:00.000Z");
  const dates = buildPortalChallengeDates(now);
  const diffMs = dates.expiresAt.getTime() - now.getTime();
  assert.equal(diffMs, 10 * 60 * 1000);
});

test("portal verify consume token una sola vez", () => {
  const now = new Date("2026-02-10T10:00:00.000Z");
  const activeState = validatePortalChallengeState({
    consumedAt: null,
    expiresAt: new Date("2026-02-10T10:10:00.000Z"),
    attempts: 0,
    clientId: "client-1"
  }, now);
  assert.equal(activeState.ok, true);

  const consumedState = validatePortalChallengeState({
    consumedAt: new Date("2026-02-10T10:01:00.000Z"),
    expiresAt: new Date("2026-02-10T10:10:00.000Z"),
    attempts: 1,
    clientId: "client-1"
  }, now);

  assert.equal(consumedState.ok, false);
  if (!consumedState.ok) {
    assert.equal(consumedState.reason, "CONSUMED");
  }
});

test("portal session construye cookie segura para sesión", () => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const cookie = buildPortalSessionCookieOptions("token-raw", expiresAt);
  assert.equal(cookie.name, "portal_session");
  assert.equal(cookie.value, "token-raw");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/portal");
  assert.ok(cookie.maxAge > 0);
});

test("portal session construye cookie segura para refresh", () => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const cookie = buildPortalRefreshCookieOptions("refresh-raw", expiresAt);
  assert.equal(cookie.name, "portal_refresh");
  assert.equal(cookie.value, "refresh-raw");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/portal");
  assert.ok(cookie.maxAge > 0);
});

test("portal rate limit persistente aplica 5 requests por 10 minutos", async () => {
  const previousBackend = process.env.PORTAL_RATE_LIMIT_BACKEND;
  process.env.PORTAL_RATE_LIMIT_BACKEND = "memory";
  try {
    await clearPortalRateLimitStoreForTests();
    const key = "portal:test:destination";
    const nowMs = Date.now();

    for (let index = 0; index < PORTAL_RATE_LIMIT_MAX; index += 1) {
      const result = await consumePortalRateLimit(key, { nowMs: nowMs + index });
      assert.equal(result.allowed, true);
    }

    const blocked = await consumePortalRateLimit(key, { nowMs: nowMs + 5 });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);

    const reset = await consumePortalRateLimit(key, { nowMs: nowMs + PORTAL_RATE_LIMIT_WINDOW_MS + 10 });
    assert.equal(reset.allowed, true);
  } finally {
    if (previousBackend === undefined) {
      delete process.env.PORTAL_RATE_LIMIT_BACKEND;
    } else {
      process.env.PORTAL_RATE_LIMIT_BACKEND = previousBackend;
    }
  }
});

test("invoices usa relación fuerte y bloquea heurística ambigua", () => {
  assert.equal(
    resolvePortalInvoiceLookupSource({ partyId: "party_1", heuristicPartyIds: ["party_2", "party_3"] }),
    "partyId"
  );
  assert.equal(resolvePortalInvoiceLookupSource({ partyId: null, heuristicPartyIds: ["party_2"] }), "heuristic_single");
  assert.equal(resolvePortalInvoiceLookupSource({ partyId: null, heuristicPartyIds: ["party_2", "party_3"] }), "heuristic_multiple");
});

test("refresh rota tokens y replay revoca sesión", async (t) => {
  const previousBackend = process.env.PORTAL_RATE_LIMIT_BACKEND;
  process.env.PORTAL_RATE_LIMIT_BACKEND = "memory";

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch {
    t.skip("DB no disponible para test de rotación de sesión");
    return;
  }

  const client = await prisma.clientProfile.create({
    data: {
      type: ClientProfileType.PERSON,
      firstName: "Portal",
      lastName: "Test",
      dpi: `99${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13),
      phone: `502${Math.floor(10000000 + Math.random() * 89999999)}`,
      email: `portal.test.${Date.now()}@starmedical.test`
    },
    select: { id: true }
  });

  try {
    const created = await createPortalSession({ clientId: client.id });
    const firstRefresh = created.tokens.refreshToken;

    const rotated = await rotatePortalSessionByRefreshToken({
      refreshToken: firstRefresh,
      reason: "API_REFRESH"
    });
    assert.equal(rotated.ok, true);
    if (!rotated.ok) return;
    assert.notEqual(rotated.tokens.refreshToken, firstRefresh);

    const replay = await rotatePortalSessionByRefreshToken({
      refreshToken: firstRefresh,
      reason: "API_REFRESH"
    });
    assert.equal(replay.ok, false);
    if (!replay.ok) {
      assert.equal(replay.reason, "REPLAY");
    }

    const session = await prisma.portalSession.findUnique({
      where: { id: rotated.sessionId },
      select: { revokedAt: true }
    });
    assert.ok(session?.revokedAt);
  } finally {
    if (previousBackend === undefined) {
      delete process.env.PORTAL_RATE_LIMIT_BACKEND;
    } else {
      process.env.PORTAL_RATE_LIMIT_BACKEND = previousBackend;
    }
    await prisma.portalSessionRotationLog.deleteMany({ where: { session: { clientId: client.id } } });
    await prisma.portalSession.deleteMany({ where: { clientId: client.id } });
    await prisma.clientProfile.delete({ where: { id: client.id } });
  }
});
