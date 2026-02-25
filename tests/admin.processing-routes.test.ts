import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as getJobs } from "@/app/api/admin/processing/jobs/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, payload: { tenantId: string; permissions: string[]; roles?: string[] }) {
  const token = jwt.sign(
    {
      id: `user-${payload.tenantId}`,
      email: `ops+${payload.tenantId}@starmedical.test`,
      roles: payload.roles || ["STAFF"],
      permissions: payload.permissions,
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

test("admin processing jobs route returns 403 without capability", async () => {
  const req = buildAuthRequest("http://localhost/api/admin/processing/jobs", {
    tenantId: "tenant-alpha",
    permissions: [],
    roles: ["STAFF"]
  });

  const res = await getJobs(req);
  assert.equal(res.status, 403);
});

test("admin processing jobs route returns 401 without session", async () => {
  const req = new NextRequest("http://localhost/api/admin/processing/jobs");
  const res = await getJobs(req);
  assert.equal(res.status, 401);
});

test("admin processing jobs route enforces tenant from session", async () => {
  const delegate = (prisma as any).processingServiceConfig;
  assert.ok(delegate?.findUnique, "processingServiceConfig delegate missing");

  const originalFindUnique = delegate.findUnique;
  const originalFetch = global.fetch;

  let capturedUrl = "";
  let capturedAuth = "";

  delegate.findUnique = async () => ({
    tenantId: "tenant-alpha",
    baseUrl: "http://processing.internal",
    authMode: "TOKEN",
    tokenRef: "token-interno",
    hmacSecretRef: null,
    enablePdf: true,
    enableExcel: true,
    enableDocx: true,
    enableImages: true,
    timeoutMs: 12000,
    retryCount: 0,
    updatedByUserId: null,
    updatedAt: new Date()
  });

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);

    const headers =
      init?.headers instanceof Headers
        ? init.headers
        : new Headers((init?.headers as HeadersInit | undefined) || undefined);
    capturedAuth = headers.get("authorization") || "";

    return new Response(JSON.stringify({ jobs: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  }) as typeof fetch;

  try {
    const req = buildAuthRequest(
      "http://localhost/api/admin/processing/jobs?tenantId=tenant-otro&status=failed&q=abc",
      {
        tenantId: "tenant-alpha",
        permissions: ["CONFIG_SERVICES_READ"],
        roles: ["STAFF"]
      }
    );

    const res = await getJobs(req);
    assert.equal(res.status, 200);
    assert.match(capturedUrl, /tenantId=tenant-alpha/);
    assert.doesNotMatch(capturedUrl, /tenantId=tenant-otro/);
    assert.equal(capturedAuth, "Bearer token-interno");
  } finally {
    delegate.findUnique = originalFindUnique;
    global.fetch = originalFetch;
  }
});

test("admin processing jobs route returns normalized list shape", async () => {
  const delegate = (prisma as any).processingServiceConfig;
  assert.ok(delegate?.findUnique, "processingServiceConfig delegate missing");

  const originalFindUnique = delegate.findUnique;
  const originalFetch = global.fetch;

  delegate.findUnique = async () => ({
    tenantId: "tenant-alpha",
    baseUrl: "http://processing.internal",
    authMode: "TOKEN",
    tokenRef: "token-interno",
    hmacSecretRef: null,
    enablePdf: true,
    enableExcel: true,
    enableDocx: true,
    enableImages: true,
    timeoutMs: 12000,
    retryCount: 0,
    updatedByUserId: null,
    updatedAt: new Date()
  });

  global.fetch = (async () => {
    return new Response(
      JSON.stringify({
        jobs: [
          {
            jobId: "job_1",
            tenantId: "tenant-alpha",
            actorId: "user-alpha",
            jobType: "excel_export",
            status: "queued",
            createdAt: new Date().toISOString(),
            artifacts: []
          }
        ]
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  try {
    const req = buildAuthRequest("http://localhost/api/admin/processing/jobs?limit=10&page=1", {
      tenantId: "tenant-alpha",
      permissions: ["CONFIG_SERVICES_READ"],
      roles: ["OPS"]
    });

    const res = await getJobs(req);
    const payload = (await res.json()) as {
      ok: boolean;
      data?: {
        items?: unknown[];
        page?: number;
        pageSize?: number;
        total?: number;
      };
    };

    assert.equal(res.status, 200);
    assert.equal(payload.ok, true);
    assert.ok(Array.isArray(payload.data?.items));
    assert.equal(payload.data?.page, 1);
    assert.equal(payload.data?.pageSize, 10);
    assert.equal(payload.data?.total, 1);
  } finally {
    delegate.findUnique = originalFindUnique;
    global.fetch = originalFetch;
  }
});
