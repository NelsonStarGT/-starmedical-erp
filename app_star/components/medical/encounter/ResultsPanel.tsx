"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { EncounterResult, EncounterResultType } from "./types";

type ViewerMode = "pdf" | "images" | "values";

function statusLabel(status: EncounterResult["status"]) {
  switch (status) {
    case "ready":
      return "Listo";
    case "in_progress":
      return "En proceso";
    default:
      return "Pendiente";
  }
}

function statusClasses(status: EncounterResult["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function typeLabel(type: EncounterResultType) {
  if (type === "LAB") return "Laboratorio";
  if (type === "RX") return "Rayos X";
  return "Ultrasonido";
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pickDefaultViewer(result: EncounterResult | null): ViewerMode | null {
  if (!result) return null;
  if (result.pdfUrl) return "pdf";
  if (result.imageUrls.length > 0) return "images";
  if (result.values.length > 0) return "values";
  return null;
}

export default function ResultsPanel({
  patientName,
  results,
  initialSelectedResultId,
  onInterpretResult
}: {
  patientName: string;
  results: EncounterResult[];
  initialSelectedResultId?: string | null;
  onInterpretResult: (result: EncounterResult) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | EncounterResultType>("all");
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const filtered = useMemo(() => {
    const base = typeFilter === "all" ? results : results.filter((result) => result.type === typeFilter);
    return base.slice().sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));
  }, [results, typeFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedResultId(null);
      return;
    }
    if (initialSelectedResultId) {
      const byId = filtered.find((result) => result.id === initialSelectedResultId);
      if (byId) {
        setSelectedResultId(byId.id);
        return;
      }
    }
    if (!selectedResultId || !filtered.some((result) => result.id === selectedResultId)) {
      setSelectedResultId(filtered[0].id);
    }
  }, [filtered, initialSelectedResultId, selectedResultId]);

  const selectedResult = useMemo(
    () => filtered.find((result) => result.id === selectedResultId) || null,
    [filtered, selectedResultId]
  );

  useEffect(() => {
    setViewerMode(pickDefaultViewer(selectedResult));
    setImageIndex(0);
  }, [selectedResult]);

  const selectedImage = selectedResult?.imageUrls[imageIndex] || null;
  const canInterpret = Boolean(selectedResult && selectedResult.status === "ready");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Resultados clínicos</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{patientName}</p>
        <p className="mt-2 text-xs text-slate-600">
          Selecciona un estudio, revisa PDF/imágenes/valores estructurados y luego interpreta el resultado en reconsulta.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "Todos" },
            { key: "LAB", label: "Laboratorio" },
            { key: "RX", label: "Rayos X" },
            { key: "USG", label: "Ultrasonido" }
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTypeFilter(item.key)}
            aria-pressed={typeFilter === item.key}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              typeFilter === item.key ? "border-[#2e75ba] bg-[#2e75ba] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Estudios disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
                Sin resultados para el filtro actual.
              </div>
            ) : (
              filtered.map((result) => {
                const selected = result.id === selectedResultId;
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setSelectedResultId(result.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      selected ? "border-[#2e75ba] bg-[#f2f8ff]" : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                        <p className="text-xs text-slate-500">
                          {typeLabel(result.type)} · {formatDate(result.performedAt)}
                        </p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusClasses(result.status))}>
                        {statusLabel(result.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={cn("rounded-full border px-2 py-0.5", result.pdfUrl ? "border-slate-200 bg-white text-slate-700" : "border-slate-100 bg-slate-100 text-slate-400")}>
                        PDF
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5",
                          result.imageUrls.length > 0 ? "border-slate-200 bg-white text-slate-700" : "border-slate-100 bg-slate-100 text-slate-400"
                        )}
                      >
                        Imágenes
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5",
                          result.values.length > 0 ? "border-slate-200 bg-white text-slate-700" : "border-slate-100 bg-slate-100 text-slate-400"
                        )}
                      >
                        Valores
                      </span>
                    </div>
                  </button>
                );
              })
            )}

            <button
              type="button"
              onClick={() => selectedResult && onInterpretResult(selectedResult)}
              disabled={!canInterpret}
              className={cn(
                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                canInterpret ? "bg-[#2e75ba] hover:opacity-90" : "cursor-not-allowed bg-slate-300"
              )}
            >
              Interpretar resultado
            </button>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Visor de resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedResult ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Selecciona un resultado para iniciar análisis.
              </div>
            ) : selectedResult.status !== "ready" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-sm text-amber-900">
                Resultado aún no disponible para interpretación clínica.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{selectedResult.title}</p>
                  <p className="text-xs text-slate-500">
                    {typeLabel(selectedResult.type)} · {formatDate(selectedResult.performedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewerMode("pdf")}
                    disabled={!selectedResult.pdfUrl}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      viewerMode === "pdf"
                        ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                        : selectedResult.pdfUrl
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    Ver PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode("images")}
                    disabled={selectedResult.imageUrls.length === 0}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      viewerMode === "images"
                        ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                        : selectedResult.imageUrls.length > 0
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    Ver imágenes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerMode("values")}
                    disabled={selectedResult.values.length === 0}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      viewerMode === "values"
                        ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                        : selectedResult.values.length > 0
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    Ver valores estructurados
                  </button>
                </div>

                {viewerMode === "pdf" && selectedResult.pdfUrl ? (
                  <div className="space-y-2">
                    <div className="h-[380px] overflow-hidden rounded-xl border border-slate-200">
                      <iframe src={selectedResult.pdfUrl} title={selectedResult.title} className="h-full w-full border-0" />
                    </div>
                    <a
                      href={selectedResult.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-slate-50"
                    >
                      Abrir PDF en pestaña
                    </a>
                  </div>
                ) : null}

                {viewerMode === "images" && selectedImage ? (
                  <div className="space-y-2">
                    <div className="h-[380px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <Image
                        src={selectedImage}
                        alt={selectedResult.title}
                        width={1200}
                        height={800}
                        unoptimized
                        className="h-auto max-w-full rounded-lg border border-slate-100 bg-white"
                      />
                    </div>
                    {selectedResult.imageUrls.length > 1 ? (
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={() => setImageIndex((prev) => Math.max(0, prev - 1))}
                          disabled={imageIndex === 0}
                          className="rounded border border-slate-200 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <span>
                          Imagen {imageIndex + 1} de {selectedResult.imageUrls.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageIndex((prev) => Math.min(selectedResult.imageUrls.length - 1, prev + 1))}
                          disabled={imageIndex >= selectedResult.imageUrls.length - 1}
                          className="rounded border border-slate-200 px-2 py-1 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Siguiente
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {viewerMode === "values" && selectedResult.values.length > 0 ? (
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
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedResult.values.map((row, index) => (
                          <tr key={`${row.parameter}-${index}`}>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.parameter}</td>
                            <td className="px-3 py-2 text-slate-700">{row.value}</td>
                            <td className="px-3 py-2 text-slate-500">{row.range || "—"}</td>
                            <td className="px-3 py-2 text-slate-700">{row.flag || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {!viewerMode ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Este resultado no tiene contenido visual/estructurado disponible.
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
