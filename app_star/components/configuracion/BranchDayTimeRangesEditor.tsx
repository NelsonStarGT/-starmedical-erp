"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const TIME_REGEX = /^(\d{1,2}):(\d{2})$/;
const RANGE_REGEX = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
const DEFAULT_NEW_RANGE = { start: "08:00", end: "09:00" };
const TIME_OPTIONS_15 = buildTimeOptions(15);

export type DayRange = {
  start: string;
  end: string;
};

export type DayRangesValidation = {
  hasErrors: boolean;
  rangeErrors: Record<number, string>;
  dayErrors: string[];
};

type BranchDayTimeRangesEditorProps = {
  value: string[];
  onChange: (next: string[]) => void;
  labelDay: string;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeTime(value: string): string | null {
  const parsed = TIME_REGEX.exec(value.trim());
  if (!parsed) return null;
  const hour = Number(parsed[1]);
  const minute = Number(parsed[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function timeToMinutes(value: string): number {
  const normalized = normalizeTime(value);
  if (!normalized) return Number.NaN;
  const [hourText, minuteText] = normalized.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return hour * 60 + minute;
}

function compareRangeByStart(left: DayRange, right: DayRange) {
  const leftStart = timeToMinutes(left.start);
  const rightStart = timeToMinutes(right.start);
  if (leftStart === rightStart) {
    return timeToMinutes(left.end) - timeToMinutes(right.end);
  }
  return leftStart - rightStart;
}

function ensureOptionInList(value: string) {
  if (TIME_OPTIONS_15.includes(value)) return TIME_OPTIONS_15;
  return [value, ...TIME_OPTIONS_15];
}

export function parseRange(value: string): DayRange | null {
  const parsed = RANGE_REGEX.exec(value.trim());
  if (!parsed) return null;
  const start = normalizeTime(`${parsed[1]}:${parsed[2]}`);
  const end = normalizeTime(`${parsed[3]}:${parsed[4]}`);
  if (!start || !end) return null;
  return { start, end };
}

export function toRange(range: DayRange): string {
  const start = normalizeTime(range.start) ?? "00:00";
  const end = normalizeTime(range.end) ?? "00:00";
  return `${start}-${end}`;
}

export function buildTimeOptions(step = 15): string[] {
  const safeStep = Number.isInteger(step) && step > 0 && 60 % step === 0 ? step : 15;
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += safeStep) {
      options.push(`${pad2(hour)}:${pad2(minute)}`);
    }
  }
  return options;
}

export function normalizeDayRanges(ranges: string[]): string[] {
  return ranges
    .map((raw) => parseRange(raw))
    .filter((entry): entry is DayRange => Boolean(entry))
    .sort(compareRangeByStart)
    .map((entry) => toRange(entry));
}

export function deriveDayOpenClose(ranges: string[]): { open: string; close: string } | null {
  const sorted = ranges
    .map((raw) => parseRange(raw))
    .filter((entry): entry is DayRange => Boolean(entry))
    .sort(compareRangeByStart);
  if (!sorted.length) return null;
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return { open: first.start, close: last.end };
}

export function validateDayRanges(ranges: string[]): DayRangesValidation {
  const rangeErrors: Record<number, string> = {};
  const validRanges: Array<{ index: number; start: number; end: number; label: string }> = [];

  for (let index = 0; index < ranges.length; index += 1) {
    const parsed = parseRange(ranges[index] ?? "");
    if (!parsed) {
      rangeErrors[index] = "Formato inválido. Usa HH:MM-HH:MM.";
      continue;
    }

    const startMinutes = timeToMinutes(parsed.start);
    const endMinutes = timeToMinutes(parsed.end);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
      rangeErrors[index] = "Hora inválida.";
      continue;
    }

    if (endMinutes <= startMinutes) {
      rangeErrors[index] = "La hora de cierre debe ser mayor que la apertura.";
      continue;
    }

    validRanges.push({
      index,
      start: startMinutes,
      end: endMinutes,
      label: toRange(parsed)
    });
  }

  const overlaps: string[] = [];
  const sorted = [...validRanges].sort((left, right) => left.start - right.start || left.end - right.end);
  for (let index = 1; index < sorted.length; index += 1) {
    const left = sorted[index - 1]!;
    const right = sorted[index]!;
    if (right.start < left.end) {
      rangeErrors[left.index] = rangeErrors[left.index] ?? `Se solapa con ${right.label}.`;
      rangeErrors[right.index] = rangeErrors[right.index] ?? `Se solapa con ${left.label}.`;
      overlaps.push(`${left.label} se superpone con ${right.label}.`);
    }
  }

  const dayErrors = Array.from(new Set(overlaps));
  return {
    hasErrors: Object.keys(rangeErrors).length > 0 || dayErrors.length > 0,
    rangeErrors,
    dayErrors
  };
}

export default function BranchDayTimeRangesEditor({ value, onChange, labelDay }: BranchDayTimeRangesEditorProps) {
  const ranges = useMemo(
    () =>
      (Array.isArray(value) ? value : []).map((raw) => {
        const parsed = parseRange(raw);
        return parsed ?? { ...DEFAULT_NEW_RANGE };
      }),
    [value]
  );

  const validation = useMemo(() => validateDayRanges(value || []), [value]);
  const openClose = useMemo(() => deriveDayOpenClose(value || []), [value]);

  function emit(nextRanges: DayRange[]) {
    onChange(normalizeDayRanges(nextRanges.map((entry) => toRange(entry))));
  }

  function handleUpdateRange(index: number, patch: Partial<DayRange>) {
    const next = ranges.map((range, currentIndex) =>
      currentIndex === index
        ? {
            start: patch.start ?? range.start,
            end: patch.end ?? range.end
          }
        : range
    );
    emit(next);
  }

  function handleRemoveRange(index: number) {
    const next = ranges.filter((_, currentIndex) => currentIndex !== index);
    emit(next);
  }

  function handleAddRange() {
    const current = normalizeDayRanges(value || [])
      .map((raw) => parseRange(raw))
      .filter((entry): entry is DayRange => Boolean(entry));
    const lastRange = current[current.length - 1] ?? null;

    let start = DEFAULT_NEW_RANGE.start;
    let end = DEFAULT_NEW_RANGE.end;

    if (lastRange) {
      const endIndex = TIME_OPTIONS_15.indexOf(lastRange.end);
      if (endIndex >= 0 && endIndex < TIME_OPTIONS_15.length - 1) {
        start = TIME_OPTIONS_15[endIndex]!;
        end = TIME_OPTIONS_15[endIndex + 1]!;
      } else {
        const fallbackStart = TIME_OPTIONS_15[TIME_OPTIONS_15.length - 2];
        const fallbackEnd = TIME_OPTIONS_15[TIME_OPTIONS_15.length - 1];
        if (fallbackStart && fallbackEnd) {
          start = fallbackStart;
          end = fallbackEnd;
        }
      }
    }

    onChange(normalizeDayRanges([...(value || []), `${start}-${end}`]));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{labelDay}</p>
        <p
          className={cn(
            "text-xs font-semibold",
            openClose ? "rounded-full bg-[#4aadf5]/15 px-2 py-1 text-[#2e75ba]" : "text-slate-500"
          )}
        >
          {openClose ? `Abre ${openClose.open} · Cierra ${openClose.close}` : "Sin horario"}
        </p>
      </div>

      <div className="space-y-2">
        {ranges.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Sin rangos definidos.
          </p>
        ) : null}

        {ranges.map((range, index) => {
          const startOptions = ensureOptionInList(range.start);
          const endOptions = ensureOptionInList(range.end);
          const rangeError = validation.rangeErrors[index];

          return (
            <div
              key={`${labelDay}-${index}-${range.start}-${range.end}`}
              className={cn("rounded-xl border px-2 py-2", rangeError ? "border-rose-300 bg-rose-50/30" : "border-slate-200")}
            >
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                <select
                  className="rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-700"
                  value={range.start}
                  onChange={(event) => handleUpdateRange(index, { start: event.target.value })}
                >
                  {startOptions.map((option) => (
                    <option key={`start-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-semibold text-slate-500">a</span>

                <select
                  className="rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-700"
                  value={range.end}
                  onChange={(event) => handleUpdateRange(index, { end: event.target.value })}
                >
                  {endOptions.map((option) => (
                    <option key={`end-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveRange(index)}
                  className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-700"
                  aria-label={`Eliminar rango ${index + 1} de ${labelDay}`}
                >
                  Eliminar
                </button>
              </div>

              {rangeError ? <p className="mt-1 text-xs font-medium text-rose-700">{rangeError}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddRange}
          className="rounded-xl border border-[#4aa59c]/40 bg-[#ecf8f6] px-3 py-1.5 text-xs font-semibold text-[#1c5952] hover:border-[#4aa59c] hover:bg-[#def1ee]"
        >
          + Agregar rango
        </button>
      </div>

      {validation.dayErrors.length ? (
        <div className="mt-2 space-y-1">
          {validation.dayErrors.map((error) => (
            <p key={`${labelDay}-${error}`} className="text-xs font-medium text-rose-700">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
