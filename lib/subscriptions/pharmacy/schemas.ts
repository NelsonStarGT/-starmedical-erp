import { z } from "zod";

export const pharmacySubscriptionStatusSchema = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);
export const pharmacyRegimenFrequencySchema = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM_DAYS"]);
export const pharmacyDeliveryMethodSchema = z.enum(["PICKUP", "DELIVERY"]);
export const pharmacyContactPreferenceSchema = z.enum(["CALL", "WHATSAPP", "EMAIL"]);
export const pharmacyReminderEventTypeSchema = z.enum(["PREPARED", "CONTACTED", "DELIVERED", "PICKUP_READY", "BILLING_LINK"]);

export const listMedicationSubscriptionsQuerySchema = z.object({
  status: pharmacySubscriptionStatusSchema.optional(),
  patientId: z.string().trim().min(1).max(120).optional(),
  branchId: z.string().trim().min(1).max(64).optional(),
  dueInDays: z.coerce.number().int().min(0).max(90).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

export const medicationSubscriptionItemInputSchema = z.object({
  medicationId: z.string().trim().min(1).max(120),
  qty: z.coerce.number().positive().max(9999).default(1),
  instructions: z.string().trim().max(500).optional().nullable()
});

export const createMedicationSubscriptionSchema = z
  .object({
    patientId: z.string().trim().min(1).max(120),
    branchId: z.string().trim().min(1).max(64).optional().nullable(),
    frequency: pharmacyRegimenFrequencySchema,
    customDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
    nextFillAt: z.coerce.date(),
    deliveryMethod: pharmacyDeliveryMethodSchema.default("PICKUP"),
    contactPreference: pharmacyContactPreferenceSchema.default("WHATSAPP"),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z.array(medicationSubscriptionItemInputSchema).min(1).max(100)
  })
  .superRefine((payload, ctx) => {
    if (payload.frequency === "CUSTOM_DAYS" && (!payload.customDays || payload.customDays < 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customDays"], message: "customDays es requerido para frecuencia custom" });
    }
  });

export const updateMedicationSubscriptionStatusSchema = z.object({
  status: pharmacySubscriptionStatusSchema,
  notes: z.string().trim().max(500).optional().nullable()
});

export const createMedicationEventSchema = z.object({
  eventType: pharmacyReminderEventTypeSchema,
  notes: z.string().trim().max(500).optional().nullable(),
  happenedAt: z.coerce.date().optional()
});

export const listQueueQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(30).default(7)
});

export const pharmacyConfigSchema = z.object({
  medicationEnabled: z.boolean(),
  discountEnabled: z.boolean(),
  reminderLeadDays: z.coerce.number().int().min(1).max(30)
});

export const listDiscountPlansQuerySchema = z.object({
  includeInactive: z.boolean().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

export const createDiscountPlanSchema = z.object({
  name: z.string().trim().min(2).max(120),
  percentage: z.coerce.number().positive().max(100),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
  rules: z.record(z.any()).optional().nullable()
});

export const listDiscountSubscriptionsQuerySchema = z.object({
  status: pharmacySubscriptionStatusSchema.optional(),
  patientId: z.string().trim().min(1).max(120).optional(),
  branchId: z.string().trim().min(1).max(64).optional(),
  take: z.coerce.number().int().min(1).max(200).default(100)
});

export const createDiscountSubscriptionSchema = z.object({
  planId: z.string().trim().min(1),
  patientId: z.string().trim().min(1).max(120).optional().nullable(),
  clientId: z.string().trim().min(1).max(120).optional().nullable(),
  branchId: z.string().trim().min(1).max(64).optional().nullable(),
  startedAt: z.coerce.date().optional().nullable()
});
