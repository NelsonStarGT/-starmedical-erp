import { cn } from "@/lib/utils";

type KPIStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning" | "success";
  className?: string;
};

function toneClasses(tone: KPIStatCardProps["tone"]) {
  if (tone === "warning") return "border-amber-200 bg-amber-50";
  if (tone === "success") return "border-emerald-200 bg-emerald-50";
  return "border-slate-200 bg-white";
}

export function KPIStatCard({ label, value, hint, tone = "default", className }: KPIStatCardProps) {
  return (
    <article className={cn("rounded-lg border px-3 py-3 shadow-sm", toneClasses(tone), className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-600">{hint}</p> : null}
    </article>
  );
}
