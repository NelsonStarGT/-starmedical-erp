import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { withApiErrorHandling } from "@/lib/api/http";
import { unlinkUserAndEmployee } from "@/lib/users/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  const result = await unlinkUserAndEmployee(prisma as any, params.id);
  return NextResponse.json({ data: result }, { status: 200 });
}

export const POST = withApiErrorHandling(handler);
