"use client";

import { useMemo, useState } from "react";
import { ClientProfileType } from "@prisma/client";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type MappingField = {
  key: string;
  label: string;
  required: boolean;
};

type AnalyzeResponse = {
  ok: boolean;
  requiresMapping: boolean;
  availableColumns: string[];
  fields: MappingField[];
  suggestedMapping: Record<string, string | null>;
  previewRows: number;
};

type ProcessResponse = {
  ok: boolean;
  summary: {
    totalRows: number;
    processedRows: number;
    created: number;
    updated: number;
    errors: number;
  };
  errorsCsv: string;
  errorsPreview: Array<{ row: number; message: string }>;
};

type ApiErrorResponse = {
  ok?: boolean;
  error?: string;
};

export default function ClientCsvImportButton({ type }: { type: ClientProfileType }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyze, setAnalyze] = useState<AnalyzeResponse | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(Object.create(null));

  const templateHref = `/api/admin/clientes/import/template?type=${type}`;

  const label = useMemo(() => {
    if (type === ClientProfileType.PERSON) return "Importar personas";
    if (type === ClientProfileType.COMPANY) return "Importar empresas";
    if (type === ClientProfileType.INSURER) return "Importar aseguradoras";
    return "Importar instituciones";
  }, [type]);

  async function analyzeFile() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("mode", "analyze");

      const response = await fetch("/api/admin/clientes/import/csv", {
        method: "POST",
        body: form
      });
      const json = (await response.json()) as AnalyzeResponse;
      if (!response.ok || !json.ok) {
        const maybeError = json as AnalyzeResponse & ApiErrorResponse;
        throw new Error(maybeError.error || "No se pudo analizar el archivo.");
      }

      setAnalyze(json);
      const nextMapping: Record<string, string> = Object.create(null);
      Object.entries(json.suggestedMapping || {}).forEach(([field, column]) => {
        if (column) nextMapping[field] = column;
      });
      setMapping(nextMapping);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo analizar el archivo.");
    } finally {
      setLoading(false);
    }
  }

  async function processFile() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("mode", "process");
      if (analyze?.requiresMapping) {
        form.append("mapping", JSON.stringify(mapping));
      }

      const response = await fetch("/api/admin/clientes/import/csv", {
        method: "POST",
        body: form
      });
      const json = (await response.json()) as ProcessResponse;
      if (!response.ok || !json.ok) {
        const maybeError = json as ProcessResponse & ApiErrorResponse;
        throw new Error(maybeError.error || "No se pudo procesar el archivo.");
      }
      setResult(json);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo procesar el archivo.");
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setFile(null);
    setError(null);
    setAnalyze(null);
    setResult(null);
    setMapping(Object.create(null));
  }

  function downloadErrorsCsv() {
    if (!result?.errorsCsv) return;
    const blob = new Blob([result.errorsCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `errores-importacion-${type.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
      >
        <Upload size={16} />
        Importar
      </button>

      <Modal open={open} onClose={closeModal} title={label} subtitle="CSV/Excel tolerante con validación por fila" className="max-w-4xl">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Flujo</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Descargar plantilla CSV.</li>
              <li>Subir archivo y analizar columnas.</li>
              <li>Mapear columnas si no coinciden.</li>
              <li>Procesar y descargar reporte de errores.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-600">Tip Excel (Guatemala/ES): la plantilla usa separador `;` para abrir columnas automáticamente.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={templateHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <FileSpreadsheet size={16} />
              Descargar plantilla CSV
            </a>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={analyzeFile}
              disabled={!file || loading}
              className={cn(
                "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700",
                (!file || loading) && "cursor-not-allowed opacity-60"
              )}
            >
              {loading ? "Analizando..." : "Analizar archivo"}
            </button>
          </div>

          {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          {analyze && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">Filas detectadas: <span className="font-semibold">{analyze.previewRows}</span></p>

              {analyze.requiresMapping ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {analyze.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500">
                        {field.label} {field.required ? "*" : "(opcional)"}
                      </p>
                      <select
                        value={mapping[field.key] ?? ""}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <option value="">Sin asignar</option>
                        {analyze.availableColumns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-700">Mapeo automático listo. Puedes procesar directamente.</p>
              )}

              <button
                type="button"
                onClick={processFile}
                disabled={loading || !file}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white",
                  (loading || !file) && "cursor-not-allowed opacity-60"
                )}
              >
                {loading ? "Procesando..." : "Procesar importación"}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-800">
                Total: <span className="font-semibold">{result.summary.totalRows}</span> · Procesadas: <span className="font-semibold">{result.summary.processedRows}</span> · Creadas: <span className="font-semibold text-emerald-700">{result.summary.created}</span> · Actualizadas: <span className="font-semibold text-[#2e75ba]">{result.summary.updated}</span> · Errores: <span className="font-semibold text-rose-700">{result.summary.errors}</span>
              </p>

              {result.summary.errors > 0 && (
                <>
                  <button
                    type="button"
                    onClick={downloadErrorsCsv}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Descargar reporte de errores (CSV)
                  </button>

                  <div className="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Fila</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.errorsPreview.map((item, index) => (
                          <tr key={`${item.row}-${index}`}>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.row}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
