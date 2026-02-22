"use client";

import { cn } from "@/lib/utils";

export type ActivityFilterState = {
  year: string;
  month: string;
  from: string;
  to: string;
  event: string;
};

export default function ActivityFilters({
  value,
  years,
  events,
  onChange,
  onClear
}: {
  value: ActivityFilterState;
  years: number[];
  events: Array<{ value: string; label: string }>;
  onChange: (next: ActivityFilterState) => void;
  onClear: () => void;
}) {
  const hasFilters = Boolean(value.year || value.month || value.from || value.to || value.event);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filtros</p>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={value.year}
          onChange={(event) => onChange({ ...value, year: event.target.value, month: "" })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Año (todos)</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={value.month}
          onChange={(event) => onChange({ ...value, month: event.target.value })}
          disabled={!value.year}
          className={cn(
            "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700",
            !value.year && "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        >
          <option value="">Mes (todos)</option>
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>

        <select
          value={value.event}
          onChange={(event) => onChange({ ...value, event: event.target.value })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">Tipo de evento (todos)</option>
          {events.map((eventOption) => (
            <option key={eventOption.value} value={eventOption.value}>
              {eventOption.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="date"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value, year: "", month: "" })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        />
        <input
          type="date"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value, year: "", month: "" })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        />
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className={cn(
            "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
            !hasFilters && "cursor-not-allowed opacity-60"
          )}
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
