import { cn } from "@/lib/utils";

type SubscriptionsHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function SubscriptionsHeader({
  title = "Suscripciones",
  subtitle = "Membresías y farmacia: operación, pagos y beneficios.",
  actions,
  className
}: SubscriptionsHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold text-[#2e75ba]">{title}</h2>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
