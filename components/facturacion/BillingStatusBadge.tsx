import { type BillingCaseStatus } from "@/lib/billing/types";
import { getBillingStatusMeta } from "@/lib/billing/workflow";

export default function BillingStatusBadge({ status }: { status: BillingCaseStatus }) {
  const meta = getBillingStatusMeta(status);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}
