"use client";

import { useEffect, useMemo, useState } from "react";
import { InventoryFilters, countActiveFilters, emptyInventoryFilters, pruneSubcategorias } from "@/lib/inventory/filters";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { cn, toTitleCase } from "@/lib/utils";

type Option = { value: string; label: string };

type SearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: InventoryFilters;
  onApplyFilters: (filters: InventoryFilters) => void;
  onClear: () => void;
  options: {
    categorias: Option[];
    subcategorias: Option[];
    areas: Option[];
    proveedores: Option[];
    estados: Option[];
  };
  counts: { showing: number; total: number };
  subcategoriaToCategoria?: Record<string, string>;
};

export function SearchFilterBar({
  search,
  onSearchChange,
  filters,
  onApplyFilters,
  onClear,
  options,
  counts,
  subcategoriaToCategoria
}: SearchFilterBarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InventoryFilters>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters, open]);

  const labelMap = useMemo(
    () => ({
      categorias: options.categorias.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {}),
      subcategorias: options.subcategorias.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {}),
      areas: options.areas.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {}),
      proveedores: options.proveedores.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {}),
      estados: options.estados.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {})
    }),
    [options]
  );

  const filteredSubcategorias = useMemo(() => {
    if (!subcategoriaToCategoria || draft.categorias.length === 0) return options.subcategorias;
    return options.subcategorias.filter((opt) => draft.categorias.includes(subcategoriaToCategoria[opt.value]));
  }, [draft.categorias, options.subcategorias, subcategoriaToCategoria]);

  const applyFiltersWithPrune = (next: InventoryFilters) => {
    const pruned = subcategoriaToCategoria
      ? { ...next, subcategorias: pruneSubcategorias(next.subcategorias, next.categorias, subcategoriaToCategoria) }
      : next;
    onApplyFilters(pruned);
    setDraft(pruned);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
    setDraft(emptyInventoryFilters);
  };

  const handleDraftChange = (key: keyof InventoryFilters, value: string[]) => {
    const next = { ...draft, [key]: value };
    if (key === "categorias" && subcategoriaToCategoria) {
      next.subcategorias = pruneSubcategorias(next.subcategorias, value, subcategoriaToCategoria);
    }
    setDraft(next);
  };

  const handleApply = () => {
    applyFiltersWithPrune(draft);
    setOpen(false);
  };

  const handleRemoveChip = (key: keyof InventoryFilters, value: string) => {
    const updated = { ...filters, [key]: filters[key].filter((v) => v !== value) };
    applyFiltersWithPrune(updated);
  };

  const chips: Array<{ key: string; label: string; filterKey: keyof InventoryFilters; value: string }> = [];
  filters.categorias.forEach((id) =>
    chips.push({ key: `cat-${id}`, filterKey: "categorias", value: id, label: `Categoría: ${toTitleCase(labelMap.categorias[id] || id)}` })
  );
  filters.subcategorias.forEach((id) =>
    chips.push({
      key: `sub-${id}`,
      filterKey: "subcategorias",
      value: id,
      label: `Subcategoría: ${toTitleCase(labelMap.subcategorias[id] || id)}`
    })
  );
  filters.areas.forEach((id) =>
    chips.push({ key: `area-${id}`, filterKey: "areas", value: id, label: `Área: ${toTitleCase(labelMap.areas[id] || id)}` })
  );
  filters.proveedores.forEach((id) =>
    chips.push({
      key: `prov-${id}`,
      filterKey: "proveedores",
      value: id,
      label: `Proveedor: ${toTitleCase(labelMap.proveedores[id] || id)}`
    })
  );
  filters.estados.forEach((id) =>
    chips.push({ key: `estado-${id}`, filterKey: "estados", value: id, label: `Estado: ${toTitleCase(labelMap.estados[id] || id)}` })
  );

  const activeFilters = countActiveFilters(filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10">
          <span className="text-lg">🔎</span>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, código, SKU, proveedor…"
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300",
              open && "border-brand-primary text-brand-primary"
            )}
          >
            Filtros
            {activeFilters > 0 && (
              <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-primary">{activeFilters}</span>
            )}
          </button>
          <button
            onClick={handleClear}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.length === 0 && <span className="text-sm text-slate-400">Sin filtros activos</span>}
        {chips.map((chip) => (
          <Chip key={chip.key} label={chip.label} onRemove={() => handleRemoveChip(chip.filterKey, chip.value)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>Mostrando {counts.showing} de {counts.total}</span>
        <span>Filtros activos: {activeFilters}</span>
      </div>

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-inner">
          <div className="grid gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Categoría"
              options={options.categorias}
              value={draft.categorias}
              onChange={(val) => handleDraftChange("categorias", Array.isArray(val) ? val : val ? [val] : [])}
              multiple
              placeholder="Todas las categorías"
            />
            <SearchableSelect
              label="Subcategoría"
              options={filteredSubcategorias}
              value={draft.subcategorias}
              onChange={(val) => handleDraftChange("subcategorias", Array.isArray(val) ? val : val ? [val] : [])}
              multiple
              placeholder="Todas las subcategorías"
            />
            <SearchableSelect
              label="Área"
              options={options.areas}
              value={draft.areas}
              onChange={(val) => handleDraftChange("areas", Array.isArray(val) ? val : val ? [val] : [])}
              multiple
              placeholder="Todas las áreas"
            />
            <SearchableSelect
              label="Proveedor"
              options={options.proveedores}
              value={draft.proveedores}
              onChange={(val) => handleDraftChange("proveedores", Array.isArray(val) ? val : val ? [val] : [])}
              multiple
              placeholder="Todos los proveedores"
            />
            <SearchableSelect
              label="Estado"
              options={options.estados}
              value={draft.estados}
              onChange={(val) => handleDraftChange("estados", Array.isArray(val) ? val : val ? [val] : [])}
              multiple
              placeholder="Todos los estados"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={handleApply}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:shadow-md"
            >
              Aplicar
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
      {label}
      <button
        onClick={onRemove}
        className="rounded-full bg-slate-100 px-2 py-[2px] text-xs font-semibold text-slate-500 hover:bg-slate-200"
      >
        ✕
      </button>
    </span>
  );
}
