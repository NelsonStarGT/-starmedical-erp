export function parseNavOrderPreference(storedValue: string | null): string[] {
  if (!storedValue) return [];

  try {
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  } catch {
    return [];
  }
}

export function serializeNavOrderPreference(order: string[]): string {
  const normalized = Array.from(
    new Set(
      order
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0)
    )
  );

  return JSON.stringify(normalized);
}

export function applyNavOrderPreference<T extends { id: string }>(items: T[], preferredOrder: string[]): T[] {
  if (!items.length) return [];

  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];

  preferredOrder.forEach((id) => {
    const item = byId.get(id);
    if (!item) return;
    ordered.push(item);
    byId.delete(id);
  });

  items.forEach((item) => {
    if (byId.has(item.id)) {
      ordered.push(item);
      byId.delete(item.id);
    }
  });

  return ordered;
}
