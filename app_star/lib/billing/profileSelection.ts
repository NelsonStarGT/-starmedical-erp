export type BillingProfileCandidate = {
  id: string;
  legalEntityId: string;
  establishmentId: string | null;
  priority: number;
  isActive?: boolean;
};

export function selectBillingProfileByPriority<T extends BillingProfileCandidate>(rows: T[]): T | null {
  const activeRows = rows.filter((row) => row.isActive !== false);
  if (!activeRows.length) return null;

  return [...activeRows].sort((left, right) => {
    const priorityDiff = left.priority - right.priority;
    if (priorityDiff !== 0) return priorityDiff;
    return left.id.localeCompare(right.id, "en");
  })[0] ?? null;
}
