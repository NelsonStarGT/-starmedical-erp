import { LabTestPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: LabTestPriority }) {
  const styles: Record<LabTestPriority, string> = {
    ROUTINE: "bg-[#e8f1ff] text-[#2e75ba]",
    URGENT: "bg-[#fff4e5] text-[#b45309]",
    STAT: "bg-[#fde2e1] text-[#b91c1c]"
  };
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", styles[priority])}>{priority}</span>;
}
