import { CompanyContractStatus, CompanyKind, CompanyStatus } from "@prisma/client";
import { z } from "zod";

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "no", "n"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().default(false));

export const companyListQuerySchema = z.object({
  tenantId: z.string().trim().min(1).max(80).default("default"),
  q: z.string().trim().min(1).max(120).optional(),
  kind: z.nativeEnum(CompanyKind).optional(),
  status: z.nativeEnum(CompanyStatus).optional(),
  contractStatus: z.nativeEnum(CompanyContractStatus).optional(),
  includeArchived: booleanQuerySchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const companyDetailQuerySchema = z.object({
  tenantId: z.string().trim().min(1).max(80).default("default"),
  includeArchived: booleanQuerySchema
});

export const companyIdParamSchema = z.object({
  id: z.string().trim().min(1).max(191)
});

export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;
export type CompanyDetailQuery = z.infer<typeof companyDetailQuerySchema>;
