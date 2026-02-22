import { ReactNode } from "react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, className, action }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-[#e5edf8] bg-white p-8 text-center", className)}>
      <div className="mb-3 rounded-full bg-[#e8f1ff] p-3 text-[#2e75ba]">
        {icon || <InboxIcon className="h-6 w-6" />}
      </div>
      <h3 className="text-lg font-semibold text-[#163d66]">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
