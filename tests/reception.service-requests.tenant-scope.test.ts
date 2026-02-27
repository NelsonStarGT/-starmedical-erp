import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { GET as getServiceRequests } from "@/app/api/reception/service-requests/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, payload?: { tenantId?: string; branchId?: string; roles?: string[] }) {
  const tenantId = payload?.tenantId ?? "tenant-alpha";
  const branchId = payload?.branchId ?? "branch-1";
  const token = jwt.sign(
    {
      id: `user-${tenantId}`,
      email: `reception+${tenantId}@starmedical.test`,
      roles: payload?.roles ?? ["RECEPTIONIST"],
      permissions: [],
      tenantId,
      branchId
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

test("service-requests GET visitId aplica tenant scope en búsqueda de visita", async () => {
  const branchDelegate = (prisma as any).branch;
  const userBranchAccessDelegate = (prisma as any).userBranchAccess;
  const visitDelegate = (prisma as any).visit;

  assert.ok(branchDelegate?.findMany, "branch.findMany delegate missing");
  assert.ok(visitDelegate?.findFirst, "visit.findFirst delegate missing");

  const originalBranchFindMany = branchDelegate.findMany;
  const originalUserBranchAccessFindMany = userBranchAccessDelegate?.findMany;
  const originalVisitFindFirst = visitDelegate.findFirst;

  let capturedVisitWhere: any = null;

  branchDelegate.findMany = async () => [
    { id: "branch-1", name: "Central", code: "CEN", isActive: true }
  ];

  if (userBranchAccessDelegate?.findMany) {
    userBranchAccessDelegate.findMany = async () => [];
  }

  visitDelegate.findFirst = async (args: any) => {
    capturedVisitWhere = args?.where ?? null;
    return {
      id: "visit-1",
      siteId: "branch-2"
    };
  };

  try {
    const req = buildAuthRequest("http://localhost/api/reception/service-requests?visitId=visit-1", {
      tenantId: "tenant-alpha",
      branchId: "branch-1"
    });
    const res = await getServiceRequests(req);

    assert.equal(res.status, 404);
    assert.equal(capturedVisitWhere?.id, "visit-1");
    assert.equal(capturedVisitWhere?.patient?.tenantId, "tenant-alpha");
  } finally {
    branchDelegate.findMany = originalBranchFindMany;
    if (userBranchAccessDelegate?.findMany && originalUserBranchAccessFindMany) {
      userBranchAccessDelegate.findMany = originalUserBranchAccessFindMany;
    }
    visitDelegate.findFirst = originalVisitFindFirst;
  }
});

test("service-requests GET siteId+area=open bloquea branch fuera de alcance", async () => {
  const branchDelegate = (prisma as any).branch;
  const userBranchAccessDelegate = (prisma as any).userBranchAccess;
  const systemEventLogDelegate = (prisma as any).systemEventLog;

  assert.ok(branchDelegate?.findMany, "branch.findMany delegate missing");

  const originalBranchFindMany = branchDelegate.findMany;
  const originalUserBranchAccessFindMany = userBranchAccessDelegate?.findMany;
  const originalSystemEventCreate = systemEventLogDelegate?.create;

  branchDelegate.findMany = async () => [
    { id: "branch-1", name: "Central", code: "CEN", isActive: true }
  ];

  if (userBranchAccessDelegate?.findMany) {
    userBranchAccessDelegate.findMany = async () => [];
  }

  if (systemEventLogDelegate?.create) {
    systemEventLogDelegate.create = async () => ({ id: "evt-1" });
  }

  try {
    const req = buildAuthRequest(
      "http://localhost/api/reception/service-requests?siteId=branch-2&area=lab&status=open",
      {
        tenantId: "tenant-alpha",
        branchId: "branch-1"
      }
    );

    const res = await getServiceRequests(req);
    const payload = (await res.json()) as { error?: string };

    assert.equal(res.status, 403);
    assert.equal(payload.error, "No autorizado para esta sede");
  } finally {
    branchDelegate.findMany = originalBranchFindMany;
    if (userBranchAccessDelegate?.findMany && originalUserBranchAccessFindMany) {
      userBranchAccessDelegate.findMany = originalUserBranchAccessFindMany;
    }
    if (systemEventLogDelegate?.create && originalSystemEventCreate) {
      systemEventLogDelegate.create = originalSystemEventCreate;
    }
  }
});
