export const CLIENTS_COUNTRY_FILTER_COOKIE = "CLIENTS_COUNTRY_FILTER";
export const CLIENTS_COUNTRY_FILTER_ALL = "ALL";

const CLIENTS_COUNTRY_FILTER_VISIBLE_PREFIXES = [
  "/admin/clientes/lista",
  "/admin/clientes/personas",
  "/admin/clientes/empresas",
  "/admin/clientes/instituciones",
  "/admin/clientes/aseguradoras",
  "/admin/clientes/reportes"
] as const;

const CLIENTS_COUNTRY_FILTER_HIDDEN_PREFIXES = [
  "/admin/clientes",
  "/admin/clientes/configuracion"
] as const;

export function normalizeClientsCountryFilterValue(value: unknown) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (normalized.toUpperCase() === CLIENTS_COUNTRY_FILTER_ALL) return null;
  return normalized;
}

function normalizePathname(pathname: string | null | undefined) {
  const normalizedPath = String(pathname || "").trim();
  if (!normalizedPath) return "";
  const urlSafePath = normalizedPath.split("?")[0]?.split("#")[0] ?? normalizedPath;
  if (!urlSafePath || urlSafePath === "/") return "/";
  return urlSafePath.replace(/\/+$/, "") || "/";
}

export function shouldShowClientsCountryFilter(pathname: string | null | undefined) {
  const normalizedPath = normalizePathname(pathname);
  if (!normalizedPath || normalizedPath === "/") return false;

  if (CLIENTS_COUNTRY_FILTER_HIDDEN_PREFIXES.includes(normalizedPath as (typeof CLIENTS_COUNTRY_FILTER_HIDDEN_PREFIXES)[number])) {
    return false;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.includes("nuevo")) return false;

  return CLIENTS_COUNTRY_FILTER_VISIBLE_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
}

export const shouldShowClientsCountryFilterSelector = shouldShowClientsCountryFilter;

// Backward-compatible aliases while the module migrates naming.
export const CLIENTS_OPERATING_COUNTRY_COOKIE = CLIENTS_COUNTRY_FILTER_COOKIE;
export const shouldShowClientsOperatingCountrySelector = shouldShowClientsCountryFilterSelector;
