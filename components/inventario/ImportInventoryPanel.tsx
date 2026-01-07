"use client";

import { useState } from "react";
import { ImportKind } from "@/lib/inventory/import";

const kinds: Array<{ id: ImportKind; label: string; description: string }> = [
  { id: "productos", label: "Productos", description: "Códigos, nombres, categorías, costos y precio base." },
  { id: "servicios", label: "Servicios", description: "Códigos, nombres, categorías, subcategoría y precio." },
  { id: "combos", label: "Combos", description: "Código, nombre, servicios y productos asociados, precio final (solo plantilla por ahora)." },
  { id: "stock", label: "Stock", description: "Stock por sucursal con ajuste auditable." },
  { id: "precios", label: "Precios", description: "Actualiza precios base con movimiento PRICE_UPDATE." },
  { id: "costos", label: "Costos", description: "Actualiza costo promedio o entradas con costo." }
];

type Props = {
  role?: string;
};

export function ImportInventoryPanel({ role = "Administrador" }: Props) {
  const [selected, setSelected] = useState<ImportKind>("productos");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canImport = role === "Administrador";
  const importDisabled = selected === "combos";

  const downloadTemplate = async () => {
    const headers: Record<string, string> = {};
    if (process.env.NEXT_PUBLIC_INVENTORY_TOKEN) headers["x-inventory-token"] = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
    const res = await fetch(`/api/inventario/plantillas/${selected}`, { headers });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected}.xlsx`;
    link.click();
  };

  const handleImport = async (apply: boolean) => {
    if (!file) {
      setError("Selecciona un archivo .xlsx");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("preview", apply ? "false" : "true");
      form.append("userId", role);
      const res = await fetch(`/api/inventario/importar/${selected}`, {
        method: "POST",
        body: form,
        headers: process.env.NEXT_PUBLIC_INVENTORY_TOKEN ? { "x-inventory-token": process.env.NEXT_PUBLIC_INVENTORY_TOKEN } : undefined
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");
      setPreview(data.result);
      setMessage(apply ? "Importación aplicada con éxito" : "Preview listo, revisa el resumen");
    } catch (err: any) {
      setError(err?.message || "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Importar inventario (.xlsx)</p>
          <p className="text-xs text-slate-500">Carga masiva con previsualización y movimientos auditables.</p>
        </div>
        <button onClick={downloadTemplate} className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
          Descargar plantilla
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k.id}
            onClick={() => setSelected(k.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              selected === k.id ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">{kinds.find((k) => k.id === selected)?.description}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleImport(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            disabled={loading || importDisabled}
          >
            Preview
          </button>
          <button
            onClick={() => handleImport(true)}
            className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            disabled={loading || !canImport || importDisabled}
          >
            Aplicar
          </button>
        </div>
      </div>
      {importDisabled && <p className="mt-2 text-xs text-amber-700">La importación de combos aún no está disponible; solo descarga la plantilla.</p>}
      {message && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {preview && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex gap-4">
            <span>Crear: <strong>{preview.created}</strong></span>
            <span>Actualizar: <strong>{preview.updated}</strong></span>
            <span>Movimientos: <strong>{preview.movements}</strong></span>
            <span>Errores: <strong>{preview.errors?.length || 0}</strong></span>
          </div>
          {preview.errors?.length > 0 && (
            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-xs">
              {preview.errors.map((e: any) => (
                <div key={`${e.row}-${e.message}`} className="border-b border-slate-100 py-1">
                  <span className="font-semibold">Fila {e.row}:</span> {e.message}
                </div>
              ))}
            </div>
          )}
          {preview.errorsCsv && (
            <button
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
              onClick={() => {
                const blob = new Blob([preview.errorsCsv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `errores_${selected}.csv`;
                link.click();
              }}
            >
              Descargar errores CSV
            </button>
          )}
        </div>
      )}
      {!canImport && <p className="mt-2 text-xs text-amber-600">Solo administradores pueden aplicar cambios.</p>}
    </div>
  );
}
