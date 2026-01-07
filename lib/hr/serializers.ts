import { Prisma } from "@prisma/client";

export const employeeInclude = {
  primaryBranch: true,
  department: true,
  position: true,
  branchAssignments: { include: { branch: true } },
  documents: { where: { isActive: true }, orderBy: { createdAt: "desc" } }
} satisfies Prisma.HrEmployeeInclude;

export type EmployeeWithRelations = Prisma.HrEmployeeGetPayload<{ include: typeof employeeInclude }>;

export function serializeEmployee(employee: EmployeeWithRelations) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    dpi: employee.dpi,
    nit: employee.nit,
    email: employee.email,
    phone: employee.phone,
    birthDate: employee.birthDate,
    address: employee.address,
    hireDate: employee.hireDate,
    terminationDate: employee.terminationDate,
    employmentType: employee.employmentType,
    status: employee.status,
    primaryBranch: employee.primaryBranch ? { id: employee.primaryBranch.id, name: employee.primaryBranch.name } : null,
    department: employee.department ? { id: employee.department.id, name: employee.department.name } : null,
    position: employee.position ? { id: employee.position.id, name: employee.position.name } : null,
    notes: employee.notes,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    branchAssignments: (employee.branchAssignments || []).map((assign) => ({
      id: assign.id,
      branchId: assign.branchId,
      isPrimary: assign.isPrimary,
      startDate: assign.startDate,
      endDate: assign.endDate,
      branch: assign.branch ? { id: assign.branch.id, name: assign.branch.name } : null
    })),
    documents: (employee.documents || []).map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      fileUrl: doc.fileUrl,
      issuedAt: doc.issuedAt,
      expiresAt: doc.expiresAt,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isActive: doc.isActive
    }))
  };
}
