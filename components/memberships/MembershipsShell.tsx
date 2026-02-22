import { cn } from "@/lib/utils";

type MembershipsShellProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function MembershipsShell({ title, description, actions, children, className }: MembershipsShellProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#2e75ba]">{title}</h1>
            {description ? <p className="mt-1 text-xs text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">{children}</div>
    </section>
  );
}
