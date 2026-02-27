import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as getSchemaHealth } from "@/app/api/admin/clientes/schema-health/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(roles: string[]) {
  const token = jwt.sign(
    {
      id: "user-test",
      email: "ops@starmedical.test",
      roles,
      permissions: [],
      tenantId: "tenant-alpha"
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );

  return new NextRequest("http://localhost/api/admin/clientes/schema-health", {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    }
  });
}

test("schema-health endpoint responde OK cuando todas las tablas existen", async () => {
  const original = (prisma as any).$queryRawUnsafe;
  (prisma as any).$queryRawUnsafe = (async () => {
    const row = new Proxy(
      {},
      {
        get: () => "public.mock"
      }
    );
    return [row];
  }) as typeof prisma.$queryRawUnsafe;

  try {
    const res = await getSchemaHealth(buildAuthRequest(["ADMIN"]));
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      data?: {
        domains?: Array<{ status: string }>;
      };
    };
    assert.equal(payload.ok, true);
    assert.ok(payload.data?.domains?.every((item) => item.status === "OK"));
  } finally {
    (prisma as any).$queryRawUnsafe = original;
  }
});

test("schema-health endpoint reporta Missing cuando faltan tablas requeridas", async () => {
  const original = (prisma as any).$queryRawUnsafe;
  (prisma as any).$queryRawUnsafe = (async () => [{}]) as typeof prisma.$queryRawUnsafe;

  try {
    const res = await getSchemaHealth(buildAuthRequest(["ADMIN"]));
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      data?: {
        domains?: Array<{ status: string }>;
      };
    };
    assert.equal(payload.ok, true);
    assert.ok(payload.data?.domains?.some((item) => item.status === "Missing"));
  } finally {
    (prisma as any).$queryRawUnsafe = original;
  }
});
