"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { cn } from "@/lib/utils";
import type { WorklistFiltersState, WorklistQuickFilterKey } from "./types";

const TABS: Array<{ key: WorklistQuickFilterKey; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "overdue", label: "Atrasados" },
  { key: "waiting", label: "En espera" },
  { key: "triage", label: "En triage" },
  { key: "ready", label: "Listo" },
  { key: "in_consult", label: "En consulta" },
  { key: "done", label: "Finalizado" }
];

function tabClasses(active: boolean) {
  return cn(
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diagnostics-primary focus-visible:ring-offset-2",
    active
      ? "border-diagnostics-corporate bg-diagnostics-corporate text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );
}

export default function WorklistFilters({
  value,
  onChange,
  counts,
  className
}: {
  value: WorklistFiltersState;
  onChange: (next: WorklistFiltersState) => void;
  counts?: Partial<Record<WorklistQuickFilterKey, number>>;
  className?: string;
}) {
  return (
    <FilterBar className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = value.quick === tab.key;
          const count = counts?.[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange({ ...value, quick: tab.key })}
              className={tabClasses(active)}
            >
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="Buscar paciente / ticket / teléfono"
          className="w-[280px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
        />
      </div>
    </FilterBar>
  );
}

