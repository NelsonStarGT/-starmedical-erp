import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"], "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const take = Math.min(25, Math.max(1, Number(url.searchParams.get("take")) || 10));

  const history = await prisma.hrCompensationHistory.findMany({
    where: { employeeId: resolvedParams.id },
    orderBy: { createdAt: "desc" },
    take
  });

  return NextResponse.json({
    data: history.map((item) => ({
      id: item.id,
      employeeId: item.employeeId,
      effectiveFrom: item.effectiveFrom.toISOString(),
      prevSalary: item.prevSalary?.toString() || null,
      newSalary: item.newSalary?.toString() || null,
      prevAllowance: item.prevAllowance?.toString() || null,
      newAllowance: item.newAllowance?.toString() || null,
      prevPayScheme: item.prevPayScheme || null,
      newPayScheme: item.newPayScheme || null,
      comments: item.comments,
      createdById: item.createdById,
      createdAt: item.createdAt.toISOString()
    }))
  });
}
