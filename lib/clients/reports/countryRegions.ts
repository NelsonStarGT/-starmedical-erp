import { COUNTRY_CENTROIDS, getCountryCentroid } from "@/lib/clients/reports/countryCentroids";

export type MapRegionKey = "AMERICAS" | "EUROPE" | "AFRICA" | "ASIA" | "OCEANIA";
export type AmericasSubregionKey = "NORTH_AMERICA" | "CENTRAL_AMERICA" | "SOUTH_AMERICA";

export const MAP_REGION_OPTIONS: Array<{ key: MapRegionKey; label: string }> = [
  { key: "AMERICAS", label: "América" },
  { key: "EUROPE", label: "Europa" },
  { key: "AFRICA", label: "África" },
  { key: "ASIA", label: "Asia" },
  { key: "OCEANIA", label: "Oceanía" }
];

export const AMERICAS_SUBREGION_OPTIONS: Array<{ key: AmericasSubregionKey; label: string }> = [
  { key: "NORTH_AMERICA", label: "Norte" },
  { key: "CENTRAL_AMERICA", label: "Centro" },
  { key: "SOUTH_AMERICA", label: "Sur" }
];

const EUROPE_ISO2 = new Set([
  "AL",
  "AD",
  "AT",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "SE",
  "SI",
  "SK",
  "SM",
  "UA",
  "VA"
]);

const AMERICAS_NORTH_ISO2 = new Set([
  "US",
  "CA",
  "MX",
  "BM",
  "GL",
  "PM"
]);

const AMERICAS_CENTRAL_ISO2 = new Set([
  "AI",
  "AG",
  "AW",
  "BB",
  "BL",
  "BQ",
  "BS",
  "BZ",
  "CR",
  "CU",
  "CW",
  "DM",
  "DO",
  "GD",
  "GP",
  "GT",
  "HN",
  "HT",
  "JM",
  "KN",
  "KY",
  "LC",
  "MF",
  "MQ",
  "MS",
  "NI",
  "PA",
  "PR",
  "SV",
  "SX",
  "TC",
  "TT",
  "VC",
  "VG",
  "VI"
]);

const AMERICAS_SOUTH_ISO2 = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "EC",
  "FK",
  "GF",
  "GY",
  "PE",
  "PY",
  "SR",
  "UY",
  "VE"
]);

