"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type GeoSearchOption = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

export default function GeoSearchSelect({
  label,
  value,
  options,
  placeholder = "Selecciona",
  disabled,
  error,
  onChange,
  className
}: {
  label: string;
  value: string;
  options: GeoSearchOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0
  });

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.name.localeCompare(b.name, "es", {
          sensitivity: "base"
        })
      ),
    [options]
  );

  const selected = useMemo(() => sortedOptions.find((option) => option.id === value) ?? null, [sortedOptions, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((option) => option.name.toLowerCase().includes(q) || option.code.toLowerCase().includes(q));
  }, [query, sortedOptions]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePanelPosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className={cn("space-y-1", className)} ref={containerRef}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <button
        ref={triggerRef}
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
        aria-label={`Seleccionar ${label}`}
      >
        {selected ? (
          <span className="inline-flex min-w-0 items-center text-slate-700">
            <span className="truncate font-semibold">{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>

      {open && !disabled && typeof window !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
              className="fixed z-[120] rounded-xl border border-slate-200 bg-white shadow-xl"
            >
          <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Buscar ${label.toLowerCase()}`}
                className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                  option.id === value && "bg-[#4aadf5]/15"
                )}
                title={option.code ? `${option.name} (${option.code})` : option.name}
              >
                <span className="truncate font-semibold">{option.name}</span>
                <span className="sr-only">{option.code}</span>
              </button>
            ))}
            {!filtered.length ? <p className="px-2 py-3 text-xs text-slate-500">Sin resultados.</p> : null}
          </div>
            </div>,
            document.body
          )
        : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
