"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { label: string; value?: string; id?: string };

type SearchableSelectCommonProps = {
  label?: string;
  placeholder?: string;
  options: ReadonlyArray<Option>;
  includeAllOption?: boolean;
  maxHeight?: number;
  className?: string;
  disabled?: boolean;
};

type SearchableSelectSingleProps = SearchableSelectCommonProps & {
  multiple?: false;
  value: string | null | undefined;
  onChange: (value: string) => void;
};

type SearchableSelectMultipleProps = SearchableSelectCommonProps & {
  multiple: true;
  value: string[] | null | undefined;
  onChange: (value: string[]) => void;
};

type SearchableSelectProps = SearchableSelectSingleProps | SearchableSelectMultipleProps;

const ALL_VALUE = "__all__";

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    label,
    placeholder = "Selecciona...",
    options,
    includeAllOption = false,
    maxHeight = 240,
    className,
    disabled
  } = props;
  const multiple = props.multiple === true;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedOptions = useMemo(
    () =>
      options
        .map((option) => ({
          value: (option.value ?? option.id ?? "").trim(),
          label: option.label
        }))
        .filter((option) => option.value.length > 0 || includeAllOption),
    [includeAllOption, options]
  );

  const normalizedValue = useMemo(() => {
    if (multiple) {
      const value = props.value;
      return Array.isArray(value) ? value : [];
    }
    const value = props.value;
    return Array.isArray(value) ? value[0] || "" : value || "";
  }, [multiple, props.value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q));
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const width = Math.max(0, rect.width);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
      setPanelStyle({
        top: rect.bottom + 8,
        left: Math.min(Math.max(viewportPadding, rect.left), maxLeft),
        width
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
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      setQuery("");
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  const selectedLabels = useMemo(() => {
    const labelByValue = new Map<string, string>(normalizedOptions.map((option) => [option.value, option.label]));
    if (multiple) {
      const selected = normalizedValue as string[];
      return selected.map((item) => labelByValue.get(item)).filter(Boolean) as string[];
    }
    const selected = normalizedValue as string;
    return selected ? [labelByValue.get(selected)].filter(Boolean) as string[] : [];
  }, [multiple, normalizedOptions, normalizedValue]);

  function handleSelect(nextValue: string) {
    if (multiple) {
      const current = normalizedValue as string[];
      if (nextValue === ALL_VALUE) {
        props.onChange([]);
        return;
      }
      const exists = current.includes(nextValue);
      props.onChange(exists ? current.filter((item) => item !== nextValue) : [...current, nextValue]);
      return;
    }

    if (nextValue === ALL_VALUE) {
      props.onChange("");
      setOpen(false);
      return;
    }
    props.onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label ? <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p> : null}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          open && "border-[#4aa59c]",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {selectedLabels.length ? (
            <>
              {selectedLabels.slice(0, 2).map((item) => (
                <span key={item} className="rounded-full bg-[#4aa59c]/10 px-2 py-0.5 text-xs font-semibold text-[#2e75ba]">
                  {item}
                </span>
              ))}
              {selectedLabels.length > 2 ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  +{selectedLabels.length - 2}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              className={cn(
                "fixed z-[120] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md",
                !panelStyle && "pointer-events-none invisible"
              )}
              style={{
                top: panelStyle?.top ?? 0,
                left: panelStyle?.left ?? 0,
                width: panelStyle?.width ?? 1
              }}
            >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-xs text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
          </div>
          <div className="overflow-auto p-1" style={{ maxHeight }}>
            {includeAllOption ? (
              <OptionRow
                label="Todos"
                selected={multiple ? (normalizedValue as string[]).length === 0 : (normalizedValue as string).length === 0}
                onSelect={() => handleSelect(ALL_VALUE)}
              />
            ) : null}

            {filteredOptions.length === 0 ? <p className="px-2 py-2 text-xs text-slate-500">Sin resultados.</p> : null}

            {filteredOptions.map((option) => (
              <OptionRow
                key={`${option.value}:${option.label}`}
                label={option.label}
                selected={multiple ? (normalizedValue as string[]).includes(option.value) : normalizedValue === option.value}
                onSelect={() => handleSelect(option.value)}
              />
            ))}
          </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function OptionRow({
  label,
  selected,
  onSelect
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC]",
        selected && "bg-[#4aa59c]/10 font-semibold text-[#2e75ba]"
      )}
    >
      <span className="truncate">{label}</span>
      {selected ? <span>✓</span> : null}
    </button>
  );
}

export default SearchableSelect;
