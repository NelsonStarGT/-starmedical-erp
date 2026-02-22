"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { sanitizeRichHtmlOrDash } from "@/lib/medical/sanitize";
import type { EncounterResult, EncounterResultType } from "@/components/medical/encounter/types";

type ResultsModalVariant = "default" | "chat";
type ResultsTypeFilter = "ALL" | EncounterResultType;

type ResultsModalProps = {
  open: boolean;
  onClose: () => void;
  patientName: string;
  encounterId: string;
  results: EncounterResult[];
  initialResultId?: string | null;
  onInterpretResult?: (result: EncounterResult) => void;
  onToast?: (message: string, variant?: "success" | "error" | "info") => void;
  variant?: ResultsModalVariant;
};

type ViewerMode = "pdf" | "images" | "values";

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: EncounterResult["status"]) {
  if (status === "ready") return "Listo";
  if (status === "in_progress") return "En proceso";
  return "Pendiente";
}

function statusPill(status: EncounterResult["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "in_progress") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function typeLabel(type: EncounterResultType) {
  if (type === "LAB") return "Laboratorio";
  if (type === "RX") return "Rayos X";
  return "Ultrasonido";
}

function typeDotClass(type: EncounterResultType) {
  if (type === "LAB") return "bg-[#4aa59c]";
  if (type === "RX") return "bg-[#2e75ba]";
  return "bg-[#4aadf5]";
}

function pickInitialResultId(results: EncounterResult[], initialResultId?: string | null) {
  if (results.length === 0) return null;
  if (initialResultId) {
    const exact = results.find((result) => result.id === initialResultId);
    if (exact) return exact.id;
  }
  const firstReady = results.find((result) => result.status === "ready");
  return firstReady?.id || results[0].id;
}

function pickDefaultViewer(result: EncounterResult | null): ViewerMode | null {
  if (!result) return null;
  if (result.pdfUrl) return "pdf";
  if (result.imageUrls.length > 0) return "images";
  if (result.values.length > 0) return "values";
  return null;
}

function extractPlainTextFromRichHtml(raw: string) {
  const safeHtml = sanitizeRichHtmlOrDash(raw, "—");
  const plain = safeHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain || "—";
}

function readOptionalSummary(result: EncounterResult | null) {
  if (!result) return "—";
  const extended = result as EncounterResult & {
    findings?: string | null;
    comment?: string | null;
    summary?: string | null;
    technicalComment?: string | null;
    resultPreview?: string | null;
  };

  const fromFields =
    extended.findings || extended.comment || extended.summary || extended.technicalComment || extended.resultPreview || null;
  if (typeof fromFields === "string" && fromFields.trim()) return extractPlainTextFromRichHtml(fromFields.trim());

  const flagged = result.values.filter((row) => row.flag).slice(0, 3);
  if (flagged.length > 0) {
    return flagged.map((row) => `${row.parameter}: ${row.value}${row.flag ? ` (${row.flag})` : ""}`).join(" · ");
  }

  return "—";
}

function buildCopySummary(result: EncounterResult, findings: string, viewerMode: ViewerMode | null) {
  const baseLines = [
    `Estudio: ${result.title}`,
    `ID: ${result.id}`,
    `Tipo: ${typeLabel(result.type)}`,
    `Estado: ${statusLabel(result.status)}`,
    `Fecha: ${formatDateTime(result.performedAt)}`,
    `Hallazgos: ${findings}`
  ];

  if (viewerMode === "values" && result.values.length > 0) {
    baseLines.push("Valores:");
    for (const row of result.values.slice(0, 12)) {
      baseLines.push(`- ${row.parameter}: ${row.value} | Rango: ${row.range || "—"} | Bandera: ${row.flag || "—"}`);
    }
  }

  return baseLines.join("\n");
}

export default function ResultsModal({
  open,
  onClose,
  patientName,
  encounterId,
  results,
  initialResultId = null,
  onInterpretResult,
  onToast,
  variant = "chat"
}: ResultsModalProps) {
  const router = useRouter();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResultsTypeFilter>("ALL");

  const orderedResults = useMemo(
    () => results.slice().sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1)),
    [results]
  );

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderedResults.filter((result) => {
      if (typeFilter !== "ALL" && result.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [result.id, result.title, result.type, statusLabel(result.status)].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orderedResults, search, typeFilter]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setTypeFilter("ALL");
    setSelectedResultId(pickInitialResultId(orderedResults, initialResultId));
  }, [open, orderedResults, initialResultId]);

  useEffect(() => {
    if (!open || !initialResultId) return;
    const selected = orderedResults.find((item) => item.id === initialResultId);
    if (selected) setSelectedResultId(selected.id);
  }, [initialResultId, open, orderedResults]);

  useEffect(() => {
    if (!open) return;
    if (!selectedResultId && filteredResults.length > 0) {
      setSelectedResultId(filteredResults[0].id);
    }
  }, [filteredResults, open, selectedResultId]);

  const selectedResult = useMemo(
    () => orderedResults.find((result) => result.id === selectedResultId) || null,
    [orderedResults, selectedResultId]
  );

  useEffect(() => {
    setViewerMode(pickDefaultViewer(selectedResult));
    setImageIndex(0);
  }, [selectedResult]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const selectedImage = selectedResult?.imageUrls[imageIndex] || null;
  const canInterpret = Boolean(selectedResult && selectedResult.status === "ready");
  const selectedFindings = readOptionalSummary(selectedResult);
  const selectedDate = selectedResult ? formatDateTime(selectedResult.performedAt) : "—";

  const onInterpret = () => {
    if (!selectedResult) return;
    if (onInterpretResult) {
      onInterpretResult(selectedResult);
      onClose();
      return;
    }
    const query = new URLSearchParams({
      focus: "resultados",
      resultId: selectedResult.id,
      action: "interpret"
    });
    onClose();
    router.push(`/modulo-medico/consultaM/${encodeURIComponent(encounterId)}?${query.toString()}`);
  };

  const onExport = () => {
    if (selectedResult?.pdfUrl) {
      window.open(selectedResult.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.print();
  };

  const onCopySummary = async () => {
    if (!selectedResult) return;
    const payload = buildCopySummary(selectedResult, selectedFindings, viewerMode);
    try {
      await navigator.clipboard.writeText(payload);
      onToast?.("Resumen copiado.", "success");
    } catch {
      onToast?.("No se pudo copiar el resumen.", "error");
    }
  };

  const containerTone = variant === "default" ? "border-slate-200 bg-[#F8FAFC]" : "border-[#d6efe8] bg-[#F8FAFC]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Resultados clínicos"
        className={cn("flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl", containerTone)}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Resultados clínicos</p>
              <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{patientName}</h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Encounter: <span className="font-mono">{encounterId}</span>
                {selectedResult ? ` · ${selectedDate}` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar modal"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="min-h-0 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="space-y-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por título, tipo o ID"
                  aria-label="Buscar estudio"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-[#2e75ba]"
                />

                <div className="flex flex-wrap gap-2">
                  {([
                    ["ALL", "Todos"],
                    ["LAB", "LAB"],
                    ["RX", "RX"],
                    ["USG", "USG"]
                  ] as Array<[ResultsTypeFilter, string]>).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTypeFilter(key)}
                      aria-label={`Filtrar por ${label}`}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2",
                        typeFilter === key
                          ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 h-[calc(100%-86px)] overflow-y-auto pr-1">
                <div className="space-y-2">
                  {filteredResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                      No hay estudios con ese filtro.
                    </div>
                  ) : (
                    filteredResults.map((result) => {
                      const isSelected = selectedResultId === result.id;
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setSelectedResultId(result.id)}
                          aria-label={`Seleccionar ${result.title}`}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2",
                            isSelected ? "border-[#2e75ba] bg-[#edf5ff]" : "border-slate-200 bg-white hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("h-2.5 w-2.5 rounded-full", typeDotClass(result.type))} />
                                <p className="truncate text-sm font-semibold text-slate-900">{result.title}</p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{formatDateTime(result.performedAt)}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">ID: {result.id}</p>
                            </div>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusPill(result.status))}>
                              {statusLabel(result.status)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>

            <section className="min-h-0 rounded-2xl border border-slate-200 bg-white p-3">
              {!selectedResult ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  Selecciona un estudio para ver su contenido.
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{selectedResult.title}</p>
                        <p className="text-xs text-slate-500">{typeLabel(selectedResult.type)} · {selectedDate}</p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", statusPill(selectedResult.status))}>
                        {statusLabel(selectedResult.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {([
                      ["pdf", "PDF", Boolean(selectedResult.pdfUrl)],
                      ["images", "Imágenes", selectedResult.imageUrls.length > 0],
                      ["values", "Valores", selectedResult.values.length > 0]
                    ] as Array<[ViewerMode, string, boolean]>).map(([mode, label, enabled]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewerMode(mode)}
                        disabled={!enabled}
                        aria-label={`Ver ${label}`}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2",
                          viewerMode === mode
                            ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                            : enabled
                              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    {viewerMode === "pdf" ? (
                      selectedResult.pdfUrl ? (
                        <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-200">
                          <iframe
                            src={selectedResult.pdfUrl}
                            title={`pdf-${selectedResult.id}`}
                            className="h-full min-h-[280px] w-full border-0"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          PDF no disponible.
                        </div>
                      )
                    ) : null}

                    {viewerMode === "images" ? (
                      selectedResult.imageUrls.length > 0 ? (
                        <div className="space-y-3">
                          <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                            {selectedImage ? (
                              <Image
                                src={selectedImage}
                                alt={selectedResult.title}
                                width={1200}
                                height={800}
                                unoptimized
                                className="h-auto max-w-full rounded-lg border border-slate-100 bg-white"
                              />
                            ) : null}
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {selectedResult.imageUrls.map((imageUrl, index) => (
                              <button
                                key={`img-${selectedResult.id}-${index}`}
                                type="button"
                                aria-label={`Seleccionar imagen ${index + 1}`}
                                onClick={() => setImageIndex(index)}
                                className={cn(
                                  "overflow-hidden rounded-lg border bg-slate-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2",
                                  index === imageIndex ? "border-[#2e75ba]" : "border-slate-200"
                                )}
                              >
                                <Image
                                  src={imageUrl}
                                  alt={`${selectedResult.title}-${index + 1}`}
                                  width={200}
                                  height={120}
                                  unoptimized
                                  className="h-16 w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Imágenes no disponibles.
                        </div>
                      )
                    ) : null}

                    {viewerMode === "values" ? (
                      selectedResult.values.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Parámetro</th>
                                <th className="px-3 py-2 text-left font-semibold">Valor</th>
                                <th className="px-3 py-2 text-left font-semibold">Rango</th>
                                <th className="px-3 py-2 text-left font-semibold">Bandera</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedResult.values.map((row, idx) => (
                                <tr key={`${row.parameter}-${idx}`} className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50")}>
                                  <td className="px-3 py-2 font-medium text-slate-800">{row.parameter}</td>
                                  <td className="px-3 py-2 text-slate-700">{row.value}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.range || "—"}</td>
                                  <td className="px-3 py-2 text-slate-700">{row.flag || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Valores no disponibles.
                        </div>
                      )
                    ) : null}

                    {!viewerMode ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No hay contenido clínico disponible para este estudio.
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-xl border border-[#dbe9ff] bg-[#f6faff] px-3 py-2 text-xs">
                      <p className="font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Resumen rápido</p>
                      <p className="mt-1 text-slate-700">Hallazgos / Comentario: {selectedFindings}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-600">Este análisis no modifica la consulta original hasta confirmar interpretación.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExport}
                aria-label="Exportar resultado"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2"
              >
                Exportar
              </button>
              <button
                type="button"
                onClick={onCopySummary}
                aria-label="Copiar resumen"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2"
              >
                Copiar resumen
              </button>
              <button
                type="button"
                onClick={onInterpret}
                disabled={!canInterpret}
                aria-label="Interpretar resultado"
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e75ba] focus-visible:ring-offset-2",
                  canInterpret ? "bg-[#2e75ba] hover:opacity-90" : "cursor-not-allowed bg-slate-300"
                )}
              >
                Interpretar resultado
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
