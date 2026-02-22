import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceLivenessLevel } from "@prisma/client";
import { isTokenActive, validatePunchTokenInput, validateSiteConfigInput } from "@/lib/attendance/configService";

test("validateSiteConfigInput blocks radio fuera de rango", () => {
  assert.throws(
    () =>
      validateSiteConfigInput({
        siteId: "site-1",
        lat: 10,
        lng: -90,
        radiusMeters: 10,
        windowBeforeMinutes: 0,
        windowAfterMinutes: 0
      }),
    { status: 400 }
  );
});

test("validateSiteConfigInput aplica defaults y enum", () => {
  const parsed = validateSiteConfigInput({
    siteId: "site-1",
    lat: 10.5,
    lng: -90.5,
    radiusMeters: 120,
    requireLiveness: "BASIC"
  });
  assert.equal(parsed.requireLiveness, AttendanceLivenessLevel.BASIC);
  assert.equal(parsed.allowedSources[0], "SELFIE_WEB");
});

test("validatePunchTokenInput convierte fecha válida y rechaza pasada", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const parsed = validatePunchTokenInput({ siteId: "site-1", expiresAt: future });
  assert(parsed.expiresAt instanceof Date);

  assert.throws(() => validatePunchTokenInput({ siteId: "site-1", expiresAt: "2000-01-01T00:00:00Z" }), { status: 400 });
});

test("isTokenActive detecta expirado o revocado", () => {
  const now = new Date();
  assert.equal(isTokenActive({ expiresAt: new Date(now.getTime() + 5000), revokedAt: null as any }, now), true);
  assert.equal(isTokenActive({ expiresAt: new Date(now.getTime() - 5000), revokedAt: null as any }, now), false);
  assert.equal(isTokenActive({ expiresAt: null as any, revokedAt: new Date() }, now), false);
});
