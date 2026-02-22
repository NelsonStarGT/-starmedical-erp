import test from "node:test";
import assert from "node:assert/strict";
import { resolveZone, buildRawPayload } from "@/lib/attendance/punchLogic";

const baseConfig = {
  siteId: "site-1",
  lat: 0,
  lng: 0,
  radiusMeters: 100,
  allowOutOfZone: false,
  requirePhoto: false,
  requireLiveness: "OFF" as const,
  windowBeforeMinutes: 0,
  windowAfterMinutes: 0,
  antiPassback: false,
  allowedSources: ["SELFIE_WEB"]
};

test("resolveZone returns OUT_OF_ZONE when distance > radius", () => {
  const res = resolveZone({ lat: 0, lng: 0, radiusMeters: 50 }, { lat: 0.001, lng: 0.001 });
  assert.equal(res.zone, "OUT_OF_ZONE");
});

test("buildRawPayload succeeds in zone", () => {
  const payload = buildRawPayload({
    config: baseConfig,
    employeeId: "emp1",
    location: { lat: 0, lng: 0 },
    zone: "IN_ZONE",
    type: "CHECK_IN",
    userAgent: "test"
  });
  assert.equal(payload.employeeId, "emp1");
  assert.equal(payload.zoneStatus, "IN_ZONE");
});

test("buildRawPayload throws when photo required and missing", () => {
  assert.throws(
    () =>
      buildRawPayload({
        config: { ...baseConfig, requirePhoto: true },
        employeeId: "emp1",
        location: { lat: 0, lng: 0 },
        zone: "IN_ZONE",
        type: "CHECK_OUT"
      }),
    { status: 400 }
  );
});

test("buildRawPayload blocks out-of-zone when not allowed", () => {
  assert.throws(
    () =>
      buildRawPayload({
        config: baseConfig,
        employeeId: "emp1",
        location: { lat: 0, lng: 0 },
        zone: "OUT_OF_ZONE",
        type: "CHECK_OUT"
      }),
    { status: 400 }
  );
});
