"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTenantDateTimeConfigValue } from "@/lib/datetime/client";
import { formatDate } from "@/lib/datetime/format";
import {
  getDatePlaceholder,
  maskDateInput,
  parseDate,
  parseIsoDateString,
  toIsoDateString
} from "@/lib/datetime/parse";
import { normalizeDateFormat, normalizeWeekStartsOn, type DateFormat, type WeekStartsOn } from "@/lib/datetime/types";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
] as const;

const WEEK_DAYS_MON = ["L", "M", "M", "J", "V", "S", "D"] as const;
const WEEK_DAYS_SUN = ["D", "L", "M", "M", "J", "V", "S"] as const;

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(left: Date | null, right: Date | null) {
  if (!left || !right) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarCells(monthDate: Date, weekStartsOn: WeekStartsOn) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDay = weekStartsOn === "MON" ? (firstDay.getDay() + 6) % 7 : firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;
  const startDate = new Date(year, month, 1 - firstWeekDay);

  return Array.from({ length: totalCells }).map((_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      key: toIsoDateString(date),
      date,
      inCurrentMonth: date.getMonth() === month
    };
  });
}

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  onErrorChange?: (error?: string) => void;
  dateFormat?: DateFormat;
  weekStartsOn?: WeekStartsOn;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export function DateField({
  value,
  onChange,
  label,
  autoFocus,
  disabled,
  error,
  onErrorChange,
  dateFormat,
  weekStartsOn,
  minDate,
  maxDate,
  placeholder,
  className,
  inputClassName
}: DateFieldProps) {
  const tenantConfig = useTenantDateTimeConfigValue();
  const effectiveDateFormat = normalizeDateFormat(dateFormat ?? tenantConfig.dateFormat);
  const effectiveWeekStartsOn = normalizeWeekStartsOn(weekStartsOn ?? tenantConfig.weekStartsOn);

  const selectedDate = useMemo(() => parseIsoDateString(value), [value]);
  const minDateObj = useMemo(() => parseIsoDateString(minDate || ""), [minDate]);
  const maxDateObj = useMemo(() => parseIsoDateString(maxDate || ""), [maxDate]);
  const minDateOnly = useMemo(() => (minDateObj ? dateOnly(minDateObj) : null), [minDateObj]);
  const maxDateOnly = useMemo(() => (maxDateObj ? dateOnly(maxDateObj) : null), [maxDateObj]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState(() => (selectedDate ? formatDate(selectedDate, effectiveDateFormat) : ""));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const base = selectedDate || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const years = useMemo(() => {
    const nowYear = new Date().getFullYear();
    const minYear = minDateOnly?.getFullYear() ?? nowYear - 120;
    const maxYear = maxDateOnly?.getFullYear() ?? nowYear + 20;
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) list.push(year);
    return list;
  }, [maxDateOnly, minDateOnly]);

  const weekDays = effectiveWeekStartsOn === "MON" ? WEEK_DAYS_MON : WEEK_DAYS_SUN;
  const cells = useMemo(() => buildCalendarCells(visibleMonth, effectiveWeekStartsOn), [effectiveWeekStartsOn, visibleMonth]);

  const mergedError = localError ?? error;

  const pushError = useCallback(
    (message?: string) => {
      setLocalError(message);
      onErrorChange?.(message);
    },
    [onErrorChange]
  );

  const isOutOfRange = useCallback(
    (date: Date) => {
      const dateValue = dateOnly(date).getTime();
      if (minDateOnly && dateValue < minDateOnly.getTime()) return true;
      if (maxDateOnly && dateValue > maxDateOnly.getTime()) return true;
      return false;
    },
    [maxDateOnly, minDateOnly]
  );

  const commitInput = useCallback(() => {
    const trimmed = inputValue.trim();
    const fallbackPlaceholder = placeholder || getDatePlaceholder(effectiveDateFormat);

    if (!trimmed) {
      onChange("");
      pushError(undefined);
      return;
    }

    const parsed = parseDate(trimmed, effectiveDateFormat);
    if (!parsed) {
      pushError(`Fecha inválida. Usa formato ${fallbackPlaceholder}.`);
      return;
    }

    if (isOutOfRange(parsed)) {
      pushError("La fecha está fuera del rango permitido.");
      return;
    }

    const iso = toIsoDateString(parsed);
    onChange(iso);
    setInputValue(formatDate(parsed, effectiveDateFormat));
    pushError(undefined);
  }, [effectiveDateFormat, inputValue, isOutOfRange, onChange, placeholder, pushError]);

  const applyDate = useCallback(
    (date: Date) => {
      if (isOutOfRange(date)) return;
      const iso = toIsoDateString(date);
      onChange(iso);
      setInputValue(formatDate(date, effectiveDateFormat));
      pushError(undefined);
      setOpen(false);
    },
    [effectiveDateFormat, isOutOfRange, onChange, pushError]
  );

  const canPrevMonth = useMemo(() => {
    if (!minDateOnly) return true;
    const prevMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    return prevMonth.getTime() >= new Date(minDateOnly.getFullYear(), minDateOnly.getMonth(), 1).getTime();
  }, [minDateOnly, visibleMonth]);

  const canNextMonth = useMemo(() => {
    if (!maxDateOnly) return true;
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    return nextMonth.getTime() <= new Date(maxDateOnly.getFullYear(), maxDateOnly.getMonth(), 1).getTime();
  }, [maxDateOnly, visibleMonth]);

  useEffect(() => {
    setInputValue(selectedDate ? formatDate(selectedDate, effectiveDateFormat) : "");
  }, [effectiveDateFormat, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative space-y-1", className)}>
      {label ? <label className="text-xs font-semibold text-slate-500">{label}</label> : null}

      <div className="relative">
        <input
          autoFocus={autoFocus}
          value={inputValue}
          onChange={(event) => {
            const masked = maskDateInput(event.target.value, effectiveDateFormat);
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
            const masked = maskDateInput(pasted, effectiveDateFormat);
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
          placeholder={placeholder || getDatePlaceholder(effectiveDateFormat)}
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-700 shadow-sm transition",
            "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
            mergedError && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
            disabled && "cursor-not-allowed bg-slate-100 text-slate-400",
            inputClassName
          )}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
          disabled={disabled}
          className={cn("absolute inset-y-0 right-2 inline-flex items-center justify-center text-[#2e75ba]", disabled && "text-slate-400")}
          aria-label="Abrir calendario"
        >
          <CalendarDays size={16} />
        </button>
      </div>

      {open && !disabled ? (
        <div className="absolute z-40 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => canPrevMonth && setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              disabled={!canPrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#4aadf5] hover:bg-[#4aadf5]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="grid flex-1 grid-cols-2 gap-2">
              <select
                value={visibleMonth.getMonth()}
                onChange={(event) => setVisibleMonth((prev) => new Date(prev.getFullYear(), Number(event.target.value), 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-[#2e75ba] focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                {MONTHS_ES.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={visibleMonth.getFullYear()}
                onChange={(event) => setVisibleMonth((prev) => new Date(Number(event.target.value), prev.getMonth(), 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-[#2e75ba] focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => canNextMonth && setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              disabled={!canNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#4aadf5] hover:bg-[#4aadf5]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <span key={`${day}-${index}`} className="text-center text-[11px] font-semibold text-[#2e75ba]">
                {day}
              </span>
            ))}
            {cells.map((cell) => {
              const selected = isSameDate(cell.date, selectedDate);
              const today = isSameDate(cell.date, dateOnly(new Date()));
              const outOfRange = isOutOfRange(cell.date);
              const selectable = cell.inCurrentMonth && !outOfRange;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => selectable && applyDate(cell.date)}
                  disabled={!selectable}
                  className={cn(
                    "h-9 w-9 rounded-full text-sm font-semibold transition",
                    selected
                      ? "bg-[#4aa59c] text-white"
                      : selectable
                        ? "text-slate-700 hover:bg-[#4aadf5]/20"
                        : "cursor-not-allowed text-slate-300",
                    !selected && today && selectable && "border border-[#2e75ba]/40 text-[#2e75ba]"
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mergedError ? <p className="text-xs text-rose-700">{mergedError}</p> : null}
    </div>
  );
}

export default DateField;
