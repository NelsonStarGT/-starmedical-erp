import { z } from "zod";
import {
  HR_DOCUMENT_VISIBILITY,
  HR_EMPLOYEE_DOCUMENT_TYPES,
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  HR_PAYMENT_SCHEMES,
  PAY_FREQUENCIES
} from "../../types/hr";

const optionalString = z.string().trim().optional();
const optionalNullableString = z.string().trim().optional().nullable();
const dateString = z.string().trim();
const optionalNumber = z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().nonnegative().optional());

export const branchAssignmentSchema = z.object({
  id: optionalString,
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  code: optionalNullableString,
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
  paymentScheme: z.enum(HR_PAYMENT_SCHEMES).optional(),
  baseSalary: z.coerce.number().nonnegative().optional(),
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
  canEmployeeView: z.boolean().optional(),
  viewGrantedUntil: optionalNullableString,
  notes: optionalNullableString
});

export const createEmployeeDocumentSchema = z.object({
  id: optionalString,
  type: z.enum(HR_EMPLOYEE_DOCUMENT_TYPES),
  title: z.string().trim().min(1, "Título requerido"),
  visibility: z.enum(HR_DOCUMENT_VISIBILITY).default("PERSONAL"),
  notes: optionalNullableString,
  retentionUntil: optionalNullableString,
  version: employeeDocumentVersionSchema
});

export const professionalLicenseSchema = z.object({
  applies: z.boolean().optional(),
  licenseNumber: optionalNullableString,
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
  phoneMobile: optionalNullableString,
  phoneHome: z.string().trim().min(4, "Teléfono casa requerido"),
  birthDate: optionalNullableString,
  addressHome: z.string().trim().min(1, "Dirección requerida"),
  notes: optionalNullableString,
  isExternal: z.boolean().optional(),
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

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  onboardingStatus: z.enum(["DRAFT", "IN_REVIEW", "ACTIVE"]).optional(),
  onboardingStep: z.coerce.number().int().min(1).optional(),
  completedAt: optionalNullableString
});

export const employeeFiltersSchema = z.object({
  search: optionalString,
  status: z.enum(HR_EMPLOYEE_STATUSES).optional(),
  branchId: optionalString,
  legalEntityId: optionalString,
  type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  relationship: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"]).optional(),
  page: z.coerce.number().int().min(1).default(1)
});

export const archivedEmployeeFiltersSchema = z.object({
  search: optionalString,
  branchId: optionalString,
  type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  relationship: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().min(1).default(1)
});

export const onboardingDraftSchema = z
  .object({
    firstName: optionalNullableString,
    lastName: optionalNullableString,
    dpi: optionalNullableString
  })
  .partial();

export const onboardingStep1Schema = z.object({
  firstName: z.string().trim().min(1, "Nombre requerido"),
  lastName: z.string().trim().min(1, "Apellido requerido"),
  dpi: z.string().trim().min(6, "DPI requerido"),
  nit: optionalNullableString,
  email: optionalNullableString.refine((val) => !val || /\S+@\S+\.\S+/.test(val), "Correo inválido"),
  personalEmail: optionalNullableString.refine((val) => !val || /\S+@\S+\.\S+/.test(val), "Correo inválido"),
  phoneMobile: optionalNullableString,
  phoneHome: z.string().trim().min(4, "Teléfono casa requerido"),
  birthDate: optionalNullableString,
  addressHome: z.string().trim().min(1, "Dirección requerida"),
  notes: optionalNullableString,
  isExternal: z.boolean().optional(),
  emergencyContactName: z.string().trim().min(1, "Contacto de emergencia requerido"),
  emergencyContactPhone: z.string().trim().min(4, "Teléfono de emergencia requerido"),
  residenceProofUrl: z.string().trim().min(1, "Comprobante de vivienda requerido"),
  dpiPhotoUrl: z.string().trim().min(1, "Foto DPI requerida"),
  rtuFileUrl: z.string().trim().min(1, "RTU requerido"),
  photoUrl: optionalNullableString
});

