"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import ActivityFilters, { type ActivityFilterState } from "@/components/clients/portal/ActivityFilters";

type ActivityEntry = {
  id: string;
  timestamp: string;
  action: string;
  actionLabel: string;
  actorRole: string | null;
  actorLabel: string;
  metadata: Record<string, unknown> | null;
};

const PAGE_SIZE = 15;

function buildDateRange(filter: ActivityFilterState) {
  const from = filter.from ? new Date(`${filter.from}T00:00:00`) : null;
  const to = filter.to ? new Date(`${filter.to}T23:59:59.999`) : null;

  if (from || to) {
    return { from, to };
  }

  const year = Number(filter.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    return { from: null, to: null };
  }

  const month = Number(filter.month);
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    return {
      from: new Date(year, month - 1, 1, 0, 0, 0, 0),
      to: new Date(year, month, 0, 23, 59, 59, 999)
    };
  }

  return {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

function toDateSafe(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function ClientActivityTimelinePanel({ entries }: { entries: ActivityEntry[] }) {
  const [filters, setFilters] = useState<ActivityFilterState>({
    year: "",
    month: "",
    from: "",
    to: "",
    event: ""
  });
  const [page, setPage] = useState(1);

  const years = useMemo(() => {
    const values = new Set<number>();
    for (const entry of entries) {
      const date = toDateSafe(entry.timestamp);
      if (!date) continue;
      values.add(date.getFullYear());
    }
    return Array.from(values).sort((a, b) => b - a);
  }, [entries]);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (!map.has(entry.action)) {
        map.set(entry.action, entry.actionLabel);
      }
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const { from, to } = buildDateRange(filters);

    return entries.filter((entry) => {
      if (filters.event && entry.action !== filters.event) return false;
      const timestamp = toDateSafe(entry.timestamp);
      if (!timestamp) return false;
      if (from && timestamp < from) return false;
      if (to && timestamp > to) return false;
      return true;
    });
  }, [entries, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, safePage]);

  function handleChange(next: ActivityFilterState) {
    setFilters(next);
    setPage(1);
  }

  function handleClear() {
    setFilters({
      year: "",
      month: "",
      from: "",
      to: "",
      event: ""
    });
    setPage(1);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Timeline de cliente</p>

      <ActivityFilters value={filters} years={years} events={eventOptions} onChange={handleChange} onClear={handleClear} />

      <div className="space-y-2">
        {paginatedEntries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{entry.actionLabel}</p>
            <p className="mt-1 text-xs text-slate-500">
              {entry.actorLabel}
              {entry.actorRole ? ` (${entry.actorRole})` : ""} · {new Date(entry.timestamp).toLocaleString()}
            </p>
            {entry.metadata && typeof entry.metadata === "object" ? (
              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                {Object.entries(entry.metadata)
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <p key={`${entry.id}-${key}`}>
                      <span className="font-semibold text-slate-900">{key}:</span>{" "}
                      {typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                        ? String(value)
                        : JSON.stringify(value)}
                    </p>
                  ))}
              </div>
            ) : null}
          </div>
        ))}

        {!paginatedEntries.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No hay eventos para los filtros seleccionados.
          </div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Página <span className="font-semibold text-slate-700">{safePage}</span> de{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className={cn(
                "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                safePage <= 1 && "cursor-not-allowed opacity-60"
              )}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage >= totalPages}
              className={cn(
                "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                safePage >= totalPages && "cursor-not-allowed opacity-60"
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
