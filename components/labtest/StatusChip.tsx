import { LabTestStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { LAB_STATUS_LABEL } from "@/lib/labtest/status";

export function StatusChip({ status }: { status: LabTestStatus }) {
  const tone: Record<LabTestStatus, string> = {
    REQUESTED: "bg-slate-100 text-slate-700",
    REQUIREMENTS_PENDING: "bg-amber-100 text-amber-700",
    READY_FOR_COLLECTION: "bg-[#e8f1ff] text-[#2e75ba]",
    COLLECTED: "bg-[#e5f5f2] text-[#1f6f68]",
    QUEUED: "bg-[#f3f4f6] text-slate-700",
    IN_PROCESS: "bg-[#fff4e5] text-[#b45309]",
    RESULT_CAPTURED: "bg-[#e0f2fe] text-[#0369a1]",
    TECH_VALIDATED: "bg-[#e5f5f2] text-[#1f6f68]",
    RELEASED: "bg-emerald-50 text-emerald-700",
    SENT: "bg-[#e5f2ff] text-[#1d4ed8]",
    CANCELLED: "bg-rose-50 text-rose-700"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tone[status])}>
      {LAB_STATUS_LABEL[status]}
    </span>
  );
}
