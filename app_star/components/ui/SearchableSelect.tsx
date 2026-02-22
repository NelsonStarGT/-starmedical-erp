"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, toTitleCase } from "@/lib/utils";

type Option = { value: string; label: string };

type SearchableSelectProps = {
  label?: string;
  placeholder?: string;
  options: Option[];
  value: string[] | string | null;
  onChange: (value: string[] | string | null) => void;
  multiple?: boolean;
  includeAllOption?: boolean;
  maxHeight?: number;
  className?: string;
};

const ALL_VALUE = "__all__";

export function SearchableSelect({
  label,
  placeholder = "Selecciona…",
  options,
  value,
  onChange,
  multiple = false,
  includeAllOption = true,
  maxHeight = 240,
  className
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedValue = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : value ? [value] : [];
    if (Array.isArray(value)) return value[0] || null;
    return value;
  }, [multiple, value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  const handleSelect = (next: string) => {
    if (multiple) {
      if (next === ALL_VALUE) {
        onChange([]);
        return;
      }
      const current = normalizedValue as string[];
      const exists = current.includes(next);
      const updated = exists ? current.filter((v) => v !== next) : [...current, next];
      onChange(updated);
      return;
    }
    if (next === ALL_VALUE) {
      onChange(null);
      setOpen(false);
      return;
    }
    onChange(next);
    setOpen(false);
  };

  const selectedLabels = useMemo(() => {
    if (multiple) {
      const current = normalizedValue as string[];
      if (current.length === 0) return [];
      const map = options.reduce<Record<string, string>>((acc, opt) => ({ ...acc, [opt.value]: opt.label }), {});
      return current.map((v) => map[v]).filter(Boolean);
    }
    if (!normalizedValue) return [];
    const found = options.find((opt) => opt.value === normalizedValue);
    return found ? [found.label] : [];
  }, [multiple, normalizedValue, options]);

  return (
    <div className={cn("relative w-full text-sm", className)} ref={containerRef}>
      {label && <div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          open && "border-brand-primary"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedLabels.length > 0 ? (
            selectedLabels.slice(0, 2).map((val) => (
              <span
                key={val}
                className="rounded-full bg-slate-100 px-2 py-1 text-[13px] font-medium text-slate-700"
              >
                {toTitleCase(val)}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-slate-400">{placeholder}</span>
          )}
          {selectedLabels.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[13px] font-medium text-slate-600">
              +{selectedLabels.length - 2}
            </span>
          )}
        </div>
        <span className="text-slate-400">⌄</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="px-3 pb-1 pt-3">
            <input
              ref={inputRef}
              placeholder="Escribe para filtrar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
            />
          </div>
          <div className="overflow-auto px-1 pb-3 pt-1" style={{ maxHeight }}>
            {includeAllOption && (
              <OptionRow
                label="Todos"
                selected={multiple ? (normalizedValue as string[]).length === 0 : !normalizedValue}
                onSelect={() => handleSelect(ALL_VALUE)}
              />
            )}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-[13px] text-slate-400">Sin resultados</div>
            )}
            {filteredOptions.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                selected={multiple ? (normalizedValue as string[]).includes(opt.value) : normalizedValue === opt.value}
                onSelect={() => handleSelect(opt.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionRow({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] transition hover:bg-slate-50",
        selected && "bg-slate-100 text-slate-900"
      )}
    >
      <span>{toTitleCase(label)}</span>
      {selected && <span className="text-brand-primary">✓</span>}
    </button>
  );
}
