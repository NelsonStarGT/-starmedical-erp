import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as listCompaniesRoute } from "@/app/api/admin/companies/route";
import { GET as getCompanyRoute } from "@/app/api/admin/companies/[id]/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, payload: { tenantId: string; roles?: string[]; permissions?: string[] }) {
  const token = jwt.sign(
    {
      id: `user-${payload.tenantId}`,
      email: `admin+${payload.tenantId}@starmedical.test`,
      roles: payload.roles ?? ["ADMIN"],
      permissions: payload.permissions ?? [],
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

test("companies list route ignora tenantId por query y usa tenant de sesión", async () => {
  const delegate = (prisma as any).company;
  assert.ok(delegate?.count, "company.count delegate missing");
  assert.ok(delegate?.findMany, "company.findMany delegate missing");

  const originalCount = delegate.count;
  const originalFindMany = delegate.findMany;

  let capturedCountWhere: any = null;
  let capturedFindManyWhere: any = null;

  delegate.count = async (args: any) => {
    capturedCountWhere = args?.where ?? null;
    return 0;
  };

  delegate.findMany = async (args: any) => {
    capturedFindManyWhere = args?.where ?? null;
    return [];
  };

  try {
    const req = buildAuthRequest(
      "http://localhost/api/admin/companies?tenantId=tenant-malicioso&q=Acme&page=1&pageSize=10",
      { tenantId: "tenant-alpha", roles: ["ADMIN"] }
    );

    const res = await listCompaniesRoute(req);
    assert.equal(res.status, 200);
    assert.equal(capturedCountWhere?.tenantId, "tenant-alpha");
    assert.equal(capturedFindManyWhere?.tenantId, "tenant-alpha");
  } finally {
    delegate.count = originalCount;
    delegate.findMany = originalFindMany;
  }
});

test("companies detail route filtra por id + tenant de sesión", async () => {
  const delegate = (prisma as any).company;
  assert.ok(delegate?.findFirst, "company.findFirst delegate missing");

  const originalFindFirst = delegate.findFirst;
  const originalFindUnique = delegate.findUnique;

  let capturedWhere: any = null;
  let findUniqueCalled = false;

  delegate.findFirst = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return {
      id: "company-1",
      tenantId: "tenant-alpha",
      deletedAt: null
    };
  };

  if (typeof originalFindUnique === "function") {
    delegate.findUnique = async (...args: any[]) => {
      findUniqueCalled = true;
      return originalFindUnique.apply(delegate, args);
    };
  }

  try {
    const req = buildAuthRequest(
      "http://localhost/api/admin/companies/company-1?tenantId=tenant-otro&includeArchived=1",
      { tenantId: "tenant-alpha", roles: ["ADMIN"] }
    );

    const res = await getCompanyRoute(req, { params: { id: "company-1" } });
    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.id, "company-1");
    assert.equal(capturedWhere?.tenantId, "tenant-alpha");
    assert.equal(findUniqueCalled, false);
  } finally {
    delegate.findFirst = originalFindFirst;
    if (typeof originalFindUnique === "function") {
      delegate.findUnique = originalFindUnique;
    }
  }
});
