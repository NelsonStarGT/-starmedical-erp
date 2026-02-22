import { cn } from "@/lib/utils";

export function ClientStatusBadge({ isArchived, statusLabel }: { isArchived: boolean; statusLabel: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        isArchived
          ? "border-[#4aadf5]/40 bg-[#4aadf5]/10 text-[#2e75ba]"
          : "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      {isArchived ? "Archivado" : statusLabel ?? "—"}
    </span>
  );
}
