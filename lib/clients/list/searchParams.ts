import { z } from "zod";
import type { ClientListAlertFilter } from "@/lib/clients/list.service";

const alertSchema = z.enum([
  "INCOMPLETE",
  "DOCS_EXPIRED",
  "DOCS_EXPIRING",
  "REQUIRED_PENDING",
  "REQUIRED_REJECTED",
  "REQUIRED_EXPIRED",
  ""
]);

const schema = z.object({
  q: z.string().default(""),
  status: z.string().default(""),
  alert: alertSchema.default(""),
  includeArchived: z.enum(["0", "1"]).default("0"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  error: z.string().default("")
});

export type ClientListSearchParams = z.infer<typeof schema> & {
  includeArchivedBool: boolean;
  alertFilter: ClientListAlertFilter;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseClientListSearchParams(input?: Record<string, string | string[] | undefined>): ClientListSearchParams {
  const parsed = schema.parse({
    q: firstValue(input?.q),
    status: firstValue(input?.status),
    alert: firstValue(input?.alert),
    includeArchived: firstValue(input?.includeArchived) || "0",
    page: firstValue(input?.page) || 1,
    pageSize: firstValue(input?.pageSize) || 25,
    error: firstValue(input?.error)
  });

  return {
    ...parsed,
    includeArchivedBool: parsed.includeArchived === "1",
    alertFilter: parsed.alert as ClientListAlertFilter
  };
}

export function toSearchParamsObject(search: ClientListSearchParams) {
  return {
    q: search.q || undefined,
    status: search.status || undefined,
    alert: search.alert || undefined,
    includeArchived: search.includeArchivedBool ? "1" : undefined,
    page: search.page > 1 ? String(search.page) : undefined,
    pageSize: String(search.pageSize),
    error: search.error || undefined
  };
}
