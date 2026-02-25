import type { SessionUser } from "@/lib/auth";

export const DEFAULT_TENANT_ID = "global";

export function normalizeTenantId(value: unknown): string {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : DEFAULT_TENANT_ID;
}

export function tenantIdFromUser(user?: Pick<SessionUser, "tenantId"> | null): string {
  return normalizeTenantId(user?.tenantId);
}

export function sameTenant(user: Pick<SessionUser, "tenantId"> | null | undefined, targetTenantId: unknown): boolean {
  return tenantIdFromUser(user) === normalizeTenantId(targetTenantId);
}
