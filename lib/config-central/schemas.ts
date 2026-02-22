import { z } from "zod";

export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const HOUR_MINUTE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOUR_RANGE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const nullableTrimmedString = z
  .string()
  .trim()
  .max(300)
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

export const branchCreateSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Código requerido")
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Usa letras/números y guiones"),
  address: nullableTrimmedString,
  phone: nullableTrimmedString,
  timezone: z.string().trim().min(3).max(80).default("America/Guatemala"),
  isActive: z.boolean().default(true)
});

export const branchUpdateSchema = branchCreateSchema.partial();

export function parseHourMinute(value: string) {
  const parsed = HOUR_MINUTE_REGEX.exec(value.trim());
  if (!parsed) return null;
  return {
    hour: Number(parsed[1]),
    minute: Number(parsed[2])
  };
}

export function parseHourRange(value: string) {
  const parsed = HOUR_RANGE_REGEX.exec(value.trim());
  if (!parsed) return null;
  const startHour = Number(parsed[1]);
  const startMinute = Number(parsed[2]);
  const endHour = Number(parsed[3]);
  const endMinute = Number(parsed[4]);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) return null;
  return {
    startHour,
    startMinute,
    endHour,
    endMinute,
    value: `${parsed[1]}:${parsed[2]}-${parsed[3]}:${parsed[4]}`
  };
}

const dayRangesSchema = z
  .array(z.string().trim().regex(HOUR_RANGE_REGEX, "Usa formato HH:MM-HH:MM"))
  .max(8)
  .default([])
  .superRefine((items, ctx) => {
    for (let index = 0; index < items.length; index += 1) {
      if (!parseHourRange(items[index]!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: "Cada rango debe tener hora inicial menor a la final."
        });
      }
    }
  });

export const branchScheduleSchema = z
  .object({
    mon: dayRangesSchema.optional(),
    tue: dayRangesSchema.optional(),
    wed: dayRangesSchema.optional(),
    thu: dayRangesSchema.optional(),
    fri: dayRangesSchema.optional(),
    sat: dayRangesSchema.optional(),
    sun: dayRangesSchema.optional()
  })
  .strict();

export type BranchSchedule = {
  [K in WeekdayKey]: string[];
};

export function normalizeBranchSchedule(input: z.infer<typeof branchScheduleSchema>): BranchSchedule {
  const normalized = {} as BranchSchedule;
  for (const key of WEEKDAY_KEYS) {
    const values = (input[key] || []).map((entry) => entry.trim()).filter(Boolean);
    normalized[key] = Array.from(new Set(values)).sort((a, b) => {
      const aParsed = parseHourRange(a);
      const bParsed = parseHourRange(b);
      if (!aParsed || !bParsed) return a.localeCompare(b, "es");
      const aStart = aParsed.startHour * 60 + aParsed.startMinute;
      const bStart = bParsed.startHour * 60 + bParsed.startMinute;
      return aStart - bStart;
    });
  }
  return normalized;
}

export const branchBusinessHoursCreateSchema = z.object({
  validFrom: z.string().trim().min(1),
  validTo: z.string().trim().optional().nullable(),
  scheduleJson: branchScheduleSchema,
  slotMinutesDefault: z.number().int().min(5).max(240).optional().nullable(),
  isActive: z.boolean().default(true)
}).superRefine((value, ctx) => {
  const hasAnyRange = WEEKDAY_KEYS.some((day) => (value.scheduleJson[day] || []).length > 0);
  if (!hasAnyRange) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scheduleJson"],
      message: "Debes definir al menos un rango horario."
    });
  }
});

export const branchBusinessHoursPatchSchema = z
  .object({
    validTo: z.string().trim().optional().nullable(),
    isActive: z.boolean().optional()
  })
  .strict();

export const branchSatEstablishmentCreateSchema = z.object({
  legalEntityId: z.string().trim().min(1).max(120).optional().nullable(),
  satEstablishmentCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Código SAT requerido")
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Código SAT inválido"),
  legalName: z.string().trim().min(2, "Razón social requerida").max(180),
  tradeName: nullableTrimmedString,
  address: z.string().trim().min(4, "Dirección requerida").max(220),
  isActive: z.boolean().default(true)
});

export const branchSatEstablishmentUpdateSchema = branchSatEstablishmentCreateSchema.partial();

export const branchBillingProfileCreateSchema = z.object({
  legalEntityId: z.string().trim().min(1, "Entidad legal requerida").max(120),
  establishmentId: z.string().trim().min(1).max(120).optional().nullable(),
  priority: z.number().int().min(1).max(100).default(10),
  isActive: z.boolean().default(true),
  rulesJson: z.record(z.unknown()).optional().nullable()
});

export const branchBillingProfileUpdateSchema = z
  .object({
    legalEntityId: z.string().trim().min(1).max(120).optional(),
    establishmentId: z.string().trim().min(1).max(120).optional().nullable(),
    priority: z.number().int().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    rulesJson: z.record(z.unknown()).optional().nullable()
  })
  .strict();

export const legalEntityCreateSchema = z
  .object({
    legalName: z.string().trim().min(2, "Razón social requerida").max(180),
    tradeName: nullableTrimmedString,
    nit: nullableTrimmedString,
    address: nullableTrimmedString,
    isActive: z.boolean().default(true)
  })
  .strict();

export const legalEntityUpdateSchema = legalEntityCreateSchema.partial();

export const tradeUnitCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre requerido").max(180),
    registrationNumber: nullableTrimmedString,
    address: nullableTrimmedString,
    branchId: z.string().trim().min(1, "Sucursal requerida").max(120),
    legalEntityId: z.string().trim().min(1, "Entidad legal requerida").max(120),
    pdfAssetId: z.string().trim().min(1).max(120).optional().nullable(),
    isActive: z.boolean().default(true)
  })
  .strict();

export const tradeUnitUpdateSchema = tradeUnitCreateSchema.partial();

export const billingProfileCreateSchema = z
  .object({
    branchId: z.string().trim().min(1, "Sucursal requerida").max(120),
    legalEntityId: z.string().trim().min(1, "Entidad legal requerida").max(120),
    establishmentId: z.string().trim().min(1).max(120).optional().nullable(),
    priority: z.number().int().min(1).max(100).default(10),
    isActive: z.boolean().default(true),
    rulesJson: z.record(z.unknown()).optional().nullable()
  })
  .strict();

export const billingProfileUpdateSchema = billingProfileCreateSchema
  .partial()
  .extend({
    branchId: z.string().trim().min(1).max(120).optional(),
    legalEntityId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export const THEME_FONT_KEYS = ["inter", "poppins", "montserrat", "nunito", "roboto"] as const;

export const tenantThemePaletteSchema = z.object({
  primary: z.string().trim().regex(HEX_COLOR_REGEX),
  secondary: z.string().trim().regex(HEX_COLOR_REGEX),
  accent: z.string().trim().regex(HEX_COLOR_REGEX),
  bg: z.string().trim().regex(HEX_COLOR_REGEX),
  surface: z.string().trim().regex(HEX_COLOR_REGEX),
  text: z.string().trim().regex(HEX_COLOR_REGEX)
});

export const tenantThemePatchSchema = z
  .object({
    theme: tenantThemePaletteSchema.optional(),
    fontKey: z.enum(THEME_FONT_KEYS).optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    logoAssetId: z.string().trim().min(1).nullable().optional()
  })
  .strict();

export type TenantThemePatch = z.infer<typeof tenantThemePatchSchema>;
