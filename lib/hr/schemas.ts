import { z } from "zod";
import { HR_EMPLOYEE_DOCUMENT_TYPES, HR_EMPLOYEE_STATUSES, HR_EMPLOYMENT_TYPES } from "@/types/hr";

const optionalString = z.string().trim().optional();
const optionalNullableString = z.string().trim().optional().nullable();
const dateString = z.string().trim();

export const branchAssignmentSchema = z.object({
  branchId: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
  startDate: optionalNullableString,
  endDate: optionalNullableString
});

export const createEmployeeSchema = z.object({
  employeeCode: optionalString,
  firstName: z.string().trim().min(1, "Nombre requerido"),
  lastName: z.string().trim().min(1, "Apellido requerido"),
  dpi: optionalNullableString,
  nit: optionalNullableString,
  email: optionalNullableString.refine((val) => !val || /\S+@\S+\.\S+/.test(val), "Correo inválido"),
  phone: optionalNullableString,
  birthDate: optionalNullableString,
  address: optionalNullableString,
  hireDate: dateString.min(1, "Fecha de ingreso requerida"),
  terminationDate: optionalNullableString,
  employmentType: z.enum(HR_EMPLOYMENT_TYPES),
  status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
  primaryBranchId: z.string().trim().min(1, "Sucursal requerida"),
  departmentId: optionalNullableString,
  positionId: z.string().trim().min(1, "Puesto requerido"),
  notes: optionalNullableString,
  branchAssignments: z.array(branchAssignmentSchema).optional()
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeFiltersSchema = z.object({
  search: optionalString,
  status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
  branchId: optionalString,
  page: z.coerce.number().int().min(1).default(1)
});

export const createEmployeeDocumentSchema = z.object({
  type: z.enum(HR_EMPLOYEE_DOCUMENT_TYPES),
  title: z.string().trim().min(1, "Título requerido"),
  fileUrl: z.string().trim().min(1, "Archivo requerido"),
  issuedAt: optionalNullableString,
  expiresAt: optionalNullableString,
  notes: optionalNullableString
});

export const upsertDepartmentSchema = z.object({
  id: optionalString,
  name: z.string().trim().min(1, "Nombre requerido"),
  description: optionalNullableString,
  isActive: z.boolean().optional()
});

export const upsertPositionSchema = z.object({
  id: optionalString,
  name: z.string().trim().min(1, "Nombre requerido"),
  description: optionalNullableString,
  isActive: z.boolean().optional()
});
