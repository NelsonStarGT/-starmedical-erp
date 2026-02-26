"use client";

import { DateRangeField } from "@/components/ui/DateRangeField";
import { cn } from "@/lib/utils";
import type { AdminDiagnosticFiltersState, DiagnosticAcceptance, DiagnosticOrderStatus, DiagnosticOrderType } from "./types";

export default function AdminDiagnosticFilters({
  value,
  onChange,
  className
}: {
  value: AdminDiagnosticFiltersState;
  onChange: (next: AdminDiagnosticFiltersState) => void;
  className?: string;
}) {
  const set = (patch: Partial<AdminDiagnosticFiltersState>) => onChange({ ...value, ...patch });

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">Módulo médico</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Diagnóstico</h2>
          <p className="mt-1 text-sm text-slate-600">
            Estado de exámenes indicados · aceptación del paciente · resultados listos.
          </p>
        </div>

        <input
          value={value.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Buscar paciente, examen, ID…"
          className={cn(
            "w-full md:w-[360px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none",
            "focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Tipo</label>
          <select
            value={value.type}
            onChange={(e) => set({ type: e.target.value as AdminDiagnosticFiltersState["type"] })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
          >
            <option value="all">Todos</option>
            {(["LAB", "RX", "USG"] as DiagnosticOrderType[]).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Aceptación</label>
          <select
            value={value.acceptance}
            onChange={(e) => set({ acceptance: e.target.value as AdminDiagnosticFiltersState["acceptance"] })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
          >
            <option value="all">Todos</option>
            {(["accepted", "rejected"] as DiagnosticAcceptance[]).map((v) => (
              <option key={v} value={v}>{v === "accepted" ? "Aceptó" : "No aceptó"}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Estado</label>
          <select
            value={value.status}
            onChange={(e) => set({ status: e.target.value as AdminDiagnosticFiltersState["status"] })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
          >
            <option value="all">Todos</option>
            {(["pending", "in_progress", "ready"] as DiagnosticOrderStatus[]).map((v) => (
              <option key={v} value={v}>
                {v === "pending" ? "Pendiente" : v === "in_progress" ? "En proceso" : "Resultados listos"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DateRangeField
        value={{ from: value.dateFrom, to: value.dateTo }}
        onChange={(range) => set({ dateFrom: range.from, dateTo: range.to })}
        labels={{ from: "Desde", to: "Hasta" }}
      />

      <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-xs text-slate-600">
        TODO: conectar filtros con proyección de flags sanitizados por cita/visita (sin exponer valores clínicos a administrativo).
      </div>
    </div>
  );
}
