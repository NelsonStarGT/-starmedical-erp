"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CollapsibleCard({
  title,
  subtitle,
  badge,
  defaultExpanded = false,
  collapsedLabel = "Ver detalles",
  expandedLabel = "Ocultar",
  className,
  summary,
  children
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  defaultExpanded?: boolean;
  collapsedLabel?: string;
  expandedLabel?: string;
  className?: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className={cn("rounded-xl border border-[#dce7f5] bg-white p-3 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {badge}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            <span>{expanded ? expandedLabel : collapsedLabel}</span>
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {summary ? <div className="mt-2">{summary}</div> : null}

      <div id={panelId} hidden={!expanded} className="mt-2 space-y-2">
        {children}
      </div>
    </section>
  );
}
