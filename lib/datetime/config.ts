import { z } from "zod";
import {
  DATE_FORMAT_VALUES,
  TIME_FORMAT_VALUES,
  WEEK_START_VALUES,
  type DateFormat,
  type TenantDateTimeConfig,
  type TenantDateTimeConfigSnapshot,
  type TimeFormat,
  type WeekStartsOn
} from "@/lib/datetime/types";

export * from "@/lib/datetime/types";

export const tenantDateTimeConfigPatchSchema = z
  .object({
    dateFormat: z.enum(DATE_FORMAT_VALUES).optional(),
    timeFormat: z.enum(TIME_FORMAT_VALUES).optional(),
    timezone: z.string().trim().min(3).max(80).optional(),
    weekStartsOn: z.enum(WEEK_START_VALUES).optional()
  })
  .strict();

export type TenantDateTimeConfigPatch = z.infer<typeof tenantDateTimeConfigPatchSchema>;

export function parseTenantDateTimeConfigPatch(input: unknown): TenantDateTimeConfigPatch {
  return tenantDateTimeConfigPatchSchema.parse(input);
}

export type { DateFormat, TenantDateTimeConfig, TenantDateTimeConfigSnapshot, TimeFormat, WeekStartsOn };
