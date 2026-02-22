"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { productosMock } from "@/lib/mock/productos";
import type { Producto } from "@/lib/types/inventario";
import type { EncounterPrescriptionItem } from "./types";

function fieldClasses(readOnly: boolean) {
  return cn(
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    readOnly ? "bg-slate-50" : "bg-white focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
  );
}

function isMedication(product: Producto) {
  return product.codigo.toUpperCase().startsWith("MED-") || product.nombre.toLowerCase().includes("mg");
}

function stableKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 28);
}

export default function PrescriptionPanel({
  items,
  onChange,
  readOnly,
  onToast
}: {
  items: EncounterPrescriptionItem[];
  onChange: (next: EncounterPrescriptionItem[]) => void;
  readOnly: boolean;
  onToast: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [query, setQuery] = useState("");
  const [freeName, setFreeName] = useState("");
  const [freeDose, setFreeDose] = useState("");
  const [freeFrequency, setFreeFrequency] = useState("");
  const [freeDuration, setFreeDuration] = useState("");

  const catalog = useMemo(() => productosMock.filter(isMedication), []);
  const selectedByProductId = useMemo(() => new Set(items.map((item) => item.productId).filter(Boolean)), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((product) => `${product.nombre} ${product.codigo}`.toLowerCase().includes(q));
  }, [catalog, query]);

  const addFromInventory = (product: Producto) => {
    if (readOnly) return;
    if (selectedByProductId.has(product.id)) {
      onToast("Este medicamento ya está agregado.", "info");
      return;
    }
    onChange([
      {
        id: `rx-${product.id}`,
        source: "inventory",
        productId: product.id,
        name: product.nombre,
        quantity: 1,
        instructions: "",
        dose: "",
        frequency: "",
        duration: "",
        notes: null
      },
      ...items
    ]);
  };

  const addFreeMedication = () => {
    if (readOnly) return;
    const name = freeName.trim();
    if (!name) {
      onToast("Ingresa el nombre del medicamento.", "error");
      return;
    }
    onChange([
      {
        id: `rx-free-${stableKey(name) || "item"}-${items.length + 1}`,
        source: "free",
        productId: null,
        name,
        quantity: 1,
        instructions: "",
        dose: freeDose.trim(),
        frequency: freeFrequency.trim(),
        duration: freeDuration.trim(),
        notes: "Entrada libre"
      },
      ...items
    ]);
    setFreeName("");
    setFreeDose("");
    setFreeFrequency("");
    setFreeDuration("");
  };

  const updateItem = (id: string, patch: Partial<EncounterPrescriptionItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    if (readOnly) return;
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Receta médica</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Inventario ERP + entrada manual libre</p>
        <p className="mt-2 text-xs text-slate-600">
          TODO(receta-output): preparar salida para impresión, PDF y firma médica electrónica cuando esté disponible backend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Inventario clínico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={fieldClasses(false)}
              placeholder="Buscar medicamento..."
            />

            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-600">Sin coincidencias en inventario.</div>
              ) : (
                filtered.map((product) => (
                  <div key={product.id} className="flex items-start justify-between gap-2 border-b border-slate-100 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {product.codigo} · Stock {product.stockActual}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFromInventory(product)}
                      disabled={readOnly || selectedByProductId.has(product.id)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition",
                        readOnly || selectedByProductId.has(product.id)
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      )}
                    >
                      {selectedByProductId.has(product.id) ? "Agregado" : "Agregar"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Si no hay inventario, usa entrada libre para no bloquear la atención.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Medicamentos prescritos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                  Sin medicamentos agregados.
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.source === "inventory" ? "Inventario ERP" : "Entrada libre"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={readOnly}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                          readOnly
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                            : "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                        )}
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Dosis</label>
                        <input
                          value={item.dose}
                          onChange={(e) => updateItem(item.id, { dose: e.target.value })}
                          disabled={readOnly}
                          className={fieldClasses(readOnly)}
                          placeholder="Ej. 500 mg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Frecuencia</label>
                        <input
                          value={item.frequency}
                          onChange={(e) => updateItem(item.id, { frequency: e.target.value })}
                          disabled={readOnly}
                          className={fieldClasses(readOnly)}
                          placeholder="Ej. cada 8 horas"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Duración</label>
                        <input
                          value={item.duration}
                          onChange={(e) => updateItem(item.id, { duration: e.target.value })}
                          disabled={readOnly}
                          className={fieldClasses(readOnly)}
                          placeholder="Ej. 5 días"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Entrada manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Medicamento</label>
                <input
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                  disabled={readOnly}
                  className={fieldClasses(readOnly)}
                  placeholder="Nombre libre del medicamento"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={freeDose}
                  onChange={(e) => setFreeDose(e.target.value)}
                  disabled={readOnly}
                  className={fieldClasses(readOnly)}
                  placeholder="Dosis"
                />
                <input
                  value={freeFrequency}
                  onChange={(e) => setFreeFrequency(e.target.value)}
                  disabled={readOnly}
                  className={fieldClasses(readOnly)}
                  placeholder="Frecuencia"
                />
                <input
                  value={freeDuration}
                  onChange={(e) => setFreeDuration(e.target.value)}
                  disabled={readOnly}
                  className={fieldClasses(readOnly)}
                  placeholder="Duración"
                />
              </div>

              <button
                type="button"
                onClick={addFreeMedication}
                disabled={readOnly}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                  readOnly ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
                )}
              >
                Agregar medicamento libre
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
