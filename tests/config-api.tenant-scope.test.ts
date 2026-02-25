import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { GET as getBillingSeries } from "@/app/api/admin/config/billing/series/route";
import { GET as getLegalEntities } from "@/app/api/admin/config/legal-entities/route";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, tenantId: string) {
  const token = jwt.sign(
    {
      id: `user-${tenantId}`,
      email: `admin+${tenantId}@starmedical.test`,
      roles: ["ADMIN"],
      permissions: [],
      tenantId
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

test("billing series API aplica filtro tenantId en consultas", async () => {
  const delegate = (prisma as any).billingSeries;
  assert.ok(delegate?.findMany, "billingSeries delegate missing");

  const originalFindMany = delegate.findMany;
  let capturedWhere: any = null;

  delegate.findMany = async (args: any) => {
    capturedWhere = args?.where;
    return [];
  };

  try {
    const req = buildAuthRequest(
      "http://localhost/api/admin/config/billing/series?legalEntityId=le-123&includeInactive=1",
      "tenant-alpha"
    );

    const res = await getBillingSeries(req);
    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.tenantId, "tenant-alpha");
    assert.equal(capturedWhere?.legalEntityId, "le-123");
  } finally {
    delegate.findMany = originalFindMany;
  }
});

test("legal entities API evita data leaks cross-tenant", async () => {
  const delegate = (prisma as any).legalEntity;
  assert.ok(delegate?.findMany, "legalEntity delegate missing");

  const originalFindMany = delegate.findMany;
  let capturedWhere: any = null;

  delegate.findMany = async (args: any) => {
    capturedWhere = args?.where;
    return [];
  };

  try {
    const req = buildAuthRequest("http://localhost/api/admin/config/legal-entities?includeInactive=0", "tenant-bravo");
    const res = await getLegalEntities(req);
    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.tenantId, "tenant-bravo");
    assert.equal(capturedWhere?.isActive, true);
  } finally {
    delegate.findMany = originalFindMany;
  }
});
