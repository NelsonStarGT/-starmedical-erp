"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { SlaAlert } from "@/lib/reception/dashboard.types";
import { cn } from "@/lib/utils";

const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 } as const;

type Props = {
  alerts: SlaAlert[];
  isLoading?: boolean;
  limit?: number;
};

const severityStyles: Record<string, { badge: string; icon: any; label: string }> = {
  CRITICAL: { badge: "bg-rose-100 text-rose-700", icon: AlertTriangle, label: "Crítico" },
  WARNING: { badge: "bg-amber-100 text-amber-700", icon: AlertCircle, label: "Alerta" },
  INFO: { badge: "bg-slate-100 text-slate-600", icon: Info, label: "Info" }
};

export function SlaAlertsPanel({ alerts, isLoading, limit = 8 }: Props) {
  const ordered = [...alerts].sort((a, b) => {
    const diff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
    if (diff !== 0) return diff;
    return (b.minutesExcedidos ?? 0) - (a.minutesExcedidos ?? 0);
  });

  return (
    <section className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">SLA</p>
          <h3 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            Alertas activas
          </h3>
        </div>
        <span className="rounded-full bg-[#4aadf5]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
          {isLoading ? "..." : `${alerts.length} en monitoreo`}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
            Cargando alertas SLA...
          </div>
        ) : ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Sin alertas activas.
          </div>
        ) : (
          ordered.slice(0, limit).map((alert, idx) => {
            const style = severityStyles[alert.severity] ?? severityStyles.INFO;
            const Icon = style.icon;
            return (
              <div key={`${alert.type}-${idx}`} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                <span className={cn("mt-0.5 rounded-full p-2", style.badge)}>
                  <Icon size={14} />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase", style.badge)}>
                      {style.label}
                    </span>
                    {typeof alert.minutesExcedidos === "number" && (
                      <span className="text-xs text-slate-500">+{alert.minutesExcedidos} min</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
