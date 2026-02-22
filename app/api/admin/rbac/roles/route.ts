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

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, description: true, isSystem: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ data: roles });
}

export const GET = withApiErrorHandling(handler);
