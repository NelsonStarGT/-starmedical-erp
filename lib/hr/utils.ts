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

export function normalizeBranchAssignments(raw: any[], primaryBranchId: string) {
  const extras: Array<{ branchId: string; startDate: Date | null; endDate: Date | null }> = [];
  const seen = new Set<string>();
  for (const item of raw || []) {
    const branchId = cleanNullableString(item.branchId) || "";
    if (!branchId || branchId === primaryBranchId || seen.has(branchId)) continue;
    extras.push({
      branchId,
      startDate: parseDateInput(item.startDate, "Fecha de inicio"),
      endDate: parseDateInput(item.endDate, "Fecha fin")
    });
    seen.add(branchId);
  }
  return extras;
}
