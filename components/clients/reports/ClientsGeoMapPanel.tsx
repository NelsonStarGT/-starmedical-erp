"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Globe2, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import { getCountryCentroid } from "@/lib/clients/reports/countryCentroids";
import {
  AMERICAS_SUBREGION_OPTIONS,
  MAP_REGION_OPTIONS,
  buildAllowedIso2Set,
  resolveIso2FromMapCountryName,
  type AmericasSubregionKey,
  type MapRegionKey
} from "@/lib/clients/reports/countryRegions";
import { CLIENTS_COUNTRY_FILTER_ALL } from "@/lib/clients/operatingCountryContext";

type GeoCountryRow = {
  label: string;
  source: "catalog" | "manual";
  total: number;
  countryId: string | null;
  countryIso2: string | null;
};

type GeoRow = {
  label: string;
  source: "catalog" | "manual";
  total: number;
};

type GeoPayload = {
  countries: GeoCountryRow[];
  admin1: GeoRow[];
  admin2: GeoRow[];
};

type GeoApiResponse = {
  ok?: boolean;
  data?: {
    geo?: GeoPayload;
  };
  error?: string;
};

const WORLD_TOPOJSON_URL = "/maps/world-countries-50m.topo.json";
const MAP_MIN_ZOOM = 0.9;
const MAP_MAX_ZOOM = 10;
const DEFAULT_CENTER: [number, number] = [0, 0];

const ADM0_A3_TO_ISO2: Record<string, string> = {
  ARG: "AR",
  AUS: "AU",
  BLZ: "BZ",
  BOL: "BO",
  BRA: "BR",
  CAN: "CA",
  CHL: "CL",
  CHN: "CN",
  COL: "CO",
  CRI: "CR",
  CUB: "CU",
  DEU: "DE",
  DOM: "DO",
  ECU: "EC",
  ESP: "ES",
  FRA: "FR",
  GBR: "GB",
  GTM: "GT",
  GUY: "GY",
  HND: "HN",
  HTI: "HT",
  IND: "IN",
  ITA: "IT",
  JAM: "JM",
  JPN: "JP",
  MEX: "MX",
  NIC: "NI",
  NZL: "NZ",
  PAN: "PA",
  PER: "PE",
  PRY: "PY",
  RUS: "RU",
  SLV: "SV",
  SUR: "SR",
  TTO: "TT",
  URY: "UY",
  USA: "US",
  VEN: "VE",
  ZAF: "ZA"
};

function formatPercent(total: number, grandTotal: number) {
  if (!grandTotal) return "0%";
  return `${Math.round((total / grandTotal) * 100)}%`;
}

export function normalizeMapCountryName(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "bolivia plurinational state of": "bolivia",
  "bosnia and herz": "bosnia and herzegovina",
  "czech republic": "czechia",
  "dem rep congo": "democratic republic of the congo",
  "dominican rep": "dominican republic",
  "eq guinea": "equatorial guinea",
  "e swatini": "eswatini",
  "falkland is": "falkland islands",
  "lao pdr": "laos",
  "n mariana is": "northern mariana islands",
  "s georgia and the south sandwich is": "south georgia and south sandwich islands",
  "solomon is": "solomon islands",
  "timor leste": "east timor",
  "united states of america": "united states"
};

function applyCountryNameAlias(rawValue: string) {
  return COUNTRY_NAME_ALIASES[rawValue] ?? rawValue;
}

export function resolveGeoCountryRowByName(
  countryName: string | null | undefined,
  index: ReadonlyMap<string, GeoCountryRow>
) {
  const normalizedCountryName = applyCountryNameAlias(normalizeMapCountryName(countryName));
  if (!normalizedCountryName) return null;
  return index.get(normalizedCountryName) ?? null;
}

function normalizeFilterCountryId(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toUpperCase() === CLIENTS_COUNTRY_FILTER_ALL) {
    return null;
  }
  return normalized;
}

