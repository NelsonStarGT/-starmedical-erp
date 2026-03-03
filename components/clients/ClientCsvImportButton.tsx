"use client";

import { useMemo, useState } from "react";
import { ClientProfileType } from "@prisma/client";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type MappingField = {
  key: string;
  label: string;
  required: boolean;
  parser?: string;
  target?: string;
};

type DuplicateConflict = {
  row: number;
  rowLabel: string;
  duplicateType: "EXACT_DUPLICATE" | "PROBABLE_DUPLICATE";
  field: "document_number" | "nit" | "phone_primary" | "email_primary";
  value: string;
  existingId: string | null;
  existingLabel: string | null;
  suggestedAction: "SKIP" | "UPDATE" | "REVIEW";
};

type AnalyzeResponse = {
  ok: boolean;
  requiresMapping: boolean;
  availableColumns: string[];
  fields: MappingField[];
  suggestedMapping: Record<string, string | null>;
  previewRows: number;
  ignoredColumns: string[];
  duplicateConflicts: DuplicateConflict[];
  duplicatesCsv: string;
};

type ProcessResponse = {
  ok: boolean;
  summary: {
    totalRows: number;
    processedRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    duplicates: number;
    linked?: number;
  };
  errorsCsv: string;
  errorsPreview: Array<{ row: number; message: string }>;
  duplicatesCsv: string;
  duplicatesPreview: DuplicateConflict[];
  dedupeMode: "skip" | "update";
  ignoredColumns: string[];
  personClientIds?: string[];
};

