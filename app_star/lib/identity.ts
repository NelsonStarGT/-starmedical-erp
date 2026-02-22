export type IdentityConfig = {
  name: string;
  logoUrl: string | null;
  logoFileKey: string | null;
};

export const DEFAULT_IDENTITY: IdentityConfig = {
  name: "StarMedical ERP",
  logoUrl: null,
  logoFileKey: null
};

export const IDENTITY_EVENT = "identity:updated";

export function broadcastIdentityUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(IDENTITY_EVENT));
}

export function initialsFromIdentity(name?: string | null) {
  if (!name) return "ERP";
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "ERP";
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);
}

export async function fetchIdentityConfig(): Promise<IdentityConfig> {
  try {
    const res = await fetch("/api/config/identity", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || `Error ${res.status}`);
    }
    const data = json?.data || {};
    return {
      name: data.name || DEFAULT_IDENTITY.name,
      logoUrl: data.logoUrl || null,
      logoFileKey: data.logoFileKey || null
    };
  } catch (err) {
    return DEFAULT_IDENTITY;
  }
}
