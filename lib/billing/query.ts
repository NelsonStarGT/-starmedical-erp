import { type BillingCaseFilters, type BillingOriginModule, type BillingPayerType, BILLING_TRAY_IDS } from "@/lib/billing/types";

export function isBillingTrayId(value: string): value is (typeof BILLING_TRAY_IDS)[number] {
  return BILLING_TRAY_IDS.includes(value as (typeof BILLING_TRAY_IDS)[number]);
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseBillingFilters(searchParams?: Record<string, string | string[] | undefined>): BillingCaseFilters {
  if (!searchParams) return {};
  const siteId = firstParam(searchParams.siteId);
  const payerType = firstParam(searchParams.payerType);
  const serviceArea = firstParam(searchParams.serviceArea);
  const query = firstParam(searchParams.q);
  const onlyLocked = firstParam(searchParams.onlyLocked);

  return {
    query: query?.trim() ? query.trim() : undefined,
    siteId: siteId && siteId !== "ALL" ? siteId : undefined,
    payerType: payerType && payerType !== "ALL" ? (payerType as BillingPayerType) : "ALL",
    serviceArea: serviceArea && serviceArea !== "ALL" ? (serviceArea as BillingOriginModule) : "ALL",
    onlyLocked: onlyLocked === "on"
  };
}
