"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CvcKpiItem = {
  key: string;
  label: string;
  value: number;
  href: string;
  active: boolean;
  tone?: "default" | "warning" | "danger" | "info";
};

export default function CvcKpiRow({
  items,
  storageKey
}: {
  items: CvcKpiItem[];
  storageKey?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "1") setExpanded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, expanded ? "1" : "0");
  }, [expanded, storageKey]);

  return (
    <section className="rounded-xl border border-[#dce7f5] bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Resumen operativo</p>
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={`compact-${item.key}`}
            href={item.href}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
              item.active
                ? "border-[#4aadf5] bg-[#4aadf5]/10 text-[#2e75ba]"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]/60"
            )}
          >
            <span>{item.label}</span>
            <span>{item.value}</span>
          </Link>
        ))}
      </div>

      {expanded ? (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7">
          {items.map((item) => (
            <Link
              key={`expanded-${item.key}`}
              href={item.href}
              className={cn(
                "rounded-xl border bg-white px-3 py-2 shadow-sm transition",
                item.active ? "border-[#4aadf5]" : "border-[#dce7f5] hover:border-[#4aadf5]/60"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold",
                  item.tone === "danger"
                    ? "text-rose-700"
                    : item.tone === "warning"
                      ? "text-amber-700"
                      : item.tone === "info"
                        ? "text-sky-700"
                        : "text-slate-900"
                )}
              >
                {item.value}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
