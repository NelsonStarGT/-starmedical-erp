import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const [engagement] = await prisma.employeeEngagement.findMany({
    where: { employeeId: resolvedParams.id, isPrimary: true },
    take: 1
  });
  const bonuses = await prisma.compensationBonus.findMany({
    where: { employeeId: resolvedParams.id, isActive: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    data: {
      baseSalary: engagement?.baseSalary?.toString() || engagement?.compensationAmount?.toString() || null,
      baseAllowance: engagement?.baseAllowance?.toString() || null,
      employmentType: engagement?.employmentType || null,
      legalEntityId: engagement?.legalEntityId || null,
      paymentScheme: engagement?.paymentScheme || null,
      bonuses: bonuses.map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount.toString(),
        isActive: b.isActive,
        createdAt: b.createdAt.toISOString()
      }))
    }
  });
}
