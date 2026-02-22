import { AlertTriangle, CircleDot } from "lucide-react";
import { getBillingPriorityMeta, type BillingPriorityLevel } from "@/lib/billing/operational";
import { cn } from "@/lib/utils";

export default function PriorityChip({ level, reason, compact = false }: { level: BillingPriorityLevel; reason?: string; compact?: boolean }) {
  const meta = getBillingPriorityMeta(level);
  const Icon = level === "ALTA" ? AlertTriangle : CircleDot;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.className,
        compact && "px-2 py-0.5 text-[11px]"
      )}
      title={reason}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {meta.label}
    </span>
  );
}
