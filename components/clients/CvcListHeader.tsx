import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CvcListHeader({
  title,
  subtitle,
  actions,
  helpText,
  className
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  helpText?: string;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-[#dce7f5] bg-white px-3 py-2 shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-base font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              {title}
            </h1>
            {helpText ? (
              <span
                title={helpText}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
                aria-label="Ayuda"
              >
                <CircleHelp size={12} />
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
