"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { sanitizeRichHtmlOrDash } from "@/lib/medical/sanitize";
import type { EncounterReconsulta } from "./types";

type TimelineFilter = "all" | "results" | "manual";

type Props = {
  entries: EncounterReconsulta[];
  readOnly?: boolean;
  onViewSourceResult?: (sourceResultId: string) => void;
  dense?: boolean;
};

const FILTER_OPTIONS: Array<{ key: TimelineFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "results", label: "Por resultados" },
  { key: "manual", label: "Manual" }
];

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function typeLabel(type: EncounterReconsulta["type"]) {
  return type === "reconsulta_resultados" ? "Reconsulta por resultados" : "Evolución manual";
}

function typeStyles(type: EncounterReconsulta["type"]) {
  return type === "reconsulta_resultados"
    ? "border-[#2e75ba]/30 bg-[#f2f8ff] text-[#2e75ba]"
    : "border-[#4aa59c]/35 bg-[#4aa59c]/10 text-[#0f4f49]";
}

function bulletStyles(type: EncounterReconsulta["type"]) {
  return type === "reconsulta_resultados" ? "border-[#2e75ba] bg-[#4aadf5]" : "border-[#0f4f49] bg-[#4aa59c]";
}

function detailsContentClass(dense: boolean) {
  return dense ? "text-xs leading-5" : "text-sm leading-6";
}

function detailsSummaryClass(dense: boolean) {
  return dense ? "px-3 py-2 text-xs font-semibold" : "px-3 py-2.5 text-sm font-semibold";
}

