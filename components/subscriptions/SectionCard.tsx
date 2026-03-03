import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SectionCard({ title, subtitle, actions, children, className, contentClassName }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#2e75ba]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </section>
  );
}
