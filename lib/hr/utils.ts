export function cleanNullableString(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = typeof value === "string" ? value.trim() : value;
  return trimmed === "" ? null : (trimmed as string);
}

export function parseDateInput(value: string | null | undefined, label: string, options: { required?: boolean } = {}) {
  if (!value || value === "") {
    if (options.required) throw new Error(`${label} requerido`);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválido`);
  return date;
}

export function ensurePrimary<T extends { isPrimary?: boolean }>(items: T[]) {
  if (!items || items.length === 0) return items;
  if (!items.some((item) => item.isPrimary)) {
    items[0].isPrimary = true;
  }
  return items;
}

export function computeRetentionUntil(base: Date | null | undefined, provided?: Date | null, years = 5) {
  if (provided) return provided;
  const source = base || new Date();
  const copy = new Date(source);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

export function isExpiringSoon(date: Date | null | undefined, thresholdDays = 45) {
  if (!date) return false;
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + thresholdDays);
  return date <= threshold;
}
