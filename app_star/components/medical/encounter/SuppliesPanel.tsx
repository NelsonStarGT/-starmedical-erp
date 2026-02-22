"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { EncounterSupplyItem } from "@/components/medical/encounter/types";
import { searchMedicalInventory, type EncounterSupplyPostPayload, type MedicalInventorySearchItem } from "@/lib/medical/suppliesClient";

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
  );
}

function gtCurrency(value: number) {
  return `Q${value.toFixed(2)}`;
}

type ManualDraft = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: string;
  notes: string;
};

const INITIAL_MANUAL_DRAFT: ManualDraft = {
  name: "",
  quantity: 1,
  unit: "",
  unitPrice: "",
  notes: ""
};

export default function SuppliesPanel({
  items,
  readOnly,
  loading = false,
  saving = false,
  onAddSupply,
  onRemoveSupply,
  onToast
}: {
  items: EncounterSupplyItem[];
  readOnly: boolean;
  loading?: boolean;
  saving?: boolean;
  onAddSupply?: (payload: EncounterSupplyPostPayload) => Promise<boolean> | boolean;
  onRemoveSupply?: (supplyId: string) => Promise<boolean> | boolean;
  onToast?: (message: string, kind: "success" | "error" | "info") => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<MedicalInventorySearchItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<MedicalInventorySearchItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addingInventory, setAddingInventory] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualDraft>(INITIAL_MANUAL_DRAFT);
  const [savingManual, setSavingManual] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedItems = useMemo(
    () => items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [items]
  );

  useEffect(() => {
    if (selectedOption) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    let cancelled = false;

    const normalized = query.trim();
    if (!normalized) {
      setOptions([]);
      setDropdownOpen(false);
      setActiveIndex(0);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const found = await searchMedicalInventory(normalized);
          if (cancelled) return;
          setOptions(found);
          setDropdownOpen(true);
          setActiveIndex(0);
        } catch {
          if (!cancelled) {
            setOptions([]);
            setDropdownOpen(true);
            onToast?.("No se pudo consultar inventario.", "error");
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      };
      void run();
    }, 250);

    return () => {
      cancelled = true;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [onToast, query, selectedOption]);

  const selectOption = (option: MedicalInventorySearchItem) => {
    setSelectedOption(option);
    setSelectedQuantity(1);
    setQuery(option.name);
    setOptions([]);
    setDropdownOpen(false);
    setActiveIndex(0);
  };

  const addSelectedInventorySupply = async () => {
    if (!selectedOption || !onAddSupply || addingInventory) return;
    if (readOnly) {
      onToast?.("Consulta cerrada: no se pueden modificar insumos.", "error");
      return;
    }
    const quantity = Math.max(1, Math.round(selectedQuantity || 1));
    setAddingInventory(true);
    try {
      const saved = await onAddSupply({
        source: "inventory",
        inventoryItemId: selectedOption.id,
        sku: selectedOption.sku,
        name: selectedOption.name,
        unit: selectedOption.unit,
        quantity,
        unitPrice: selectedOption.unitPrice,
        notes: null
      });
      if (saved === false) return;
      setSelectedOption(null);
      setSelectedQuantity(1);
      setQuery("");
      setOptions([]);
      setDropdownOpen(false);
    } finally {
      setAddingInventory(false);
    }
  };

  const openManualModal = () => {
    if (readOnly) {
      onToast?.("Consulta cerrada: no se pueden modificar insumos.", "error");
      return;
    }
    setManualDraft(INITIAL_MANUAL_DRAFT);
    setManualOpen(true);
  };

  const saveManualSupply = async () => {
    if (!onAddSupply || savingManual) return;
    if (readOnly) {
      onToast?.("Consulta cerrada: no se pueden modificar insumos.", "error");
      return;
    }
    const name = manualDraft.name.trim();
    const quantity = Math.max(1, Math.round(Number(manualDraft.quantity) || 0));
    if (!name) {
      onToast?.("El nombre del insumo es obligatorio.", "error");
      return;
    }
    if (quantity < 1) {
      onToast?.("La cantidad debe ser mayor o igual a 1.", "error");
      return;
    }
    const unitPrice = manualDraft.unitPrice.trim() ? Number(manualDraft.unitPrice) : null;
    if (unitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      onToast?.("El precio debe ser numérico y no negativo.", "error");
      return;
    }

    setSavingManual(true);
    try {
      const saved = await onAddSupply({
        source: "manual",
        inventoryItemId: null,
        sku: null,
        name,
        unit: manualDraft.unit.trim() || null,
        quantity,
        unitPrice,
        notes: manualDraft.notes.trim() || null
      });
      if (saved === false) return;
      setManualOpen(false);
    } finally {
      setSavingManual(false);
    }
  };

  const removeSupply = async (supplyId: string) => {
    if (!onRemoveSupply || removingId || readOnly) return;
    setRemovingId(supplyId);
    try {
      const removed = await onRemoveSupply(supplyId);
      if (removed === false) return;
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Insumos utilizados</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">Control de consumo clínico</h3>
        <p className="mt-1 text-sm text-slate-600">Esto se cobra adicionalmente y descuenta inventario.</p>
        {readOnly ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Consulta cerrada: no se pueden modificar insumos.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Agregar insumo</p>
          <button
            type="button"
            onClick={openManualModal}
            disabled={readOnly}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
              readOnly ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
            )}
          >
            <PlusIcon className="h-4 w-4" />
            Agregar manual
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedOption(null);
              }}
              onFocus={() => {
                if (options.length > 0) setDropdownOpen(true);
              }}
              onKeyDown={(event) => {
                if (!dropdownOpen || options.length === 0) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % options.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const option = options[activeIndex];
                  if (option) selectOption(option);
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDropdownOpen(false);
                }
              }}
              disabled={readOnly}
              placeholder="Buscar en inventario: gasa, guantes, jeringa..."
              className={cn(fieldClasses(readOnly), "pl-10")}
            />

            {dropdownOpen ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {searching ? (
                  <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
                ) : options.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</p>
                ) : (
                  options.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50",
                        index === activeIndex && "bg-[#f2f8ff]"
                      )}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{option.name}</p>
                        <p className="text-xs text-slate-500">
                          {option.sku || "Sin SKU"} · {option.unit || "unidad"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {option.unitPrice === null ? "Sin precio" : gtCurrency(option.unitPrice)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          {selectedOption ? (
            <div className="rounded-xl border border-[#4aadf5]/30 bg-[#f2f8ff] px-3 py-2">
              <p className="text-sm font-semibold text-[#2e75ba]">{selectedOption.name}</p>
              <p className="text-xs text-slate-600">
                {selectedOption.sku || "Sin SKU"} · {selectedOption.unit || "unidad"} ·{" "}
                {selectedOption.unitPrice === null ? "Sin precio" : gtCurrency(selectedOption.unitPrice)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={selectedQuantity}
                    onChange={(event) => setSelectedQuantity(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                    disabled={readOnly || addingInventory}
                    className={cn(fieldClasses(readOnly || addingInventory), "w-24")}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void addSelectedInventorySupply()}
                  disabled={readOnly || addingInventory}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                    readOnly || addingInventory ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
                  )}
                >
                  {addingInventory ? "Agregando..." : "Agregar insumo"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOption(null);
                    setSelectedQuantity(1);
                    setQuery("");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Insumos registrados</p>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Cargando insumos...</p>
        ) : orderedItems.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            Sin insumos registrados en esta consulta.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {orderedItems.map((item) => {
              const lineTotal = item.unitPrice === null ? null : item.unitPrice * item.quantity;
              return (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-600">
                        {item.source === "inventory" ? "Inventario" : "Manual"} · Cantidad: {item.quantity} {item.unit || "unidad"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Precio unitario: {item.unitPrice === null ? "—" : gtCurrency(item.unitPrice)} · Total:{" "}
                        {lineTotal === null ? "—" : gtCurrency(lineTotal)}
                      </p>
                      {item.notes ? <p className="text-xs text-slate-500">Nota: {item.notes}</p> : null}
                      <p className="text-[11px] text-slate-500">
                        {new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))} ·{" "}
                        {item.createdByName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeSupply(item.id)}
                      disabled={readOnly || saving || removingId === item.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white",
                        readOnly || saving || removingId === item.id ? "cursor-not-allowed bg-slate-300" : "bg-rose-600 hover:bg-rose-700"
                      )}
                      aria-label={`Quitar insumo ${item.name}`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Agregar insumo manual"
        subtitle="Consumo clínico manual"
        className="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setManualOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void saveManualSupply()}
              disabled={savingManual}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                savingManual ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
              )}
            >
              {savingManual ? "Guardando..." : "Guardar insumo"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">Nombre</span>
            <input
              value={manualDraft.name}
              onChange={(event) => setManualDraft((prev) => ({ ...prev, name: event.target.value }))}
              className={fieldClasses(false)}
              placeholder="Ej: Catéter descartable"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Cantidad</span>
              <input
                type="number"
                min={1}
                step={1}
                value={manualDraft.quantity}
                onChange={(event) =>
                  setManualDraft((prev) => ({ ...prev, quantity: Math.max(1, Math.round(Number(event.target.value) || 1)) }))
                }
                className={fieldClasses(false)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Unidad</span>
              <input
                value={manualDraft.unit}
                onChange={(event) => setManualDraft((prev) => ({ ...prev, unit: event.target.value }))}
                className={fieldClasses(false)}
                placeholder="unidad / par / ml"
              />
            </label>
          </div>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">Precio unitario (opcional)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={manualDraft.unitPrice}
              onChange={(event) => setManualDraft((prev) => ({ ...prev, unitPrice: event.target.value }))}
              className={fieldClasses(false)}
              placeholder="0.00"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-600">Notas</span>
            <textarea
              value={manualDraft.notes}
              onChange={(event) => setManualDraft((prev) => ({ ...prev, notes: event.target.value }))}
              className={cn(fieldClasses(false), "min-h-[80px] resize-y")}
              placeholder="Detalle clínico del consumo"
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}
