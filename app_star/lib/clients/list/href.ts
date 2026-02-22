export type HrefQuery = Record<string, string | undefined>;

export function buildClientListHref(basePath: string, params: HrefQuery) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    usp.set(key, value);
  });
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function mergeHrefQuery(current: HrefQuery, patch: HrefQuery, options?: { resetPage?: boolean }) {
  const merged: HrefQuery = { ...current, ...patch };
  if (options?.resetPage) merged.page = undefined;
  return merged;
}
