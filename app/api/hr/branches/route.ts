import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ data: branches });
}
