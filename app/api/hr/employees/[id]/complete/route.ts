import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF"], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const updated = await prisma.hrEmployee.update({
    where: { id: resolvedParams.id },
    data: {
      onboardingStatus: "ACTIVE",
      onboardingStep: 6,
      completedAt: new Date(),
      status: HrEmployeeStatus.ACTIVE,
      isActive: true
    }
  });

  return NextResponse.json({ data: { id: updated.id, onboardingStatus: updated.onboardingStatus, onboardingStep: updated.onboardingStep } });
}
