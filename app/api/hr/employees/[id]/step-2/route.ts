import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { onboardingStep2Schema } from "@/lib/hr/schemas";
import { parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF"], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingStep2Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const startDate = parseDateInput(parsed.data.startDate, "Fecha de inicio", { required: true })!;
  const endDate = parseDateInput(parsed.data.endDate, "Fecha fin");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.employeeBranchAssignment.deleteMany({ where: { employeeId: employee.id } });
    await tx.employeePositionAssignment.deleteMany({ where: { employeeId: employee.id } });
    await tx.employeeEngagement.deleteMany({ where: { employeeId: employee.id } });

    await tx.employeeBranchAssignment.createMany({
      data: parsed.data.branchAssignments.map((assign) => ({
        employeeId: employee.id,
        branchId: assign.branchId,
        code: assign.code || null,
        isPrimary: Boolean(assign.isPrimary),
        startDate,
        endDate,
        createdById: auth.user?.id || null
      }))
    });

    await tx.employeePositionAssignment.createMany({
      data: parsed.data.positionAssignments.map((assign) => ({
        employeeId: employee.id,
        positionId: assign.positionId,
        departmentId: assign.departmentId || null,
        isPrimary: Boolean(assign.isPrimary),
        startDate,
        endDate,
        notes: assign.notes || null,
        createdById: auth.user?.id || null
      }))
    });

    await tx.employeeEngagement.create({
      data: {
        employeeId: employee.id,
        legalEntityId: parsed.data.legalEntityId,
        employmentType: parsed.data.employmentType,
        status: HrEmployeeStatus.ACTIVE,
        startDate,
        endDate,
        isPrimary: true,
        isPayrollEligible: parsed.data.isPayrollEligible,
        paymentScheme: parsed.data.isPayrollEligible ? parsed.data.paymentScheme || "MONTHLY" : "MONTHLY",
        baseSalary: parsed.data.isPayrollEligible && parsed.data.baseSalary !== undefined ? parsed.data.baseSalary : null,
        compensationAmount: parsed.data.isPayrollEligible && parsed.data.baseSalary !== undefined ? parsed.data.baseSalary : null,
        compensationCurrency: "GTQ",
        compensationFrequency: "MONTHLY",
        compensationNotes: null
      }
    });

    const saved = await tx.hrEmployee.update({
      where: { id: employee.id },
      data: {
        onboardingStep: 3,
        onboardingStatus: "DRAFT",
        primaryLegalEntityId: parsed.data.legalEntityId,
        status: HrEmployeeStatus.ACTIVE,
        isActive: false
      }
    });

    return saved;
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      onboardingStatus: updated.onboardingStatus,
      onboardingStep: updated.onboardingStep
    }
  });
}
