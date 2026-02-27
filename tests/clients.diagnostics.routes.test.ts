import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { GET as exportDiagnostics } from "@/app/api/admin/clientes/diagnostics/export/route";
import { POST as resolveDiagnostics } from "@/app/api/admin/clientes/diagnostics/resolve/route";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildRequest(
  url: string,
  roles: string[],
  init?: { method?: string; body?: unknown; tenantId?: string }
) {
  const tenantId = init?.tenantId ?? "tenant-alpha";
  const token = jwt.sign(
    {
      id: "user-test",
      email: "ops@starmedical.test",
      roles,
      permissions: [],
      tenantId
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );
  return new NextRequest(url, {
    method: init?.method ?? "GET",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  });
}

test("diagnostics resolve route persiste estado por digest", async () => {
  const original = (prisma as any).systemEventLog.updateMany;
  let captured: any = null;
  (prisma as any).systemEventLog.updateMany = async (args: any) => {
    captured = args;
    return { count: 3 };
  };

  try {
    const req = buildRequest("http://localhost/api/admin/clientes/diagnostics/resolve", ["ADMIN"], {
      method: "POST",
      body: {
        digest: "digest-1",
        resolved: true,
        resolutionNote: "validado",
        domain: "clients"
      }
    });
    const res = await resolveDiagnostics(req);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as { ok: boolean; data?: { updatedCount?: number; resolved?: boolean } };
    assert.equal(payload.ok, true);
    assert.equal(payload.data?.updatedCount, 3);
    assert.equal(payload.data?.resolved, true);
    assert.equal(captured.where.digest, "digest-1");
  } finally {
    (prisma as any).systemEventLog.updateMany = original;
  }
});

test("diagnostics export route devuelve JSON filtrado", async () => {
  const original = (prisma as any).systemEventLog.findMany;
  let capturedWhere: any = null;
  (prisma as any).systemEventLog.findMany = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return [
      {
        id: "evt-1",
        createdAt: new Date(),
        tenantId: "tenant-alpha",
        domain: "clients",
        eventType: "PRISMA_SCHEMA_REQUIRED_BLOCKED",
        severity: "ERROR",
        code: "P2021",
        resource: "clients.actions",
        messageShort: "missing table",
        digest: "digest-1",
        metaJson: { classification: "REQUIRED" },
        resolvedAt: null,
        resolvedByUserId: null,
        resolutionNote: null
      }
    ];
  };

  try {
    const req = buildRequest(
      "http://localhost/api/admin/clientes/diagnostics/export?format=json&module=summary&domain=clients&severity=all&dateWindow=30d&code=all&tenantId=tenant-otro",
      ["ADMIN"],
      { tenantId: "tenant-alpha" }
    );
    const res = await exportDiagnostics(req);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type")?.includes("application/json"), true);
    const payload = (await res.json()) as { ok?: boolean; total?: number; rows?: Array<{ digest: string }> };
    assert.equal(payload.ok, true);
    assert.equal(payload.total, 1);
    assert.equal(payload.rows?.[0]?.digest, "digest-1");
    assert.equal(capturedWhere?.tenantId, "tenant-alpha");
  } finally {
    (prisma as any).systemEventLog.findMany = original;
  }
});

test("diagnostics resolve route ignora tenantId inyectado y usa sesión", async () => {
  const original = (prisma as any).systemEventLog.updateMany;
  let capturedWhere: any = null;
  (prisma as any).systemEventLog.updateMany = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return { count: 1 };
  };

  try {
    const req = buildRequest("http://localhost/api/admin/clientes/diagnostics/resolve", ["ADMIN"], {
      method: "POST",
      tenantId: "tenant-bravo",
      body: {
        digest: "digest-2",
        resolved: true,
        resolutionNote: "ok",
        domain: "clients",
        tenantId: "tenant-injected"
      }
    });
    const res = await resolveDiagnostics(req);
    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.tenantId, "tenant-bravo");
  } finally {
    (prisma as any).systemEventLog.updateMany = original;
  }
});
