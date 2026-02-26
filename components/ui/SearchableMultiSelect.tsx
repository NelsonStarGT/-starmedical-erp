"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

export default function SearchableMultiSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  excludeIds
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: ReadonlyArray<Option>;
  disabled?: boolean;
  placeholder?: string;
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(value), [value]);
  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => {
      if (excluded.has(option.id)) return false;
      if (!needle) return true;
      return option.label.toLowerCase().includes(needle) || option.id.toLowerCase().includes(needle);
    });
  }, [excluded, options, query]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.id)),
    [options, selectedSet]
  );

  return (
    <div className="relative space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className={cn(!selectedOptions.length && "text-slate-400")}>
          {selectedOptions.length ? `${selectedOptions.length} seleccionadas` : placeholder ?? "Seleccionar..."}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <span key={option.id} className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c]/10 px-2 py-1 text-xs text-[#2e75ba]">
              {option.label}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== option.id))}
                className="rounded-full p-0.5 text-[#2e75ba] hover:bg-[#4aa59c]/20"
                disabled={disabled}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar actividad..."
                className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-xs text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {visibleOptions.map((option) => {
              const checked = selectedSet.has(option.id);
              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC]",
                    checked && "bg-[#4aa59c]/10 text-[#2e75ba]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(value.filter((id) => id !== option.id));
                      } else {
                        onChange([...value, option.id]);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  />
                  {option.label}
                </label>
              );
            })}
            {!visibleOptions.length ? <p className="px-2 py-2 text-xs text-slate-500">Sin resultados.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