function normalizeIso2(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

function normalizeIso3(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized.length === 3 ? normalized : null;
}

function resolveIso2FromAdm0A3(value: string | null | undefined) {
  const normalized = normalizeIso3(value);
  if (!normalized) return null;
  return ADM0_A3_TO_ISO2[normalized] ?? null;
}

type MapGeoFeature = {
  id?: string | number;
  properties?: Record<string, unknown>;
};

export function getFeatureIso2(geo: MapGeoFeature): string | null {
  const properties = geo.properties ?? {};
  const fromIsoA2 =
    normalizeIso2(String(properties.ISO_A2 ?? ""))
    || normalizeIso2(String(properties.iso_a2 ?? ""));
  if (fromIsoA2) return fromIsoA2;

  const fromAdm0A3 = resolveIso2FromAdm0A3(String(properties.ADM0_A3 ?? ""));
  if (fromAdm0A3) return fromAdm0A3;

  const fromIdIso2 = normalizeIso2(String(geo.id ?? ""));
  if (fromIdIso2) return fromIdIso2;

  const fromName = resolveIso2FromMapCountryName(
    String(properties.name ?? properties.NAME ?? "")
  );
  if (fromName) return fromName;

  return null;
}

function buildCountryColor(total: number, peak: number) {
  if (!total || !peak) return "#eef2ff";
  const ratio = Math.max(0, Math.min(1, total / peak));
  const start = { r: 173, g: 216, b: 245 };
  const end = { r: 46, g: 117, b: 186 };
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function parseErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { error?: unknown }).error;
  if (typeof message === "string" && message.trim().length > 0) return message.trim();
  return fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundCoord(n: number, digits = 5) {
  return Number(n.toFixed(digits));
}

function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}

type LayerMode = "map" | "bubbles" | "both";

