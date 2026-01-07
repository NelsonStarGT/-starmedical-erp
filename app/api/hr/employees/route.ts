import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeSchema, employeeFiltersSchema } from "@/lib/hr/schemas";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, normalizeBranchAssignments, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function parseSearchParams(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return employeeFiltersSchema.safeParse({
    search: params.get("search") || undefined,
    status: params.get("status") || undefined,
    branchId: params.get("branchId") || undefined,
    page: params.get("page") || undefined
  });
}

async function generateEmployeeCode(tx: Prisma.TransactionClient) {
  const last = await tx.hrEmployee.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  let nextNumber = 1;
  if (last?.employeeCode) {
    const match = last.employeeCode.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  for (let i = 0; i < 10; i++) {
    const candidate = `EMP-${String(nextNumber + i).padStart(4, "0")}`;
    const exists = await tx.hrEmployee.findUnique({ where: { employeeCode: candidate } });
    if (!exists) return candidate;
  }
  const fallback = `EMP-${Date.now()}`;
  return fallback;
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = parseSearchParams(req);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { search, status, branchId, page } = parsed.data;
  const where: Prisma.HrEmployeeWhereInput = { isActive: true };
  if (status) where.status = status;
  if (search) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { employeeCode: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { dpi: { contains: term, mode: "insensitive" } },
      { nit: { contains: term, mode: "insensitive" } }
    ];
  }
  if (branchId) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [{ primaryBranchId: branchId }, { branchAssignments: { some: { branchId } } }]
      }
    ];
  }

  const [total, employees] = await prisma.$transaction([
    prisma.hrEmployee.count({ where }),
    prisma.hrEmployee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: employeeInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  return NextResponse.json({
    data: employees.map(serializeEmployee),
    meta: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = createEmployeeSchema.parse(body);

    const hireDate = parseDateInput(parsed.hireDate, "Fecha de ingreso", { required: true })!;
    const birthDate = parseDateInput(parsed.birthDate, "Fecha de nacimiento");
    const terminationDate = parseDateInput(parsed.terminationDate, "Fecha de terminación");
    const status = parsed.status || HrEmployeeStatus.ACTIVE;
    const primaryBranchId = parsed.primaryBranchId.trim();
    const extraAssignments = normalizeBranchAssignments(parsed.branchAssignments || [], primaryBranchId);

    const branchIdsToCheck = new Set<string>([primaryBranchId, ...extraAssignments.map((a) => a.branchId)]);
    const branches = await prisma.branch.findMany({ where: { id: { in: Array.from(branchIdsToCheck) } } });
    if (branches.length !== branchIdsToCheck.size) {
      return NextResponse.json({ error: "Sucursal inválida" }, { status: 400 });
    }

    const position = await prisma.hrPosition.findUnique({ where: { id: parsed.positionId } });
    if (!position) return NextResponse.json({ error: "Puesto inválido" }, { status: 400 });

    if (parsed.departmentId) {
      const department = await prisma.hrDepartment.findUnique({ where: { id: parsed.departmentId } });
      if (!department) return NextResponse.json({ error: "Departamento inválido" }, { status: 400 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      const employeeCode = parsed.employeeCode?.trim() || (await generateEmployeeCode(tx));
      const employee = await tx.hrEmployee.create({
        data: {
          employeeCode,
          firstName: parsed.firstName.trim(),
          lastName: parsed.lastName.trim(),
          dpi: cleanNullableString(parsed.dpi),
          nit: cleanNullableString(parsed.nit),
          email: cleanNullableString(parsed.email),
          phone: cleanNullableString(parsed.phone),
          birthDate,
          address: cleanNullableString(parsed.address),
          hireDate,
          terminationDate,
          employmentType: parsed.employmentType,
          status,
          primaryBranchId,
          departmentId: parsed.departmentId || null,
          positionId: parsed.positionId,
          notes: cleanNullableString(parsed.notes),
          isActive: true,
          createdById: auth.user?.id || null
        }
      });

      await tx.hrEmployeeBranchAssignment.create({
        data: {
          employeeId: employee.id,
          branchId: primaryBranchId,
          isPrimary: true,
          startDate: hireDate,
          createdById: auth.user?.id || null
        }
      });

      if (extraAssignments.length) {
        await tx.hrEmployeeBranchAssignment.createMany({
          data: extraAssignments.map((a) => ({
            employeeId: employee.id,
            branchId: a.branchId,
            isPrimary: false,
            startDate: a.startDate,
            endDate: a.endDate,
            createdById: auth.user?.id || null
          }))
        });
      }

      return tx.hrEmployee.findUnique({ where: { id: employee.id }, include: employeeInclude });
    });

    return NextResponse.json({ data: serializeEmployee(saved!) }, { status: 201 });
  } catch (err: any) {
    console.error("create employee error", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") {
      const target = (err.meta?.target || []) as string[];
      if (target.includes("employeeCode")) return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
      if (target.includes("dpi")) return NextResponse.json({ error: "El DPI ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "No se pudo crear el empleado" }, { status: 400 });
  }
}
