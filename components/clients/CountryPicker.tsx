"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type CountryPickerOption = {
  id: string;
  code: string;
  iso3?: string | null;
  callingCode?: string | null;
  name: string;
  isActive?: boolean;
};

const PRIORITY_ISO2 = [
  "CA",
  "US",
  "MX",
  "CO",
  "EC",
  "GT",
  "SV",
  "HN",
  "NI",
  "CR",
  "PA"
];

function iso2ToFlag(iso2: string) {
  const clean = iso2.trim().toUpperCase();
  if (clean.length !== 2) return "🏳️";
  return clean
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function sortCountries(options: CountryPickerOption[]) {
  return [...options].sort((a, b) => {
    const pa = PRIORITY_ISO2.indexOf(a.code.toUpperCase());
    const pb = PRIORITY_ISO2.indexOf(b.code.toUpperCase());
    const inPriorityA = pa !== -1;
    const inPriorityB = pb !== -1;
    if (inPriorityA && inPriorityB) return pa - pb;
    if (inPriorityA) return -1;
    if (inPriorityB) return 1;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
}

export default function CountryPicker({
  label = "País",
  value,
  options,
  onChange,
  disabled,
  error,
  placeholder = "Selecciona país",
  className,
  triggerId
}: {
  label?: string;
  value: string;
  options: CountryPickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  triggerId?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sortedOptions = useMemo(() => sortCountries(options), [options]);
  const selected = useMemo(() => sortedOptions.find((item) => item.id === value) ?? null, [sortedOptions, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((item) => {
      const iso2 = item.code.toLowerCase();
      const iso3 = (item.iso3 ?? "").toLowerCase();
      const callingCode = (item.callingCode ?? "").toLowerCase().replace(/^\+/, "");
      const name = item.name.toLowerCase();
      const normalizedQuery = q.replace(/^\+/, "");
      return name.includes(q) || iso2.includes(q) || iso3.includes(q) || callingCode.includes(normalizedQuery);
    });
  }, [query, sortedOptions]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <button
        id={triggerId}
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          error && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
          disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
        )}
        aria-label="Seleccionar país"
      >
        {selected ? (
          <span className="inline-flex min-w-0 items-center gap-2 text-slate-700">
            <span>{iso2ToFlag(selected.code)}</span>
            <span className="truncate font-semibold">{selected.name}</span>
            <span className="text-xs text-slate-500">
              {selected.code.toUpperCase()}
              {selected.callingCode ? ` · +${selected.callingCode}` : ""}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && !disabled ? (
        <div className="relative z-30 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por país o ISO"
                className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                  item.id === value && "bg-[#4aadf5]/15"
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span>{iso2ToFlag(item.code)}</span>
                  <span className="truncate font-semibold">{item.name}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {item.code.toUpperCase()}
                  {item.callingCode ? ` · +${item.callingCode}` : ""}
                </span>
              </button>
            ))}
            {!filtered.length ? <p className="px-2 py-3 text-xs text-slate-500">Sin resultados.</p> : null}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
