import { z } from "zod";
import { HR_EMPLOYEE_DOCUMENT_TYPES, HR_EMPLOYEE_STATUSES, HR_EMPLOYMENT_TYPES, PAY_FREQUENCIES } from "@/types/hr";

const optionalString = z.string().trim().optional();
const optionalNullableString = z.string().trim().optional().nullable();
const dateString = z.string().trim();

export const branchAssignmentSchema = z.object({
  id: optionalString,
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  isPrimary: z.boolean().optional(),
  startDate: optionalNullableString,
  endDate: optionalNullableString
});

export const positionAssignmentSchema = z.object({
  id: optionalString,
  positionId: z.string().trim().min(1, "Puesto requerido"),
  departmentId: optionalNullableString,
  isPrimary: z.boolean().optional(),
  startDate: optionalNullableString,
  endDate: optionalNullableString,
  notes: optionalNullableString
});

export const engagementSchema = z.object({
  id: optionalString,
  legalEntityId: z.string().trim().min(1, "Razón social requerida"),
  employmentType: z.enum(HR_EMPLOYMENT_TYPES),
  status: z.enum(HR_EMPLOYEE_STATUSES).default("ACTIVE"),
  startDate: dateString.min(1, "Fecha de inicio requerida"),
  endDate: optionalNullableString,
  isPrimary: z.boolean().optional(),
  isPayrollEligible: z.boolean().optional(),
  compensationAmount: z.coerce.number().nonnegative().optional(),
  compensationCurrency: z.string().trim().optional(),
  compensationFrequency: z.enum(PAY_FREQUENCIES).optional(),
  compensationNotes: optionalNullableString
});

export const employeeDocumentVersionSchema = z.object({
  versionNumber: z.coerce.number().int().positive().default(1),
  fileUrl: z.string().trim().min(1, "Archivo requerido"),
  issuedAt: optionalNullableString,
  deliveredAt: optionalNullableString,
  expiresAt: optionalNullableString,
  notes: optionalNullableString
});

export const createEmployeeDocumentSchema = z.object({
  id: optionalString,
  type: z.enum(HR_EMPLOYEE_DOCUMENT_TYPES),
  title: z.string().trim().min(1, "Título requerido"),
  notes: optionalNullableString,
  retentionUntil: optionalNullableString,
  version: employeeDocumentVersionSchema
});

export const professionalLicenseSchema = z.object({
  applies: z.boolean().optional(),
  number: optionalNullableString,
  issuedAt: optionalNullableString,
  expiresAt: optionalNullableString,
  issuingEntity: optionalNullableString,
  fileUrl: optionalNullableString,
  reminderDays: z.coerce.number().int().positive().optional().nullable(),
  notes: optionalNullableString
});

export const createEmployeeSchema = z.object({
  employeeCode: optionalString,
  firstName: z.string().trim().min(1, "Nombre requerido"),
  lastName: z.string().trim().min(1, "Apellido requerido"),
  dpi: z.string().trim().min(6, "DPI requerido"),
  nit: optionalNullableString,
  email: optionalNullableString.refine((val) => !val || /\S+@\S+\.\S+/.test(val), "Correo inválido"),
  personalEmail: optionalNullableString.refine((val) => !val || /\S+@\S+\.\S+/.test(val), "Correo inválido"),
  phone: optionalNullableString,
  homePhone: z.string().trim().min(4, "Teléfono casa requerido"),
  birthDate: optionalNullableString,
  address: z.string().trim().min(1, "Dirección requerida"),
  emergencyContactName: z.string().trim().min(1, "Contacto de emergencia requerido"),
  emergencyContactPhone: z.string().trim().min(4, "Teléfono de emergencia requerido"),
  residenceProofUrl: z.string().trim().min(1, "Comprobante de vivienda requerido"),
  dpiPhotoUrl: z.string().trim().min(1, "Foto DPI requerida"),
  rtuFileUrl: z.string().trim().min(1, "RTU requerido"),
  photoUrl: optionalNullableString,
  status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
  primaryLegalEntityId: optionalNullableString,
  engagements: z.array(engagementSchema).min(1, "Al menos una relación laboral"),
  branchAssignments: z.array(branchAssignmentSchema).min(1, "Al menos una sucursal"),
  positionAssignments: z.array(positionAssignmentSchema).min(1, "Al menos un puesto"),
  documents: z.array(createEmployeeDocumentSchema).optional(),
  professionalLicense: professionalLicenseSchema.optional()
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeFiltersSchema = z.object({
  search: optionalString,
  status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
  branchId: optionalString,
  legalEntityId: optionalString,
  page: z.coerce.number().int().min(1).default(1)
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
