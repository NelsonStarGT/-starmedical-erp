import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { archivedEmployeeFiltersSchema } from "@/lib/hr/schemas";
import { buildArchivedEmployeesWhere } from "@/lib/hr/filters";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

function parseSearchParams(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return archivedEmployeeFiltersSchema.safeParse({
    search: params.get("search") || undefined,
    branchId: params.get("branchId") || undefined,
    type: params.get("type") || undefined,
    relationship: params.get("relationship") || undefined,
    year: params.get("year") || undefined,
    month: params.get("month") || undefined,
    page: params.get("page") || undefined
  });
}

async function handler(req: NextRequest) {
  const auth = requireHrPermission(req, "HR:EMPLOYEES:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = parseSearchParams(req);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  const { search, branchId, type, relationship, year, month, page } = parsed.data;
  const where: Prisma.HrEmployeeWhereInput = buildArchivedEmployeesWhere({ sessionUser: auth.user, year, month });

  if (search) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { employeeCode: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { dpi: { contains: term, mode: "insensitive" } },
      { biometricId: { contains: term, mode: "insensitive" } }
    ];
  }

  if (branchId) {
    const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...andClauses,
      {
        branchAssignments: { some: { branchId } }
      }
    ];
  }
  if (type === "INTERNAL") {
    where.isExternal = false;
  } else if (type === "EXTERNAL") {
    where.isExternal = true;
  }
  if (relationship === "DEPENDENCIA") {
    where.engagements = { some: { employmentType: "DEPENDENCIA" } };
  } else if (relationship === "SIN_DEPENDENCIA") {
    where.engagements = { some: { employmentType: "HONORARIOS" } };
  }

  const [total, employees] = await prisma.$transaction([
    prisma.hrEmployee.count({ where }),
    prisma.hrEmployee.findMany({
      where,
      orderBy: [{ archivedAt: "desc" }, { terminatedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        branchAssignments: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1, include: { branch: true } },
        engagements: { where: { isPrimary: true }, orderBy: { startDate: "desc" }, take: 1 }
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  return NextResponse.json({
    data: employees.map((emp) => ({
      id: emp.id,
      fullName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeCode || "Colaborador",
      employeeCode: emp.employeeCode,
      status: emp.status,
      terminatedAt: emp.terminatedAt,
      archivedAt: emp.archivedAt,
      completedAt: emp.completedAt,
      branchName: emp.branchAssignments?.[0]?.branch?.name || null,
      employmentType: emp.engagements?.[0]?.employmentType || null,
      isExternal: emp.isExternal
    })),
    meta: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    }
  });
}

export const GET = withApiErrorHandling(handler);
