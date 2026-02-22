import { z } from "zod";

export const membershipOwnerTypeSchema = z.enum(["PERSON", "COMPANY"]);
export const membershipStatusSchema = z.enum(["ACTIVO", "PENDIENTE", "SUSPENDIDO", "VENCIDO", "CANCELADO"]);
export const membershipPlanTypeSchema = z.enum(["INDIVIDUAL", "FAMILIAR", "EMPRESARIAL"]);
export const membershipPlanSegmentSchema = z.enum(["B2C", "B2B"]);
export const membershipBillingFrequencySchema = z.enum(["MONTHLY", "ANNUAL", "SEMIANNUAL", "QUARTERLY"]);
export const membershipPaymentMethodSchema = z.enum(["CASH", "TRANSFER", "CARD"]);
export const membershipPaymentKindSchema = z.enum(["INITIAL", "RENEWAL", "EXTRA"]);
export const membershipPaymentStatusSchema = z.enum(["PAID", "PENDING", "FAILED"]);

export const listPlansQuerySchema = z.object({
  active: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional(),
  segment: membershipPlanSegmentSchema.optional(),
  type: membershipPlanTypeSchema.optional()
});

export const createPlanSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido")
    .optional(),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1200).optional().nullable(),
  type: membershipPlanTypeSchema.optional(),
  segment: membershipPlanSegmentSchema,
  categoryId: z.string().trim().min(1).max(64).optional().nullable(),
  imageUrl: z.string().trim().url().max(2048).optional().nullable(),
  active: z.boolean().optional(),
  priceMonthly: z.coerce.number().positive(),
  priceAnnual: z.coerce.number().positive(),
  currency: z.string().trim().toUpperCase().min(3).max(8).default("GTQ"),
  maxDependents: z.coerce.number().int().min(0).max(999).optional().nullable()
});

export const updatePlanSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug inválido")
      .optional(),
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(1200).optional().nullable(),
    type: membershipPlanTypeSchema.optional(),
    segment: membershipPlanSegmentSchema.optional(),
    categoryId: z.string().trim().min(1).max(64).optional().nullable(),
    imageUrl: z.string().trim().url().max(2048).optional().nullable(),
    active: z.boolean().optional(),
    priceMonthly: z.coerce.number().positive().optional(),
    priceAnnual: z.coerce.number().positive().optional(),
    currency: z.string().trim().toUpperCase().min(3).max(8).optional(),
    maxDependents: z.coerce.number().int().min(0).max(999).optional().nullable()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Sin cambios"
  });

export const createPlanCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  segment: membershipPlanSegmentSchema,
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional()
});

export const updatePlanCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    segment: membershipPlanSegmentSchema.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Sin cambios"
  });

export const updateStatusSchema = z.object({
  status: z.union([z.string().trim().min(1), z.boolean()]),
  reason: z.string().trim().max(300).optional().nullable()
});

export const listContractsQuerySchema = z.object({
  ownerType: membershipOwnerTypeSchema.optional(),
  status: membershipStatusSchema.optional(),
  ownerId: z.string().trim().min(1).optional(),
  planId: z.string().trim().min(1).optional(),
  segment: membershipPlanSegmentSchema.optional(),
  q: z.string().trim().min(1).max(120).optional(),
  renewWindowDays: z.coerce.number().int().min(1).max(90).optional(),
  renewFrom: z.coerce.date().optional(),
  renewTo: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

export const createContractSchema = z.object({
  ownerType: membershipOwnerTypeSchema,
  ownerId: z.string().trim().min(1),
  planId: z.string().trim().min(1),
  status: membershipStatusSchema.optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  nextRenewAt: z.coerce.date().optional().nullable(),
  billingFrequency: membershipBillingFrequencySchema.default("MONTHLY"),
  priceLockedMonthly: z.coerce.number().nonnegative().optional().nullable(),
  priceLockedAnnual: z.coerce.number().nonnegative().optional().nullable(),
  channel: z.string().trim().max(80).optional().nullable(),
  assignedBranchId: z.string().trim().min(1).optional().nullable(),
  allowDependents: z.boolean().optional(),
  lastInvoiceId: z.string().trim().min(1).optional().nullable()
});

export const updateContractSchema = z
  .object({
    planId: z.string().trim().min(1).optional(),
    status: membershipStatusSchema.optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional().nullable(),
    nextRenewAt: z.coerce.date().optional().nullable(),
    billingFrequency: membershipBillingFrequencySchema.optional(),
    priceLockedMonthly: z.coerce.number().nonnegative().optional().nullable(),
    priceLockedAnnual: z.coerce.number().nonnegative().optional().nullable(),
    channel: z.string().trim().max(80).optional().nullable(),
    assignedBranchId: z.string().trim().min(1).optional().nullable(),
    allowDependents: z.boolean().optional(),
    lastInvoiceId: z.string().trim().min(1).optional().nullable()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Sin cambios"
  });

export const updateContractStatusSchema = z.object({
  status: membershipStatusSchema,
  notes: z.string().trim().max(500).optional().nullable()
});

export const registerPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: membershipPaymentMethodSchema,
  kind: membershipPaymentKindSchema.default("RENEWAL"),
  status: membershipPaymentStatusSchema.default("PAID"),
  paidAt: z.coerce.date().optional(),
  refNo: z.string().trim().max(120).optional().nullable(),
  invoiceId: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export const listPlanCategoriesQuerySchema = z.object({
  segment: membershipPlanSegmentSchema.optional(),
  includeInactive: z
    .union([z.literal("true"), z.literal("false")])
    .transform((value) => value === "true")
    .optional()
});

export const membershipConfigSchema = z.object({
  reminderDays: z.coerce.number().int().min(1).max(180),
  graceDays: z.coerce.number().int().min(0).max(60),
  inactiveAfterDays: z.coerce.number().int().min(1).max(365),
  autoRenewWithPayment: z.boolean(),
  prorateOnMidmonth: z.boolean(),
  blockIfBalanceDue: z.boolean(),
  requireInitialPayment: z.boolean(),
  cashTransferMinMonths: z.coerce.number().int().min(0).max(24),
  priceChangeNoticeDays: z.coerce.number().int().min(0).max(180)
});

export const publicSubscribeSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  planId: z.string().trim().min(1),
  segment: membershipPlanSegmentSchema,
  categoryId: z.string().trim().min(1).optional().nullable(),
  channel: z.literal("WEB").default("WEB"),
  customer: z.object({
    type: membershipOwnerTypeSchema,
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    companyName: z.string().trim().min(2).max(180).optional(),
    dpi: z.string().trim().min(6).max(20).optional(),
    nit: z.string().trim().min(4).max(20).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(8).max(20).optional(),
    address: z.string().trim().max(240).optional()
  })
});
