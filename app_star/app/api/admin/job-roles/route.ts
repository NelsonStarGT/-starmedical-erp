import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  // Prisma client typings in this build don't expose JobRole; cast to avoid type error.
  const jobRoles = await (prisma as any).jobRole.findMany({
    where: {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true }
  });
  return NextResponse.json({ data: jobRoles });
}

export const GET = withApiErrorHandling(handler);
