import { cn } from "@/lib/utils";

type KpiTone = "neutral" | "good" | "warn" | "danger" | "info";

const TONE_STYLES: Record<KpiTone, { pill: string; border: string; ink: string }> = {
  neutral: {
    pill: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
    ink: "text-slate-900"
  },
  good: {
    pill: "bg-emerald-100 text-emerald-800",
    border: "border-emerald-200",
    ink: "text-emerald-950"
  },
  warn: {
    pill: "bg-amber-100 text-amber-800",
    border: "border-amber-200",
    ink: "text-amber-950"
  },
  danger: {
    pill: "bg-rose-100 text-rose-800",
    border: "border-rose-200",
    ink: "text-rose-950"
  },
  info: {
    pill: "bg-[#2e75ba]/10 text-[#2e75ba]",
    border: "border-[#2e75ba]/25",
    ink: "text-slate-900"
  }
};

export default function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  className
}: {
  label: string;
  value: string | number;
  hint?: string | null;
  tone?: KpiTone;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={cn("rounded-2xl border bg-white p-5 shadow-soft", styles.border, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {label}
          </div>
          <div className={cn("mt-2 text-3xl font-semibold leading-none", styles.ink)}>
            {value}
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", styles.pill)}>
          Hoy
        </span>
      </div>
      {hint ? <div className="mt-3 text-sm text-slate-600">{hint}</div> : null}
    </div>
  );
}

