import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { buildPendingEmployeesWhere } from "@/lib/hr/filters";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;

function parseSearchParams(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || DEFAULT_PAGE_SIZE);
  return {
    search: params.get("search") || undefined,
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, 50)
  };
}

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const { search, page, pageSize } = parseSearchParams(req);
  const excludeTerminatedParam = req.nextUrl.searchParams.get("excludeTerminated");
  const excludeTerminated = excludeTerminatedParam === "1" || excludeTerminatedParam === "true";
  const where: Prisma.HrEmployeeWhereInput = buildPendingEmployeesWhere({
    sessionUser: auth.user,
    excludeTerminated
  });

  if (search) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { employeeCode: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { dpi: { contains: term, mode: "insensitive" } },
      { biometricId: { contains: term, mode: "insensitive" } },
      { phoneMobile: { contains: term, mode: "insensitive" } }
    ];
  }

  const [totalCount, employees] = await prisma.$transaction([
    prisma.hrEmployee.count({ where }),
    prisma.hrEmployee.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        onboardingStep: true,
        status: true,
        updatedAt: true,
        createdAt: true
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return NextResponse.json({
    data: employees.map((emp) => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
      onboardingStatus: emp.onboardingStatus,
      onboardingStep: emp.onboardingStep,
      status: emp.status
    })),
    meta: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      totalCount
    }
  });
}

export const GET = withApiErrorHandling(handler);
