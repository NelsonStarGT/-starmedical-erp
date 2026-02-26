"use client";

import { cn } from "@/lib/utils";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import type { DateFormat, TimeFormat, WeekStartsOn } from "@/lib/datetime/types";

export type DateTimeValue = {
  date: string;
  time: string;
};

export type DateTimeFieldProps = {
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  labels?: { date?: string; time?: string };
  disabled?: boolean;
  errors?: { date?: string; time?: string };
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  weekStartsOn?: WeekStartsOn;
  className?: string;
};

export function DateTimeField({
  value,
  onChange,
  labels,
  disabled,
  errors,
  dateFormat,
  timeFormat,
  weekStartsOn,
  className
}: DateTimeFieldProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 md:grid-cols-2", className)}>
      <DateField
        value={value.date}
        onChange={(date) => onChange({ ...value, date })}
        label={labels?.date || "Fecha"}
        disabled={disabled}
        error={errors?.date}
        dateFormat={dateFormat}
        weekStartsOn={weekStartsOn}
      />
      <TimeField
        value={value.time}
        onChange={(time) => onChange({ ...value, time })}
        label={labels?.time || "Hora"}
        disabled={disabled}
        error={errors?.time}
        timeFormat={timeFormat}
      />
    </div>
  );
}

export default DateTimeField;
