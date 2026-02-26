"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { DateField } from "@/components/ui/DateField";
import { cn } from "@/lib/utils";
import type { AgendaFiltersState, AgendaPriority, AgendaStatus, TriageStatus } from "./types";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const STATUS_OPTIONS: Array<{ value: "all" | AgendaStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "En espera" },
  { value: "triage", label: "En triage" },
  { value: "in_consult", label: "En consulta" },
  { value: "done", label: "Finalizado" }
];

const PRIORITY_OPTIONS: Array<{ value: "all" | AgendaPriority; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "Alta", label: "Alta" },
  { value: "Media", label: "Media" },
  { value: "Baja", label: "Baja" }
];

const TRIAGE_OPTIONS: Array<{ value: "all" | TriageStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En curso" },
  { value: "ready", label: "Listo" },
  { value: "not_required", label: "No requerido" }
];

const BOOL_FILTER_OPTIONS = [
  { value: "all" as const, label: "Todos" },
  { value: "yes" as const, label: "Sí" },
  { value: "no" as const, label: "No" }
];

function fieldClasses() {
  return "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15";
}

export default function AgendaFilters({
  value,
  onChange,
  className
}: {
  value: AgendaFiltersState;
  onChange: (next: AgendaFiltersState) => void;
  className?: string;
}) {
  return (
    <FilterBar
      className={className}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...value, date: todayKey() })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                status: "all",
                priority: "all",
                triageStatus: "all",
                resultsReady: "all",
                diagnosisPending: "all",
                query: ""
              })
            }
            className="rounded-xl bg-diagnostics-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Limpiar
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <DateField
          value={value.date}
          onChange={(date) => onChange({ ...value, date })}
          label="Fecha"
          className="min-w-[170px]"
          inputClassName={fieldClasses()}
        />

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Estado</label>
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as any })}
            className={fieldClasses()}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Prioridad</label>
          <select
            value={value.priority}
            onChange={(e) => onChange({ ...value, priority: e.target.value as any })}
            className={fieldClasses()}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Triage</label>
          <select
            value={value.triageStatus}
            onChange={(e) => onChange({ ...value, triageStatus: e.target.value as any })}
            className={fieldClasses()}
          >
            {TRIAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Resultados listos</label>
          <select
            value={value.resultsReady}
            onChange={(e) => onChange({ ...value, resultsReady: e.target.value as any })}
            className={fieldClasses()}
          >
            {BOOL_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">DX pendiente</label>
          <select
            value={value.diagnosisPending}
            onChange={(e) => onChange({ ...value, diagnosisPending: e.target.value as any })}
            className={cn(fieldClasses(), "min-w-[120px]")}
          >
            {BOOL_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Buscar paciente</label>
          <input
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Paciente…"
            className={cn(fieldClasses(), "w-[220px]")}
          />
        </div>
      </div>
    </FilterBar>
  );
}
