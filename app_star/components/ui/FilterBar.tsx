import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function FilterBar({ children, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
