"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResponsiveInfoCard({
  title,
  subtitle,
  badges,
  summary,
  actions,
  defaultExpanded = false,
  collapsedLabel = "Ver detalles",
  expandedLabel = "Ocultar",
  className,
  children
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  defaultExpanded?: boolean;
  collapsedLabel?: string;
  expandedLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className={cn("rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
          <h3 className="mt-2 break-words text-sm font-semibold text-slate-900 sm:text-base md:text-lg">{title}</h3>
          {subtitle ? <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba] sm:h-10 sm:text-sm"
          >
            <span>{expanded ? expandedLabel : collapsedLabel}</span>
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {summary ? <div className="mt-3">{summary}</div> : null}

      <div id={panelId} hidden={!expanded} className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}
