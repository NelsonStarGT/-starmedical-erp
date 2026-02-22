import { LockKeyhole, UnlockKeyhole } from "lucide-react";
import { formatBillingDate } from "@/lib/billing/format";
import { getBillingLockAgeCompact } from "@/lib/billing/operational";
import { type BillingCaseLock } from "@/lib/billing/types";

export default function LockedByUserIndicator({ lock }: { lock?: BillingCaseLock }) {
  if (!lock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <UnlockKeyhole className="h-3.5 w-3.5" />
        Libre
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#2e75ba]/20 bg-[#2e75ba]/10 px-2.5 py-1 text-xs font-semibold text-[#2e75ba]">
      <LockKeyhole className="h-3.5 w-3.5" />
      {lock.userName} · {getBillingLockAgeCompact(lock)}
      <span className="hidden text-[10px] text-[#2e75ba]/80 lg:inline">({formatBillingDate(lock.lockedAt)})</span>
    </span>
  );
}