export const onboardingStep2Schema = z
  .object({
    legalEntityId: z.string().trim().min(1, "Razón social requerida"),
    employmentType: z.enum(HR_EMPLOYMENT_TYPES),
    isPayrollEligible: z.boolean().default(true),
    paymentScheme: z.enum(HR_PAYMENT_SCHEMES).optional(),
    baseSalary: z.coerce.number().nonnegative().optional(),
    branchAssignments: z.array(branchAssignmentSchema).min(1, "Al menos una sucursal"),
    positionAssignments: z.array(positionAssignmentSchema).min(1, "Al menos un puesto"),
    startDate: optionalNullableString,
    endDate: optionalNullableString
  })
  .superRefine((value, ctx) => {
    const hasPrimaryBranch = value.branchAssignments.some((b) => b.isPrimary);
    const hasPrimaryPosition = value.positionAssignments.some((p) => p.isPrimary);
    if (!hasPrimaryBranch) {
      ctx.addIssue({ code: "custom", message: "Sucursal principal requerida", path: ["branchAssignments"] });
    }
    if (!hasPrimaryPosition) {
      ctx.addIssue({ code: "custom", message: "Puesto principal requerido", path: ["positionAssignments"] });
    }
    if (value.isPayrollEligible && (!value.paymentScheme || value.baseSalary === undefined)) {
      ctx.addIssue({ code: "custom", message: "paymentScheme y baseSalary requeridos para nómina", path: ["paymentScheme"] });
    }
  });

export const onboardingStep3Schema = z.object({
  documents: z.array(createEmployeeDocumentSchema).optional(),
  professionalLicense: professionalLicenseSchema.optional(),
  user: z
    .object({
      mode: z.enum(["none", "link", "create"]).default("none"),
      userId: optionalNullableString,
      email: optionalNullableString,
      name: optionalNullableString,
      password: optionalNullableString,
      roleName: optionalNullableString
    })
    .optional()
}).superRefine((value, ctx) => {
  const license = value.professionalLicense;
  if (license?.applies) {
    if (!license.licenseNumber) ctx.addIssue({ code: "custom", message: "Colegiado requiere número", path: ["professionalLicense", "licenseNumber"] });
    if (!license.issuedAt) ctx.addIssue({ code: "custom", message: "Fecha de emisión requerida", path: ["professionalLicense", "issuedAt"] });
    if (!license.expiresAt) ctx.addIssue({ code: "custom", message: "Fecha de vencimiento requerida", path: ["professionalLicense", "expiresAt"] });
  }

  const user = value.user;
  if (user) {
    if (user.mode === "link" && !user.email && !user.userId) {
      ctx.addIssue({ code: "custom", message: "Correo o usuario requerido para vincular", path: ["user", "email"] });
    }
    if (user.mode === "create") {
      if (!user.email) ctx.addIssue({ code: "custom", message: "Correo requerido", path: ["user", "email"] });
      if (!user.password || user.password.length < 8) {
        ctx.addIssue({ code: "custom", message: "Password mínimo 8 caracteres", path: ["user", "password"] });
      }
    }
  }
});

export const employeeDraftSchema = z.object({
  firstName: optionalNullableString,
  lastName: optionalNullableString,
  dpi: optionalNullableString
});

export const wizardStep1Schema = z.object({
  firstName: z.string().trim().min(1, "Nombre requerido"),
  lastName: z.string().trim().min(1, "Apellido requerido"),
  dpi: optionalNullableString.refine((val) => !val || val.trim().length >= 6, "DPI inválido")
});

export const wizardStep2Schema = z.object({
  phoneMobile: z.string().trim().min(4, "Teléfono requerido"),
  addressHome: z.string().trim().min(3, "Dirección requerida")
});

export const wizardStep3Schema = z.object({
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  legalEntityId: optionalNullableString
});

export const wizardStep4Schema = z.object({
  professionalType: z.enum(["INTERNAL", "EXTERNAL"]),
  employmentRelation: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"])
});

export const wizardStep5Schema = z.object({
  payScheme: z.enum(HR_PAYMENT_SCHEMES).optional(),
  baseSalary: optionalNumber,
  baseAllowance: optionalNumber
});

