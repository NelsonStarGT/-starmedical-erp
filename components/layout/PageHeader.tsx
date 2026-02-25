import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">{eyebrow}</p>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
