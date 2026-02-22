import type { CrmPreferredChannel } from "@prisma/client";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateTimeLocalValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toISOStringFromLocal(localValue: string): string | null {
  if (!localValue) return null;
  const [datePart, timePart] = localValue.split("T");
  if (!datePart || !timePart) return null;
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatNextAction(type: CrmPreferredChannel | string | null | undefined, notes?: string | null): string {
  const cleanType = (type ?? "").toString().trim();
  const cleanNotes = (notes ?? "").toString().trim();
  if (!cleanType) return "";
  return cleanNotes ? `${cleanType} - ${cleanNotes}` : cleanType;
}