export const compensationUpdateSchema = z.object({
  baseSalary: optionalNumber,
  baseAllowance: optionalNumber,
  payScheme: z.enum(HR_PAYMENT_SCHEMES).optional(),
  comments: optionalNullableString
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

export const quickEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(1, "Nombre requerido"),
    lastName: z.string().trim().min(1, "Apellido requerido"),
    phone: z.string().trim().min(4, "Teléfono requerido"),
    address: z.string().trim().min(1, "Dirección requerida"),
    branchId: z.string().trim().min(1, "Sucursal requerida"),
    workLocation: z.string().trim().min(1, "Ubicación requerida"),
    isProfessionalInternal: z.enum(["INTERNAL", "EXTERNAL"]),
    relationshipType: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"]),
    baseSalary: z.coerce.number().nonnegative().optional(),
    bonuses: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Nombre de bono requerido"),
          amount: z.coerce.number().nonnegative()
        })
      )
      .optional()
  })
  .superRefine((value, ctx) => {
    if (value.relationshipType === "DEPENDENCIA" && (value.baseSalary === undefined || Number.isNaN(value.baseSalary))) {
      ctx.addIssue({ code: "custom", message: "Salario base requerido", path: ["baseSalary"] });
    }
  });

export const updateBasicEmployeeSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(4).optional(),
  address: z.string().trim().min(1).optional(),
  workLocation: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
  relationshipType: z.enum(["DEPENDENCIA", "SIN_DEPENDENCIA"]).optional(),
  isProfessionalInternal: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  baseSalary: z.coerce.number().nonnegative().optional()
});

export const transferSchema = z.object({
  branchId: z.string().trim().min(1, "Sucursal requerida"),
  workLocation: z.string().trim().min(1, "Ubicación requerida"),
  startDate: optionalNullableString,
  comments: optionalNullableString
});

const warningAttachmentSchema = z.object({
  fileUrl: z.string().trim().min(1, "Archivo requerido"),
  fileName: z.string().trim().min(1, "Nombre del archivo requerido").optional(),
  mime: z.string().trim().optional()
});

export const warningSchema = z.object({
  title: z.string().trim().min(2, "Título requerido"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  issuedAt: optionalNullableString,
  cooldownDays: z.coerce.number().int().nonnegative().optional(),
  attachments: warningAttachmentSchema.array().optional()
});

export const suspendSchema = z.object({
  title: z.string().trim().min(2, "Motivo requerido"),
  startDate: z.string().trim().min(1, "Fecha inicio requerida"),
  endDate: optionalNullableString,
  notes: optionalNullableString
});

export const terminateSchema = z.object({
  reason: z.enum(["RENUNCIA", "ABANDONO", "DESPIDO"]),
  effectiveDate: z.string().trim().min(1, "Fecha requerida"),
  notes: optionalNullableString,
  attachment: z.object({
    fileUrl: z.string().trim().min(1, "Archivo requerido"),
    fileName: z.string().trim().min(1, "Nombre requerido"),
    mime: z.string().trim().optional(),
    size: z.coerce.number().nonnegative().optional()
  })
});

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido"),
  code: z.string().trim().min(2, "Código requerido"),
  address: z.string().trim().min(4, "Dirección requerida"),
  isActive: z.boolean().optional()
});

export const hrSettingsSchema = z.object({
  currencyCode: z.enum(["GTQ", "USD"]).default("GTQ"),
  warningWindowDays: z.coerce.number().int().min(1).optional(),
  warningThreshold: z.coerce.number().int().min(1).optional(),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  logoFileKey: optionalNullableString,
  attendanceEmailEnabled: z.boolean().optional(),
  attendanceAdminRecipients: z.array(z.string().trim().email()).optional(),
  photoSafetyEnabled: z.boolean().optional(),
  openaiEnabled: z.boolean().optional(),
  openaiApiKey: optionalNullableString,
  defaultTimezone: optionalNullableString,
  attendanceStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  attendanceLateToleranceMinutes: z.coerce.number().int().min(0).max(180).optional()
});

export const disciplinaryActionSchema = z.object({
  type: z.enum(["AMONESTACION", "SUSPENSION", "TERMINACION_RECOMENDADA"]),
  reason: z.string().trim().min(2, "Motivo requerido"),
  startDate: optionalNullableString,
  endDate: optionalNullableString,
  comments: optionalNullableString,
  attachments: warningAttachmentSchema.array().optional()
});
