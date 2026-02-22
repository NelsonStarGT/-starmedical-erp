"use client";

import { RECEPTION_AREAS, RECEPTION_AREA_LABELS, type ReceptionArea } from "@/lib/reception/constants";
import { cn } from "@/lib/utils";

type Props = {
  value?: ReceptionArea | null;
  onChange?: (area: ReceptionArea | null) => void;
  allowAll?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function AreaPills({ value, onChange, allowAll = false, size = "md", className }: Props) {
  const base = "rounded-full border px-3 py-1 text-sm font-semibold transition";
  const active = "bg-[#4aa59c] text-white border-[#4aa59c] shadow-sm";
  const inactive = "bg-white text-slate-600 border-slate-200 hover:border-[#4aadf5] hover:text-[#2e75ba]";
  const sizing = size === "sm" ? "text-xs px-2 py-1" : "";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {allowAll && (
        <button
          type="button"
          className={cn(base, sizing, value ? inactive : active)}
          onClick={() => onChange?.(null)}
        >
          Todas
        </button>
      )}
      {RECEPTION_AREAS.map((area) => (
        <button
          key={area}
          type="button"
          className={cn(base, sizing, value === area ? active : inactive)}
          onClick={() => onChange?.(area)}
        >
          {RECEPTION_AREA_LABELS[area]}
        </button>
      ))}
    </div>
  );
}