type ApiErrorResponse = {
  ok?: boolean;
  error?: string;
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function processBannerVariant(result: ProcessResponse | null) {
  if (!result) return null;
  const loaded = result.summary.created + result.summary.updated;

  if (loaded === 0 && result.summary.errors > 0) {
    return {
      tone: "error" as const,
      title: "No se cargo ningun registro",
      body: "Revisa el reporte de errores y duplicados antes de reintentar."
    };
  }

  if (result.summary.errors > 0 || result.summary.duplicates > 0 || result.summary.skipped > 0) {
    return {
      tone: "warning" as const,
      title: "Carga parcial",
      body: "Se procesaron filas con advertencias. Descarga los reportes para detalle."
    };
  }

  return {
    tone: "success" as const,
    title: "Carga exitosa",
    body: "La importacion termino sin errores."
  };
}

function duplicateTypeLabel(value: DuplicateConflict["duplicateType"]) {
  return value === "EXACT_DUPLICATE" ? "Duplicado exacto" : "Duplicado probable";
}

function fieldLabel(value: DuplicateConflict["field"]) {
  if (value === "document_number") return "Documento";
  if (value === "nit") return "NIT";
  if (value === "phone_primary") return "Telefono";
  return "Email";
}

export default function ClientCsvImportButton({
  type,
  canExportTemplate,
  canAnalyze,
  canProcess
}: {
  type: ClientProfileType;
  canExportTemplate: boolean;
  canAnalyze: boolean;
  canProcess: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyze, setAnalyze] = useState<AnalyzeResponse | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(Object.create(null));

  const templateCsvHref = `/api/admin/clientes/import/template?type=${type}&format=csv`;
  const templateXlsxHref = `/api/admin/clientes/import/template?type=${type}&format=xlsx`;

  const label = useMemo(() => {
    if (type === ClientProfileType.PERSON) return "Importar personas";
    if (type === ClientProfileType.COMPANY) return "Importar empresas";
    if (type === ClientProfileType.INSURER) return "Importar aseguradoras";
    return "Importar instituciones";
  }, [type]);

  const blocked = !canAnalyze && !canProcess;

  async function analyzeFile() {
    if (!file || !canAnalyze) return;
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
    if (!file || !canProcess) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("mode", "process");
      form.append("dedupeMode", "skip");
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

  const banner = processBannerVariant(result);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
          blocked && "opacity-70"
        )}
      >
        <Upload size={16} />
        Importar
      </button>

      <Modal open={open} onClose={closeModal} title={label} subtitle="XLSX oficial + CSV/XLSX para importación" className="max-w-5xl">
        <div className="space-y-4">
          {blocked && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Acceso restringido: tu usuario no tiene permisos para analizar/procesar importaciones.
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Flujo enterprise</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Descargar plantilla Excel (oficial).</li>
              <li>Subir archivo CSV o XLSX.</li>
              <li>Analizar columnas y conflictos (duplicados exactos/probables).</li>
              <li>Procesar (modo seguro: duplicados exactos = SKIP).</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExportTemplate ? (
              <a
                href={templateXlsxHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#44978f]"
              >
                <FileSpreadsheet size={16} />
                Descargar plantilla Excel (oficial)
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500">
                <FileSpreadsheet size={16} />
                Plantilla Excel (sin acceso)
              </span>
            )}

            {canExportTemplate ? (
              <a
                href={templateCsvHref}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                <FileSpreadsheet size={16} />
                Descargar plantilla CSV
              </a>
            ) : null}

            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-700"
              disabled={!canAnalyze}
            />
            <button
              type="button"
              onClick={analyzeFile}
              disabled={!file || loading || !canAnalyze}
              className={cn(
                "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700",
                (!file || loading || !canAnalyze) && "cursor-not-allowed opacity-60"
              )}
            >
              {loading ? "Analizando..." : "Analizar archivo"}
            </button>
          </div>

          {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          {analyze && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-700">
                Filas detectadas: <span className="font-semibold">{analyze.previewRows}</span>
              </p>

              {analyze.ignoredColumns.length > 0 ? (
                <p className="text-xs text-amber-700">Columnas ignoradas: {analyze.ignoredColumns.join(", ")}</p>
              ) : null}

              {analyze.duplicateConflicts.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    Se detectaron {analyze.duplicateConflicts.length} conflictos de duplicados en análisis.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadCsv(analyze.duplicatesCsv, `duplicados-analisis-${type.toLowerCase()}.csv`)}
                    className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
                  >
                    Descargar duplicados (CSV)
                  </button>
                  <div className="max-h-48 overflow-auto rounded-xl border border-amber-200 bg-white">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Fila</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Registro</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Tipo</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Campo</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Valor</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {analyze.duplicateConflicts.slice(0, 50).map((item, index) => (
                          <tr key={`${item.row}-${item.field}-${index}`}>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.row}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.rowLabel}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{duplicateTypeLabel(item.duplicateType)}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{fieldLabel(item.field)}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.value}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.suggestedAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={processFile}
                  disabled={loading || !file || !canProcess}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white",
                    (loading || !file || !canProcess) && "cursor-not-allowed opacity-60"
                  )}
                >
                  {loading ? "Procesando..." : "Procesar importación"}
                </button>

                {!canProcess ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <AlertTriangle size={13} />
                    Sin permiso para procesar
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {banner ? (
                <div
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    banner.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                    banner.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
                    banner.tone === "error" && "border-rose-200 bg-rose-50 text-rose-800"
                  )}
                >
                  <p className="font-semibold">{banner.title}</p>
                  <p>{banner.body}</p>
                </div>
              ) : null}

              <p className="text-sm text-slate-800">
                Total: <span className="font-semibold">{result.summary.totalRows}</span> · Procesadas: <span className="font-semibold">{result.summary.processedRows}</span> · Creadas: <span className="font-semibold text-emerald-700">{result.summary.created}</span> · Actualizadas: <span className="font-semibold text-[#2e75ba]">{result.summary.updated}</span> · Vinculadas: <span className="font-semibold text-[#2e75ba]">{result.summary.linked ?? 0}</span> · SKIP: <span className="font-semibold text-amber-700">{result.summary.skipped}</span> · Errores: <span className="font-semibold text-rose-700">{result.summary.errors}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {result.summary.errors > 0 ? (
                  <button
                    type="button"
                    onClick={() => downloadCsv(result.errorsCsv, `errores-importacion-${type.toLowerCase()}.csv`)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Descargar errores (CSV)
                  </button>
                ) : null}
                {result.summary.duplicates > 0 ? (
                  <button
                    type="button"
                    onClick={() => downloadCsv(result.duplicatesCsv, `duplicados-importacion-${type.toLowerCase()}.csv`)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Descargar duplicados (CSV)
                  </button>
                ) : null}
              </div>

              {result.summary.duplicates > 0 ? (
                <div className="max-h-48 overflow-auto rounded-xl border border-amber-200 bg-white">
                  <table className="min-w-full divide-y divide-amber-100">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Fila</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Registro</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Campo</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Valor</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-amber-700">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {result.duplicatesPreview.map((item, index) => (
                        <tr key={`${item.row}-${item.field}-${index}`}>
                          <td className="px-3 py-2 text-sm text-slate-700">{item.row}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{item.rowLabel}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{fieldLabel(item.field)}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{item.value}</td>
                          <td className="px-3 py-2 text-sm text-slate-700">{duplicateTypeLabel(item.duplicateType)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {result.summary.errors > 0 ? (
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
              ) : null}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
