import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const perm = requirePermission(auth.user, "USERS:ADMIN");
  if (perm.errorResponse) return perm.errorResponse;

  const employee = await prisma.hrEmployee.findFirst({ where: { userId: params.id }, select: { id: true } });
  return NextResponse.json({ linked: Boolean(employee), employeeId: employee?.id });
}
