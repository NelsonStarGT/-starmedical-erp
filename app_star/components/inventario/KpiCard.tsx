"use client";

import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export function KpiCard({ title, value, subtitle, tone = "default" }: KpiCardProps) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-100 bg-amber-50"
        : tone === "danger"
          ? "border-rose-100 bg-rose-50"
          : "border-[#E5E5E7] bg-white/90";

  return (
    <div className={cn("rounded-2xl border p-4 shadow-soft", toneClasses)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
