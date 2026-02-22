import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, [], "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const search = req.nextUrl.searchParams.get("search")?.trim() || "";
  const where: Prisma.HrEmployeeWhereInput = { status: "ACTIVE", onboardingStatus: "ACTIVE" };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { dpi: { contains: search, mode: "insensitive" } },
      { biometricId: { contains: search, mode: "insensitive" } }
    ];
  }

  const employees = await prisma.hrEmployee.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      email: true,
      dpi: true,
      biometricId: true,
      branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1, include: { branch: true } }
    }
  });

  return NextResponse.json({
    ok: true,
    data: employees.map((emp) => ({
      id: emp.id,
      name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.employeeCode || emp.dpi || "Empleado",
      code: emp.employeeCode,
      email: emp.email,
      dpi: emp.dpi,
      biometricId: emp.biometricId,
      branchId: emp.branchAssignments?.[0]?.branchId || null,
      branchName: emp.branchAssignments?.[0]?.branch?.name || null
    }))
  });
}
