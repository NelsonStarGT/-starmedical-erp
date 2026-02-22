// @deprecated Legacy alias. Usa /api/memberships/dashboard
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { buildDashboard } from "@/lib/memberships/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:READ", "MEMBERSHIPS:DASHBOARD"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const data = await buildDashboard(prisma);
  return NextResponse.json({ data });
}

export const GET = withApiErrorHandling(handler);
