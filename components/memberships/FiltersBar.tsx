import { cn } from "@/lib/utils";

type FiltersBarProps = {
  children: React.ReactNode;
  className?: string;
};

export function FiltersBar({ children, className }: FiltersBarProps) {
  return <div className={cn("grid grid-cols-1 gap-2 rounded-lg bg-[#F8FAFC] p-3 md:grid-cols-4", className)}>{children}</div>;
}
