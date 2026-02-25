export type DensityMode = "compact" | "normal";

export function resolveSidebarCollapsedPreference(input: {
  storedValue: string | null;
  policyDefault: boolean;
  policyForce: boolean;
}) {
  if (input.policyForce) return true;
  if (input.storedValue === null) return input.policyDefault;
  return input.storedValue === "1";
}

export function serializeSidebarCollapsedPreference(input: {
  collapsed: boolean;
  policyForce: boolean;
}) {
  if (input.policyForce) return "1";
  return input.collapsed ? "1" : "0";
}

export function resolveDensityModePreference(input: {
  storedValue: string | null;
  defaultMode: DensityMode;
}) {
  if (input.storedValue === "compact" || input.storedValue === "normal") {
    return input.storedValue;
  }
  return input.defaultMode;
}
