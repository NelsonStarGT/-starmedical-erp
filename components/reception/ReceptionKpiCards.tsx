"use client";

import { AlertTriangle, Clock, Stethoscope, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReceptionOperationalKpis = {
  waitingCount: number;
  avgWaitMinutes: number | null;
  inServiceCount: number;
  activeDoctors: number;
  slaCritical: number;
  slaTotal: number;
  totalActiveVisits?: number;
};

type Props = {
  kpis: ReceptionOperationalKpis | null;
  isLoading?: boolean;
};

export function ReceptionKpiCards({ kpis, isLoading }: Props) {
  const cards = [
    {
      key: "wait",
      label: "Espera prom.",
      value: kpis?.avgWaitMinutes ?? null,
      suffix: "min",
      caption: kpis ? `${kpis.waitingCount} en cola` : "—",
      icon: Clock,
      tone: "info" as const
    },
    {
      key: "service",
      label: "Atendiendo",
      value: kpis?.inServiceCount ?? null,
      suffix: "",
      caption: kpis?.totalActiveVisits ? `${kpis.totalActiveVisits} activos` : "Pacientes en servicio",
      icon: Stethoscope,
      tone: "primary" as const
    },
    {
      key: "doctors",
      label: "Médicos activos",
      value: kpis?.activeDoctors ?? null,
      suffix: "",
      caption: "Con atención en curso",
      icon: Users,
      tone: "info" as const
    },
    {
      key: "sla",
      label: "SLA críticos",
      value: kpis?.slaCritical ?? null,
      suffix: "",
      caption: kpis ? `${kpis.slaTotal} alertas` : "—",
      icon: AlertTriangle,
      tone: (kpis?.slaCritical ?? 0) > 0 ? ("danger" as const) : ("ok" as const)
    }
  ];

  return (
    <section aria-label="KPIs de recepción" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((item) => {
        const Icon = item.icon;
        const showValue = isLoading ? "—" : item.value ?? 0;
        const badgeTone =
          item.tone === "danger"
            ? "bg-rose-100 text-rose-700"
            : item.tone === "ok"
              ? "bg-[#4aa59c]/10 text-[#2e75ba]"
              : "bg-[#4aadf5]/10 text-[#2e75ba]";

        return (
          <div key={item.key} className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">
                {item.label}
              </p>
              <span className={cn("rounded-full p-2", badgeTone)}>
                <Icon size={16} />
              </span>
            </div>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold text-[#102a43]",
                isLoading ? "animate-pulse text-slate-400" : "text-[#102a43]"
              )}
              style={{ fontFamily: "var(--font-reception-heading)" }}
            >
              {showValue}
              {item.suffix ? <span className="ml-1 text-base font-semibold text-slate-500">{item.suffix}</span> : null}
            </p>
            <p className="text-xs text-slate-500">{item.caption}</p>
          </div>
        );
      })}
    </section>
  );
}
