import { type BillingCaseLock } from "@/lib/billing/types";
import LockedByUserIndicator from "@/components/facturacion/LockedByUserIndicator";

export default function BillingLockBadge({ lock }: { lock?: BillingCaseLock }) {
  return <LockedByUserIndicator lock={lock} />;
}
