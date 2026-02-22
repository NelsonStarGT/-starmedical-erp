"use client";

import { cn } from "@/lib/utils";

export type RankingItem = {
  title: string;
  subtitle?: string;
  value: string;
  hint?: string;
};

export function RankingList({ title, items }: { title: string; items: RankingItem[] }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E7] bg-white/90 p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="text-xs text-slate-500">{items.length} ítems</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
        {items.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2",
              idx === 0 && "border-brand-primary/30 bg-brand-primary/5"
            )}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
              {item.hint && <p className="text-[11px] text-slate-400">{item.hint}</p>}
            </div>
            <span className="text-sm font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
