// @deprecated Legacy alias. Usa /api/memberships/contracts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, safeJson } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { listContracts, createContract } from "@/lib/memberships/service";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:READ", "MEMBERSHIPS:CONTRACTS:READ"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const data = await listContracts(prisma, {
    status: params.get("status")?.toUpperCase() || undefined,
    ownerType: params.get("ownerType")?.toUpperCase() || undefined,
    planId: params.get("planId") || undefined,
    q: params.get("q") || undefined
  });

  return NextResponse.json({ data });
}

async function postHandler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:CONTRACTS:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await safeJson(req);
  const contract = await createContract(prisma, body);
  return NextResponse.json({ data: contract }, { status: 201 });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
