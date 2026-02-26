"use client";

import { cn } from "@/lib/utils";
import { DateField } from "@/components/ui/DateField";
import type { DateFormat, WeekStartsOn } from "@/lib/datetime/types";

export type DateRangeValue = {
  from: string;
  to: string;
};

export type DateRangeFieldProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  labels?: { from?: string; to?: string };
  disabled?: boolean;
  errors?: { from?: string; to?: string };
  dateFormat?: DateFormat;
  weekStartsOn?: WeekStartsOn;
  className?: string;
};

export function DateRangeField({
  value,
  onChange,
  labels,
  disabled,
  errors,
  dateFormat,
  weekStartsOn,
  className
}: DateRangeFieldProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 md:grid-cols-2", className)}>
      <DateField
        value={value.from}
        onChange={(next) => onChange({ ...value, from: next })}
        label={labels?.from || "Desde"}
        disabled={disabled}
        error={errors?.from}
        dateFormat={dateFormat}
        weekStartsOn={weekStartsOn}
      />
      <DateField
        value={value.to}
        onChange={(next) => onChange({ ...value, to: next })}
        label={labels?.to || "Hasta"}
        disabled={disabled}
        error={errors?.to}
        dateFormat={dateFormat}
        weekStartsOn={weekStartsOn}
      />
    </div>
  );
}

export default DateRangeField;