export default function ReconsultaTimeline({ entries, readOnly = false, onViewSourceResult, dense = true }: Props) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [query, setQuery] = useState("");

  const orderedEntries = useMemo(
    () =>
      entries.slice().sort((a, b) => {
        const left = new Date(a.createdAt).getTime();
        const right = new Date(b.createdAt).getTime();
        return right - left;
      }),
    [entries]
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("es-GT");

  const counters = useMemo(
    () => ({
      all: orderedEntries.length,
      results: orderedEntries.filter((entry) => entry.type === "reconsulta_resultados").length,
      manual: orderedEntries.filter((entry) => entry.type === "manual_evolution").length
    }),
    [orderedEntries]
  );

  const filteredEntries = useMemo(
    () =>
      orderedEntries.filter((entry) => {
        if (filter === "results" && entry.type !== "reconsulta_resultados") return false;
        if (filter === "manual" && entry.type !== "manual_evolution") return false;

        if (!normalizedQuery) return true;
        const searchable = [entry.entryTitle, entry.noteRich?.text || "", entry.interpretation || ""].join(" ").toLocaleLowerCase("es-GT");
        return searchable.includes(normalizedQuery);
      }),
    [filter, normalizedQuery, orderedEntries]
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
        Sin reconsultas aún. Guarda la primera evolución desde la hoja en blanco.
      </div>
    );
  }

  return (
    <div className={cn(dense ? "space-y-4" : "space-y-5")}>
      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Filtrar:</span>
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  isActive
                    ? "border-[#2e75ba]/30 bg-[#f2f8ff] text-[#2e75ba]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
                aria-label={`Filtrar reconsultas: ${option.label}`}
              >
                {option.label} ({counters[option.key]})
              </button>
            );
          })}
          {readOnly ? (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Modo lectura
            </span>
          ) : null}
        </div>

        <div className="mt-3 relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en título o texto clínico"
            aria-label="Buscar dentro de reconsultas"
            className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[#2e75ba]"
          />
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          Sin coincidencias para el filtro o búsqueda actual.
        </div>
      ) : (
        <div className="relative pl-1">
          <div className="absolute bottom-4 left-3 top-4 w-px bg-slate-200" />
          <div className={cn(dense ? "space-y-3" : "space-y-4")}>
            {filteredEntries.map((entry) => {
              const hasRichText = Boolean(entry.noteRich?.text?.trim());
              const interpretationHtml = sanitizeRichHtmlOrDash(entry.noteRich?.html || "", entry.interpretation?.trim() || "—");
              const interpretationPlain = entry.interpretation?.trim() || "—";
              const conductText = entry.conduct?.trim() || "—";
              const therapeuticText = entry.therapeuticAdjustment?.trim() || "—";
              const canViewSource = Boolean(onViewSourceResult && entry.sourceResultId);

              return (
                <article key={entry.id} className="relative pl-8">
                  <span className={cn("absolute left-[6px] top-5 h-3.5 w-3.5 rounded-full border-2", bulletStyles(entry.type))} />
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft lg:p-4">
                    <header className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", typeStyles(entry.type))}>
                            {typeLabel(entry.type)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            Append-only
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{formatDate(entry.createdAt)}</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900">{entry.entryTitle}</p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span>
                          Autor: <span className="font-semibold text-slate-800">{entry.authorName || "—"}</span>
                        </span>
                        {entry.sourceResultTitle ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-slate-500">Fuente:</span>
                            {canViewSource ? (
                              <button
                                type="button"
                                onClick={() => onViewSourceResult?.(entry.sourceResultId!)}
                                className="rounded-full border border-[#2e75ba]/25 bg-[#f2f8ff] px-2 py-0.5 font-semibold text-[#2e75ba] hover:bg-[#e8f2ff]"
                                aria-label={`Abrir resultado fuente ${entry.sourceResultTitle}`}
                              >
                                {entry.sourceResultTitle}
                              </button>
                            ) : (
                              <span className="font-semibold text-slate-700">{entry.sourceResultTitle}</span>
                            )}
                          </span>
                        ) : (
                          <span>
                            Fuente: <span className="font-semibold text-slate-700">Evolución manual</span>
                          </span>
                        )}
                      </div>
                    </header>

                    <div className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3">
                      <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Interpretación</p>
                        {hasRichText ? (
                          <div
                            className="prose prose-sm mt-2 max-w-none text-slate-700"
                            dangerouslySetInnerHTML={{ __html: interpretationHtml }}
                          />
                        ) : (
                          <p className={cn("mt-2 whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{interpretationPlain}</p>
                        )}
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Conducta</p>
                        <p className={cn("mt-2 whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{conductText}</p>
                      </section>

                      <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ajuste terapéutico</p>
                        <p className={cn("mt-2 whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{therapeuticText}</p>
                      </section>
                    </div>

                    <div className="mt-3 space-y-2 lg:hidden">
                      <details className="rounded-xl border border-slate-200 bg-[#F8FAFC]">
                        <summary className={cn("cursor-pointer list-none text-slate-800", detailsSummaryClass(dense))}>Interpretación</summary>
                        <div className="border-t border-slate-200 px-3 py-2">
                          {hasRichText ? (
                            <div
                              className="prose prose-sm max-w-none text-slate-700"
                              dangerouslySetInnerHTML={{ __html: interpretationHtml }}
                            />
                          ) : (
                            <p className={cn("whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{interpretationPlain}</p>
                          )}
                        </div>
                      </details>

                      <details className="rounded-xl border border-slate-200 bg-[#F8FAFC]">
                        <summary className={cn("cursor-pointer list-none text-slate-800", detailsSummaryClass(dense))}>Conducta</summary>
                        <div className="border-t border-slate-200 px-3 py-2">
                          <p className={cn("whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{conductText}</p>
                        </div>
                      </details>

                      <details className="rounded-xl border border-slate-200 bg-[#F8FAFC]">
                        <summary className={cn("cursor-pointer list-none text-slate-800", detailsSummaryClass(dense))}>Ajuste terapéutico</summary>
                        <div className="border-t border-slate-200 px-3 py-2">
                          <p className={cn("whitespace-pre-wrap text-slate-700", detailsContentClass(dense))}>{therapeuticText}</p>
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