function normalizeIso2(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function normalizeCountryName(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MAP_COUNTRY_NAME_ALIASES: Record<string, string> = {
  "bosnia and herz": "BA",
  "central african rep": "CF",
  "congo": "CG",
  "cote d ivoire": "CI",
  "dem rep congo": "CD",
  "dominican rep": "DO",
  "eq guinea": "GQ",
  "falkland is": "FK",
  "fr s antarctic lands": "TF",
  "n cyprus": "CY",
  "s sudan": "SS",
  "solomon is": "SB",
  "timor leste": "TL",
  "united states of america": "US",
  "w sahara": "EH",
  "eswatini": "SZ",
  "macedonia": "MK"
};

function buildIso2ByCountryNameIndex() {
  const index = new Map<string, string>();
  const regionNames = typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

  for (const iso2 of Object.keys(COUNTRY_CENTROIDS)) {
    const normalizedIso2 = normalizeIso2(iso2);
    if (!normalizedIso2 || normalizedIso2.length !== 2 || !regionNames) continue;
    const label = regionNames.of(normalizedIso2);
    const normalizedLabel = normalizeCountryName(label);
    if (!normalizedLabel || index.has(normalizedLabel)) continue;
    index.set(normalizedLabel, normalizedIso2);
  }

  for (const [name, iso2] of Object.entries(MAP_COUNTRY_NAME_ALIASES)) {
    const normalizedName = normalizeCountryName(name);
    const normalizedIso2 = normalizeIso2(iso2);
    if (!normalizedName || normalizedIso2.length !== 2) continue;
    index.set(normalizedName, normalizedIso2);
  }

  return index;
}

const ISO2_BY_COUNTRY_NAME = buildIso2ByCountryNameIndex();

export function resolveIso2FromMapCountryName(name: string | null | undefined) {
  const normalizedName = normalizeCountryName(name);
  if (!normalizedName) return null;
  return ISO2_BY_COUNTRY_NAME.get(normalizedName) ?? null;
}

function guessRegionFromCentroid(iso2: string): MapRegionKey {
  const centroid = getCountryCentroid(iso2);
  if (!centroid) return "AMERICAS";

  const { lat, lng } = centroid;
  if (lng <= -25) return "AMERICAS";
  if (lat >= 35 && lng >= -25 && lng <= 60) return "EUROPE";
  if (lat <= 37 && lat >= -40 && lng >= -30 && lng <= 60) return "AFRICA";
  if ((lng >= 110 && lat <= 10) || (lng > 75 && lat < -10)) return "OCEANIA";
  return "ASIA";
}

export function resolveCountryRegion(iso2: string | null | undefined): MapRegionKey {
  const normalized = normalizeIso2(iso2);
  if (!normalized) return "AMERICAS";
  if (EUROPE_ISO2.has(normalized)) return "EUROPE";
  if (
    AMERICAS_NORTH_ISO2.has(normalized) ||
    AMERICAS_CENTRAL_ISO2.has(normalized) ||
    AMERICAS_SOUTH_ISO2.has(normalized)
  ) {
    return "AMERICAS";
  }
  return guessRegionFromCentroid(normalized);
}

export function resolveAmericasSubregion(iso2: string | null | undefined): AmericasSubregionKey | null {
  const normalized = normalizeIso2(iso2);
  if (!normalized) return null;
  if (AMERICAS_NORTH_ISO2.has(normalized)) return "NORTH_AMERICA";
  if (AMERICAS_CENTRAL_ISO2.has(normalized)) return "CENTRAL_AMERICA";
  if (AMERICAS_SOUTH_ISO2.has(normalized)) return "SOUTH_AMERICA";

  const centroid = getCountryCentroid(normalized);
  if (!centroid) return null;
  if (centroid.lat >= 24) return "NORTH_AMERICA";
  if (centroid.lat <= -10) return "SOUTH_AMERICA";
  return "CENTRAL_AMERICA";
}

export function isIso2AllowedByRegionFilters(params: {
  iso2: string | null | undefined;
  selectedRegions: Set<MapRegionKey>;
  selectedAmericasSubregions: Set<AmericasSubregionKey>;
}) {
  const normalized = normalizeIso2(params.iso2);
  if (!normalized) return false;

  const allRegionsSelected = params.selectedRegions.size === 0 || params.selectedRegions.size === MAP_REGION_OPTIONS.length;
  const region = resolveCountryRegion(normalized);
  if (!allRegionsSelected && !params.selectedRegions.has(region)) return false;

  if (region !== "AMERICAS") return true;

  const allAmericasSubregionsSelected =
    params.selectedAmericasSubregions.size === 0 ||
    params.selectedAmericasSubregions.size === AMERICAS_SUBREGION_OPTIONS.length;
  if (allAmericasSubregionsSelected) return true;

  const subregion = resolveAmericasSubregion(normalized);
  return Boolean(subregion && params.selectedAmericasSubregions.has(subregion));
}

export function buildAllowedIso2Set(params: {
  selectedRegions: Set<MapRegionKey>;
  selectedAmericasSubregions: Set<AmericasSubregionKey>;
}) {
  const hasRegionSelection =
    params.selectedRegions.size > 0 &&
    params.selectedRegions.size < MAP_REGION_OPTIONS.length;
  const hasAmericasSubregionSelection =
    params.selectedRegions.has("AMERICAS") &&
    params.selectedAmericasSubregions.size > 0 &&
    params.selectedAmericasSubregions.size < AMERICAS_SUBREGION_OPTIONS.length;

  if (!hasRegionSelection && !hasAmericasSubregionSelection) {
    return null;
  }

  const allowed = new Set<string>();
  for (const iso2 of Object.keys(COUNTRY_CENTROIDS)) {
    if (
      isIso2AllowedByRegionFilters({
        iso2,
        selectedRegions: params.selectedRegions,
        selectedAmericasSubregions: params.selectedAmericasSubregions
      })
    ) {
      allowed.add(iso2);
    }
  }
  return allowed;
}
