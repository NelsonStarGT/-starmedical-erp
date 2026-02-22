import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const params = req.nextUrl.searchParams;
  const branchId = params.get("branchId") || undefined;
  const search = params.get("search")?.trim();
  const limit = Math.min(50, Math.max(5, Number(params.get("limit") || "15")));

  const where: Prisma.HrEmployeeWhereInput = { status: "ACTIVE" };
  if (branchId) {
    where.branchAssignments = { some: { branchId, isPrimary: true } };
  }
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
      { dpi: { contains: search, mode: "insensitive" } },
      { biometricId: { contains: search, mode: "insensitive" } }
    ];
  }

  const employees = await prisma.hrEmployee.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      employeeCode: true,
      dpi: true,
      biometricId: true,
      firstName: true,
      lastName: true,
      status: true,
      branchAssignments: { where: { isPrimary: true }, select: { branch: { select: { name: true } } } }
    }
  });

  return NextResponse.json({
    ok: true,
    data: {
      total: employees.length,
      items: employees.map((e) => ({
        id: e.id,
        code: e.employeeCode,
        name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        dpi: e.dpi || null,
        biometricId: e.biometricId || null,
        branch: e.branchAssignments?.[0]?.branch?.name || null,
        status: e.status
      }))
    }
  });
}

export const GET = withApiErrorHandling(handler);
