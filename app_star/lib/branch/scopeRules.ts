function clean(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function unique(values: Array<string | null | undefined>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = clean(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function resolveEffectiveBranchId(input: {
  allowedBranchIds: string[];
  preferredBranchId?: string | null;
  cookieBranchId?: string | null;
  sessionBranchId?: string | null;
  fallbackBranchId?: string | null;
}) {
  const allowed = new Set(unique(input.allowedBranchIds));
  const ordered = unique([
    input.preferredBranchId,
    input.cookieBranchId,
    input.sessionBranchId,
    input.fallbackBranchId
  ]);
  for (const candidate of ordered) {
    if (!candidate) continue;
    if (allowed.size === 0 || allowed.has(candidate)) {
      return candidate;
    }
  }
  if (allowed.size === 0) return null;
  return Array.from(allowed)[0] ?? null;
}

export function isRequestedBranchAllowed(requestedBranchId: string | null | undefined, allowedBranchIds: string[]) {
  const requested = clean(requestedBranchId);
  if (!requested) return true;
  return new Set(unique(allowedBranchIds)).has(requested);
}