export default function ClientsGeoMapPanel({
  initialGeo,
  baseQuery,
  initialCountryId,
  initialCountryLabel
}: {
  initialGeo: GeoPayload;
  baseQuery: string;
  initialCountryId?: string | null;
  initialCountryLabel?: string;
}) {
  const router = useRouter();
  const isClient = useIsClient();
  const guatemalaDebugLoggedRef = useRef(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(normalizeFilterCountryId(initialCountryId));
  const [selectedCountryLabel, setSelectedCountryLabel] = useState<string>(
    initialCountryLabel || "Todos los países"
  );
  const [detailGeo, setDetailGeo] = useState<GeoPayload>(initialGeo);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [layerMode, setLayerMode] = useState<LayerMode>("both");
  const [selectedRegions, setSelectedRegions] = useState<MapRegionKey[]>(MAP_REGION_OPTIONS.map((item) => item.key));
  const [selectedAmericasSubregions, setSelectedAmericasSubregions] = useState<AmericasSubregionKey[]>(
    AMERICAS_SUBREGION_OPTIONS.map((item) => item.key)
  );

  useEffect(() => {
    setDetailGeo(initialGeo);
  }, [initialGeo]);

  useEffect(() => {
    const nextCountryId = normalizeFilterCountryId(initialCountryId);
    setSelectedCountryId(nextCountryId);
    if (nextCountryId) {
      setSelectedCountryLabel(initialCountryLabel || "País");
      return;
    }
    setSelectedCountryLabel("Todos los países");
  }, [initialCountryId, initialCountryLabel]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedCountryId) {
        setDetailGeo(initialGeo);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const prefix = baseQuery ? `${baseQuery}&` : "";
        const res = await fetch(`/api/clientes/reportes/geo?${prefix}countryId=${encodeURIComponent(selectedCountryId)}`, {
          cache: "no-store"
        });
        const payload = (await res.json().catch(() => ({}))) as GeoApiResponse;
        if (!res.ok || payload.ok === false || !payload.data?.geo) {
          throw new Error(payload.error || "No se pudo cargar el detalle geográfico.");
        }
        if (!cancelled) {
          setDetailGeo(payload.data.geo);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error)?.message || "No se pudo cargar el detalle geográfico.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [baseQuery, initialGeo, selectedCountryId]);

  const countryIndex = useMemo(() => {
    const index = new Map<string, GeoCountryRow>();
    for (const country of initialGeo.countries) {
      const normalized = applyCountryNameAlias(normalizeMapCountryName(country.label));
      if (!normalized || index.has(normalized)) continue;
      index.set(normalized, country);
    }
    return index;
  }, [initialGeo.countries]);
  const countryByIso2 = useMemo(() => {
    const index = new Map<string, GeoCountryRow>();
    for (const country of initialGeo.countries) {
      const iso2 = normalizeIso2(country.countryIso2);
      if (!iso2 || index.has(iso2)) continue;
      index.set(iso2, country);
    }
    return index;
  }, [initialGeo.countries]);
  const countryIso2ById = useMemo(() => {
    const index = new Map<string, string>();
    for (const country of initialGeo.countries) {
      const iso2 = normalizeIso2(country.countryIso2);
      if (!iso2 || !country.countryId || index.has(country.countryId)) continue;
      index.set(country.countryId, iso2);
    }
    return index;
  }, [initialGeo.countries]);
  const selectedCountryIso2 = useMemo(() => {
    if (!selectedCountryId) return null;
    return countryIso2ById.get(selectedCountryId) ?? null;
  }, [countryIso2ById, selectedCountryId]);

  const peak = useMemo(
    () => initialGeo.countries.reduce((max, country) => Math.max(max, country.total), 0),
    [initialGeo.countries]
  );
  const grandTotal = useMemo(
    () => initialGeo.countries.reduce((total, country) => total + country.total, 0),
    [initialGeo.countries]
  );
  const bubblePeak = useMemo(
    () => initialGeo.countries.reduce((max, country) => Math.max(max, country.total), 0),
    [initialGeo.countries]
  );
  const regionsSet = useMemo(() => new Set(selectedRegions), [selectedRegions]);
  const americasSubregionsSet = useMemo(
    () => new Set(selectedAmericasSubregions),
    [selectedAmericasSubregions]
  );
  const allowedIso2Set = useMemo(
    () =>
      buildAllowedIso2Set({
        selectedRegions: regionsSet,
        selectedAmericasSubregions: americasSubregionsSet
      }),
    [americasSubregionsSet, regionsSet]
  );
  const showChoropleth = layerMode === "map" || layerMode === "both";
  const showBubbles = layerMode === "bubbles" || layerMode === "both";
  const visibleCountries = useMemo(
    () =>
      initialGeo.countries.filter((row) => {
        const iso2 = normalizeIso2(row.countryIso2);
        if (!allowedIso2Set) return true;
        return Boolean(iso2 && allowedIso2Set.has(iso2));
      }),
    [allowedIso2Set, initialGeo.countries]
  );
  const bubblePoints = useMemo(() => {
    if (!showBubbles) return [];

    return visibleCountries
      .map((row) => {
        if (!row.countryId || !row.countryIso2 || row.total <= 0) return null;
        const centroid = getCountryCentroid(row.countryIso2);
        if (!centroid) return null;
        const ratio = bubblePeak ? Math.sqrt(row.total / bubblePeak) : 0;
        const radius = 5 + ratio * 19;
        return {
          ...row,
          radius: roundCoord(clamp(radius, 5, 24), 1),
          lat: roundCoord(centroid.lat),
          lng: roundCoord(centroid.lng)
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [bubblePeak, showBubbles, visibleCountries]);

  async function persistCountryFilter(nextCountryId: string | null, nextCountryLabel: string) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/clientes/operating-country", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryId: nextCountryId || CLIENTS_COUNTRY_FILTER_ALL })
      });
      const payload = (await response.json().catch(() => ({}))) as GeoApiResponse;
      if (!response.ok || payload.ok === false) {
        throw new Error(parseErrorMessage(payload, "No se pudo actualizar el filtro de país."));
      }
      setSelectedCountryId(nextCountryId);
      setSelectedCountryLabel(nextCountryId ? nextCountryLabel : "Todos los países");
      setError(null);
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar el filtro de país.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetMapView() {
    setCenter(DEFAULT_CENTER);
    setZoom(1);
  }

  function resetMapFilters() {
    setSelectedRegions(MAP_REGION_OPTIONS.map((item) => item.key));
    setSelectedAmericasSubregions(AMERICAS_SUBREGION_OPTIONS.map((item) => item.key));
    setLayerMode("both");
  }

  function toggleRegion(key: MapRegionKey) {
    setSelectedRegions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function toggleAmericasSubregion(key: AmericasSubregionKey) {
    setSelectedAmericasSubregions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Mapa mundial</p>
            <p className="text-sm text-slate-600">Coropleta por país (click para filtrar y drill-down).</p>
          </div>
          <button
            type="button"
            onClick={() => void persistCountryFilter(null, "Todos los países")}
            disabled={isSaving}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Reset país
          </button>
        </div>

        <div className="mb-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
              {(
                [
                  { key: "map", label: "Mapa" },
                  { key: "bubbles", label: "Burbujas" },
                  { key: "both", label: "Ambos" }
                ] satisfies Array<{ key: LayerMode; label: string }>
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setLayerMode(option.key)}
                  className={
                    layerMode === option.key
                      ? "border-r border-slate-200 bg-[#2e75ba] px-3 py-1.5 text-xs font-semibold text-white last:border-r-0"
                      : "border-r border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#2e75ba] last:border-r-0"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={resetMapFilters}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Reset filtros mapa
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MAP_REGION_OPTIONS.map((option) => {
              const active = selectedRegions.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleRegion(option.key)}
                  className={
                    active
                      ? "rounded-full border border-[#2e75ba] bg-[#e8f1fb] px-2.5 py-1 text-xs font-semibold text-[#2e75ba]"
                      : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {selectedRegions.includes("AMERICAS") && (
            <div className="flex flex-wrap gap-1.5">
              {AMERICAS_SUBREGION_OPTIONS.map((option) => {
                const active = selectedAmericasSubregions.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => toggleAmericasSubregion(option.key)}
                    className={
                      active
                        ? "rounded-full border border-[#4aa59c] bg-[#eaf9f7] px-2.5 py-1 text-xs font-semibold text-[#1f7f77]"
                        : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-[#4aa59c] hover:text-[#1f7f77]"
                    }
                  >
                    América {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#eef6ff)]">
          <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setZoom((current) => clamp(Number((current * 2).toFixed(3)), MAP_MIN_ZOOM, MAP_MAX_ZOOM))}
              aria-label="Acercar mapa"
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((current) => clamp(Number((current / 2).toFixed(3)), MAP_MIN_ZOOM, MAP_MAX_ZOOM))}
              aria-label="Alejar mapa"
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={resetMapView}
              aria-label="Resetear vista del mapa"
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <ComposableMap projection="geoMercator" projectionConfig={{ scale: 145 }} className="h-[320px] w-full">
            <ZoomableGroup
              center={center}
              zoom={zoom}
              minZoom={MAP_MIN_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              onMoveEnd={(position) => {
                setCenter(position.coordinates);
                setZoom(clamp(position.zoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM));
              }}
            >
              <Geographies geography={WORLD_TOPOJSON_URL}>
                {({
                  geographies
                }: {
                  geographies: Array<{
                    rsmKey: string;
                    properties?: {
                      name?: string;
                      NAME?: string;
                      ISO_A2?: string;
                      iso_a2?: string;
                      iso2?: string;
                      ISO2?: string;
                    };
                  }>;
                }) =>
                  geographies.map((geo) => {
                    const rawCountryName =
                      String((geo as { properties?: { name?: string; NAME?: string } }).properties?.name || "")
                      || String((geo as { properties?: { name?: string; NAME?: string } }).properties?.NAME || "");
                    const rowByName = resolveGeoCountryRowByName(rawCountryName, countryIndex);
                    const geoProperties = (geo as { properties?: Record<string, string | undefined> }).properties;
                    const geoIso2 = getFeatureIso2({
                      id: (geo as { id?: string | number }).id,
                      properties: geoProperties as Record<string, unknown> | undefined
                    });
                    const rowByIso = geoIso2 ? countryByIso2.get(geoIso2) ?? null : null;
                    const row = rowByIso ?? rowByName;
                    if (
                      process.env.NODE_ENV !== "production" &&
                      !guatemalaDebugLoggedRef.current &&
                      normalizeMapCountryName(rawCountryName) === "guatemala"
                    ) {
                      guatemalaDebugLoggedRef.current = true;
                      console.info("[clients-reports][geo-debug] Guatemala feature", {
                        id: (geo as { id?: string | number }).id ?? null,
                        featureIso2: geoIso2,
                        properties: {
                          ISO_A2: geoProperties?.ISO_A2 ?? null,
                          iso_a2: geoProperties?.iso_a2 ?? null,
                          ADM0_A3: geoProperties?.ADM0_A3 ?? null,
                          name: geoProperties?.name ?? null,
                          NAME: geoProperties?.NAME ?? null
                        }
                      });
                    }
                    const allowedByRegion = !allowedIso2Set || Boolean(geoIso2 && allowedIso2Set.has(geoIso2));
                    const selected = Boolean(selectedCountryIso2 && geoIso2 && selectedCountryIso2 === geoIso2);
                    const total = row?.total ?? 0;
                    const baseFill = showChoropleth && allowedByRegion ? buildCountryColor(total, peak) : "#f8fafc";
                    const fill = selected && allowedByRegion ? "rgba(74, 165, 156, 0.6)" : baseFill;
                    const opacity = allowedByRegion ? 1 : 0.34;
                    const share = formatPercent(total, grandTotal);
                    const displayName = row?.label || rawCountryName || "País";
                    const canClick = Boolean(row?.countryId) && allowedByRegion && !isSaving;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => {
                          if (!canClick || !row) return;
                          void persistCountryFilter(row.countryId, row.label);
                        }}
                        style={{
                          default: {
                            fill,
                            opacity,
                            stroke: selected ? "#2e75ba" : "#e2e8f0",
                            strokeWidth: selected ? 1.1 : 0.5,
                            outline: "none"
                          },
                          hover: {
                            fill: canClick ? (selected ? "rgba(74, 165, 156, 0.68)" : fill) : fill,
                            opacity,
                            stroke: canClick ? "#4aadf5" : selected ? "#2e75ba" : "#e2e8f0",
                            strokeWidth: canClick ? 1 : selected ? 1.1 : 0.5,
                            outline: "none",
                            cursor: canClick ? "pointer" : "default"
                          },
                          pressed: {
                            fill: canClick ? "rgba(74, 165, 156, 0.74)" : fill,
                            opacity,
                            stroke: canClick ? "#2e75ba" : selected ? "#2e75ba" : "#e2e8f0",
                            strokeWidth: canClick ? 1.1 : selected ? 1.1 : 0.5,
                            outline: "none"
                          }
                        }}
                      >
                        <title>{`${displayName}: ${total} (${share})`}</title>
                      </Geography>
                    );
                  })
                }
              </Geographies>

              {isClient &&
                showBubbles &&
                bubblePoints.map((row) => {
                  const selected = selectedCountryId === row.countryId;
                  const coords: [number, number] = [roundCoord(row.lng), roundCoord(row.lat)];
                  return (
                    <Marker key={`bubble-${row.countryId}`} coordinates={coords}>
                      <circle
                        r={row.radius}
                        fill={selected ? "rgba(74, 165, 156, 0.68)" : "rgba(46, 117, 186, 0.55)"}
                        stroke={selected ? "#2e75ba" : "#4aadf5"}
                        strokeWidth={selected ? 0.95 : 0.75}
                        className="cursor-pointer transition-all"
                        onClick={() => {
                          if (!row.countryId || isSaving) return;
                          void persistCountryFilter(row.countryId, row.label);
                        }}
                      >
                        <title>{`${row.label}: ${row.total}`}</title>
                      </circle>
                    </Marker>
                  );
                })}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </article>

      <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe2 size={15} className="text-[#2e75ba]" />
          <p className="text-sm font-semibold text-slate-900">Detalle geográfico</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">País seleccionado: {selectedCountryLabel}</p>

        {(loading || isSaving) && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            {isSaving ? "Aplicando filtro..." : "Cargando detalle..."}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
        )}

        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2e75ba]">Top países</p>
            <div className="mt-2 max-h-44 space-y-1 overflow-auto pr-1">
              {visibleCountries.map((row) => (
                <button
                  key={`${row.label}-${row.countryId || "manual"}`}
                  type="button"
                  disabled={!row.countryId}
                  onClick={() => {
                    if (!row.countryId) return;
                    void persistCountryFilter(row.countryId, row.label);
                  }}
                  className={
                    row.countryId
                      ? "flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      : "flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs text-slate-400"
                  }
                >
                  <span className="truncate">{row.label}</span>
                  <span className="font-semibold">{row.total}</span>
                </button>
              ))}
              {visibleCountries.length === 0 && <p className="text-xs text-slate-500">Sin datos para esta región.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2e75ba]">Admin 1</p>
            <div className="mt-2 max-h-32 space-y-1 overflow-auto pr-1">
              {detailGeo.admin1.map((row, index) => (
                <div key={`${row.label}-${index}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  <span className="truncate">{row.label}</span>
                  <span className="font-semibold">{row.total}</span>
                </div>
              ))}
              {detailGeo.admin1.length === 0 && <p className="text-xs text-slate-500">Sin datos.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2e75ba]">Admin 2</p>
            <div className="mt-2 max-h-32 space-y-1 overflow-auto pr-1">
              {detailGeo.admin2.map((row, index) => (
                <div key={`${row.label}-${index}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  <span className="truncate">{row.label}</span>
                  <span className="font-semibold">{row.total}</span>
                </div>
              ))}
              {detailGeo.admin2.length === 0 && <p className="text-xs text-slate-500">Sin datos.</p>}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
