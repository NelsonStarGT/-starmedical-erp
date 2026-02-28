import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as birthdaysRoute } from "@/app/api/clientes/reportes/birthdays/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, payload: { tenantId: string; roles?: string[]; permissions?: string[] }) {
  const token = jwt.sign(
    {
      id: `user-${payload.tenantId}`,
      email: `reports+${payload.tenantId}@starmedical.test`,
      roles: payload.roles ?? ["STAFF"],
      permissions: payload.permissions ?? ["CLIENTS_REPORTS_VIEW"],
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

test("birthdays endpoint usa tenant de sesión aunque intenten inyectar tenantId por query", async () => {
  const profileDelegate = (prisma as any).clientProfile;
  assert.ok(profileDelegate?.findMany, "clientProfile.findMany delegate missing");

  const datetimeDelegate = (prisma as any).tenantDateTimeConfig;
  const originalDateTimeFindUnique = datetimeDelegate?.findUnique;
  const originalDateTimeCreate = datetimeDelegate?.create;

  const originalFindMany = profileDelegate.findMany;
  let capturedWhere: any = null;

  profileDelegate.findMany = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return [];
  };

  if (datetimeDelegate?.findUnique) {
    datetimeDelegate.findUnique = async () => ({
      tenantId: "tenant-alpha",
      dateFormat: "DMY",
      timeFormat: "H24",
      timezone: "America/Guatemala",
      weekStartsOn: "MON",
      updatedByUserId: null,
      updatedAt: new Date()
    });
  }

  if (datetimeDelegate?.create) {
    datetimeDelegate.create = async () => ({
      tenantId: "tenant-alpha",
      dateFormat: "DMY",
      timeFormat: "H24",
      timezone: "America/Guatemala",
      weekStartsOn: "MON",
      updatedByUserId: null,
      updatedAt: new Date()
    });
  }

  try {
    const req = buildAuthRequest(
      "http://localhost/api/clientes/reportes/birthdays?format=json&tenantId=tenant-malicioso&q=ana",
      { tenantId: "tenant-alpha", permissions: ["CLIENTS_REPORTS_VIEW"] }
    );

    const res = await birthdaysRoute(req);
    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.tenantId, "tenant-alpha");
  } finally {
    profileDelegate.findMany = originalFindMany;
    if (datetimeDelegate?.findUnique) {
      datetimeDelegate.findUnique = originalDateTimeFindUnique;
    }
    if (datetimeDelegate?.create) {
      datetimeDelegate.create = originalDateTimeCreate;
    }
  }
});
