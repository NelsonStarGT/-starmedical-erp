import { formatBillingMoney } from "@/lib/billing/format";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "info" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  primary: "border-[#4aa59c]/30 bg-[#4aa59c]/10 text-[#2f7f77]",
  info: "border-[#4aadf5]/35 bg-[#4aadf5]/12 text-[#2e75ba]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800"
};

export default function MoneyPill({ label, amount, tone = "neutral", className }: { label: string; amount: number; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses[tone], className)}>
      <span className="text-[10px] uppercase tracking-[0.12em] opacity-80">{label}</span>
      <span>{formatBillingMoney(amount)}</span>
    </span>
  );
}
