import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { updateEmployeeSchema } from "@/lib/hr/schemas";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, normalizeBranchAssignments, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

async function findEmployee(id: string) {
  return prisma.hrEmployee.findUnique({ where: { id }, include: employeeInclude });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(_req, ["ADMIN", "HR_ADMIN", "HR_USER", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const employee = await findEmployee(params.id);
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  return NextResponse.json({ data: serializeEmployee(employee) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = updateEmployeeSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: params.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const updateData: Prisma.HrEmployeeUpdateInput = {};
    const hireDate = parsed.hireDate !== undefined ? parseDateInput(parsed.hireDate, "Fecha de ingreso", { required: true }) : undefined;
    const terminationDate =
      parsed.terminationDate !== undefined ? parseDateInput(parsed.terminationDate, "Fecha de terminación") : undefined;
    const birthDate = parsed.birthDate !== undefined ? parseDateInput(parsed.birthDate, "Fecha de nacimiento") : undefined;

    if (parsed.employeeCode !== undefined) updateData.employeeCode = parsed.employeeCode.trim();
    if (parsed.firstName !== undefined) updateData.firstName = parsed.firstName.trim();
    if (parsed.lastName !== undefined) updateData.lastName = parsed.lastName.trim();
    if (parsed.dpi !== undefined) updateData.dpi = cleanNullableString(parsed.dpi);
    if (parsed.nit !== undefined) updateData.nit = cleanNullableString(parsed.nit);
    if (parsed.email !== undefined) updateData.email = cleanNullableString(parsed.email);
    if (parsed.phone !== undefined) updateData.phone = cleanNullableString(parsed.phone);
    if (parsed.address !== undefined) updateData.address = cleanNullableString(parsed.address);
    if (parsed.notes !== undefined) updateData.notes = cleanNullableString(parsed.notes);
    if (hireDate !== undefined) updateData.hireDate = hireDate;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (terminationDate !== undefined) updateData.terminationDate = terminationDate;
    if (parsed.employmentType !== undefined) updateData.employmentType = parsed.employmentType;
    if (parsed.status !== undefined) {
      updateData.status = parsed.status;
      if (parsed.status === HrEmployeeStatus.ACTIVE && terminationDate === undefined) {
        updateData.terminationDate = null;
      }
    }

    const primaryBranchId = parsed.primaryBranchId ? parsed.primaryBranchId.trim() : employee.primaryBranchId;
    const positionId = parsed.positionId || employee.positionId;
    const departmentId = parsed.departmentId !== undefined ? parsed.departmentId || null : employee.departmentId;
    const extraAssignments =
      parsed.branchAssignments !== undefined ? normalizeBranchAssignments(parsed.branchAssignments || [], primaryBranchId) : null;

    if (parsed.primaryBranchId || parsed.branchAssignments) {
      const branchIdsToCheck = new Set<string>([primaryBranchId, ...(extraAssignments || []).map((a) => a.branchId)]);
      const branches = await prisma.branch.findMany({ where: { id: { in: Array.from(branchIdsToCheck) } } });
      if (branches.length !== branchIdsToCheck.size) {
        return NextResponse.json({ error: "Sucursal inválida" }, { status: 400 });
      }
    }

    if (parsed.positionId) {
      const position = await prisma.hrPosition.findUnique({ where: { id: parsed.positionId } });
      if (!position) return NextResponse.json({ error: "Puesto inválido" }, { status: 400 });
    }

    if (parsed.departmentId !== undefined && parsed.departmentId !== null) {
      const department = await prisma.hrDepartment.findUnique({ where: { id: parsed.departmentId } });
      if (!department) return NextResponse.json({ error: "Departamento inválido" }, { status: 400 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.hrEmployee.update({
        where: { id: params.id },
        data: {
          ...updateData,
          primaryBranchId,
          positionId,
          departmentId
        }
      });

      await tx.hrEmployeeBranchAssignment.updateMany({
        where: { employeeId: params.id },
        data: { isPrimary: false }
      });

      await tx.hrEmployeeBranchAssignment.upsert({
        where: { employeeId_branchId: { employeeId: params.id, branchId: primaryBranchId } as any },
        update: {
          isPrimary: true,
          startDate: hireDate ?? undefined,
          endDate: terminationDate ?? undefined
        },
        create: {
          employeeId: params.id,
          branchId: primaryBranchId,
          isPrimary: true,
          startDate: hireDate ?? updated.hireDate,
          endDate: terminationDate ?? updated.terminationDate,
          createdById: auth.user?.id || null
        }
      });

      if (extraAssignments !== null) {
        await tx.hrEmployeeBranchAssignment.deleteMany({
          where: { employeeId: params.id, branchId: { not: primaryBranchId } }
        });
        if (extraAssignments.length) {
          await tx.hrEmployeeBranchAssignment.createMany({
            data: extraAssignments.map((a) => ({
              employeeId: params.id,
              branchId: a.branchId,
              isPrimary: false,
              startDate: a.startDate,
              endDate: a.endDate,
              createdById: auth.user?.id || null
            }))
          });
        }
      }

      return tx.hrEmployee.findUnique({ where: { id: params.id }, include: employeeInclude });
    });

    return NextResponse.json({ data: serializeEmployee(saved!) });
  } catch (err: any) {
    console.error("update employee error", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") {
      const target = (err.meta?.target || []) as string[];
      if (target.includes("employeeCode")) return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
      if (target.includes("dpi")) return NextResponse.json({ error: "El DPI ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el empleado" }, { status: 400 });
  }
}
