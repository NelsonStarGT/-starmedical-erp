"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTenantDateTimeConfigValue } from "@/lib/datetime/client";
import { maskTimeInput, parseTime } from "@/lib/datetime/parse";
import { normalizeTimeFormat, type TimeFormat } from "@/lib/datetime/types";

function formatTimeForDisplay(value24: string, timeFormat: TimeFormat) {
  const parsed = parseTime(value24, "H24");
  if (!parsed) return "";
  if (timeFormat === "H24") return parsed.text24;

  const suffix = parsed.hours24 >= 12 ? "PM" : "AM";
  const hour12 = parsed.hours24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")} ${suffix}`;
}

function timePlaceholder(timeFormat: TimeFormat) {
  return timeFormat === "H12" ? "hh:mm AM" : "hh:mm";
}

export type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
  onErrorChange?: (error?: string) => void;
  timeFormat?: TimeFormat;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
};

export function TimeField({
  value,
  onChange,
  label,
  disabled,
  error,
  onErrorChange,
  timeFormat,
  className,
  inputClassName,
  placeholder
}: TimeFieldProps) {
  const tenantConfig = useTenantDateTimeConfigValue();
  const effectiveTimeFormat = normalizeTimeFormat(timeFormat ?? tenantConfig.timeFormat);

  const [inputValue, setInputValue] = useState(() => formatTimeForDisplay(value, effectiveTimeFormat));
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const mergedError = localError ?? error;
  const basePlaceholder = useMemo(() => placeholder || timePlaceholder(effectiveTimeFormat), [effectiveTimeFormat, placeholder]);

  useEffect(() => {
    setInputValue(formatTimeForDisplay(value, effectiveTimeFormat));
  }, [effectiveTimeFormat, value]);

  const pushError = (message?: string) => {
    setLocalError(message);
    onErrorChange?.(message);
  };

  const commitInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange("");
      pushError(undefined);
      return;
    }

    const parsed = parseTime(trimmed, effectiveTimeFormat);
    if (!parsed) {
      pushError(`Hora inválida. Usa formato ${basePlaceholder}.`);
      return;
    }

    onChange(parsed.text24);
    setInputValue(formatTimeForDisplay(parsed.text24, effectiveTimeFormat));
    pushError(undefined);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label ? <label className="text-xs font-semibold text-slate-500">{label}</label> : null}
      <div className="relative">
        <input
          value={inputValue}
          onChange={(event) => {
            const masked = maskTimeInput(event.target.value, effectiveTimeFormat);
            setInputValue(masked);
            if (!masked) {
              onChange("");
              pushError(undefined);
            } else if (localError) {
              pushError(undefined);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text");
            const masked = maskTimeInput(pasted, effectiveTimeFormat);
            setInputValue(masked);
            if (!masked) {
              onChange("");
              pushError(undefined);
            } else if (localError) {
              pushError(undefined);
            }
          }}
          onBlur={commitInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitInput();
            }
          }}
          placeholder={basePlaceholder}
          disabled={disabled}
          inputMode="numeric"
          maxLength={effectiveTimeFormat === "H12" ? 8 : 5}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-700 shadow-sm transition",
            "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
            mergedError && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
            disabled && "cursor-not-allowed bg-slate-100 text-slate-400",
            inputClassName
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-[#2e75ba]">
          <Clock3 size={15} />
        </span>
      </div>
      {mergedError ? <p className="text-xs text-rose-700">{mergedError}</p> : null}
    </div>
  );
}

export default TimeField;
