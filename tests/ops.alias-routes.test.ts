import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as getOpsHealth } from "@/app/api/admin/config/ops/health/route";
import { GET as getOpsMetrics } from "@/app/api/admin/config/ops/metrics/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, payload: { tenantId: string; roles: string[]; permissions?: string[] }) {
  const token = jwt.sign(
    {
      id: `ops-${payload.tenantId}`,
      email: `ops+${payload.tenantId}@starmedical.test`,
      roles: payload.roles,
      permissions: payload.permissions || [],
      tenantId: payload.tenantId
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );

  return new NextRequest(url, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    }
  });
}

test("ops health alias returns current snapshot for OPS role", async () => {
  const req = buildAuthRequest("http://localhost/api/admin/config/ops/health?persist=0", {
    tenantId: "tenant-alpha",
    roles: ["OPS"]
  });

  const res = await getOpsHealth(req);
  const payload = (await res.json()) as {
    ok?: boolean;
    data?: { status?: string; services?: unknown[] };
  };

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.ok(typeof payload.data?.status === "string");
  assert.ok(Array.isArray(payload.data?.services));
});

test("ops metrics alias returns current services for OPS role", async () => {
  const req = buildAuthRequest("http://localhost/api/admin/config/ops/metrics?range=5m&persist=0", {
    tenantId: "tenant-alpha",
    roles: ["OPS"]
  });

  const res = await getOpsMetrics(req);
  const payload = (await res.json()) as {
    ok?: boolean;
    data?: { status?: string; services?: unknown[] };
  };

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.ok(typeof payload.data?.status === "string");
  assert.ok(Array.isArray(payload.data?.services));
});
