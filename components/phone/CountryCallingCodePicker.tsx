"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type CountryCallingCodeOption = {
  id: string;
  iso2: string;
  countryName: string;
  dialCode: string;
};

function iso2ToFlag(iso2: string) {
  const clean = iso2.trim().toUpperCase();
  if (clean.length !== 2) return "🏳️";
  return clean
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export default function CountryCallingCodePicker({
  options,
  valueIso2,
  onChange,
  disabled,
  loading,
  className,
  buttonClassName,
  placeholder = "Prefijo",
  searchPlaceholder = "Buscar país o prefijo"
}: {
  options: CountryCallingCodeOption[];
  valueIso2: string;
  onChange: (iso2: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((item) => item.iso2 === valueIso2) ?? null,
    [options, valueIso2]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      return (
        option.countryName.toLowerCase().includes(normalizedQuery) ||
        option.iso2.toLowerCase().includes(normalizedQuery) ||
        option.dialCode.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query]);

  const isDisabled = Boolean(disabled || loading || options.length === 0);

  return (
    <div className={cn("relative min-w-0", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (isDisabled) return;
          setOpen((prev) => !prev);
        }}
        disabled={isDisabled}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          isDisabled && "cursor-not-allowed bg-slate-100 text-slate-400",
          buttonClassName
        )}
        aria-label="Seleccionar prefijo telefónico"
      >
        {selectedOption ? (
          <span className="inline-flex min-w-0 items-center gap-2">
            <span>{iso2ToFlag(selectedOption.iso2)}</span>
            <span className="truncate">{selectedOption.dialCode}</span>
          </span>
        ) : (
          <span>{loading ? "Cargando..." : placeholder}</span>
        )}
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open && !isDisabled ? (
        <div className="absolute z-40 mt-2 w-[min(360px,92vw)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2 top-3 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.iso2);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full min-w-0 items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                  option.iso2 === valueIso2 && "bg-[#4aadf5]/15"
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span>{iso2ToFlag(option.iso2)}</span>
                  <span className="truncate font-semibold">{option.countryName}</span>
                </span>
                <span className="text-xs text-slate-500">{option.dialCode}</span>
              </button>
            ))}
            {!filteredOptions.length ? <p className="px-2 py-3 text-xs text-slate-500">Sin resultados.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
