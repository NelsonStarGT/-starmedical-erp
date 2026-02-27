"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CountryPicker, { type CountryPickerOption } from "@/components/clients/CountryPicker";
import GeoSearchSelect, { type GeoSearchOption } from "@/components/clients/GeoSearchSelect";
import { isGeoAuthErrorLike, mapGeoLoadErrorMessage, sanitizeGeoDivisionDisplayName } from "@/lib/clients/geoUi";
import { cn } from "@/lib/utils";

type PostalMatch = {
  id: string;
  postalCode: string;
  divisionId?: string | null;
  divisionPath?: Array<{ id: string; level: number; code: string; name: string }>;
  labels?: {
    level1Label: string;
    level2Label: string;
    level3Label?: string | null;
    maxLevel: number;
  };
  label?: string | null;
  dataSource?: "official" | "operational";
  isOperational?: boolean;
  country: { id: string; code: string; name: string };
  admin1?: { id: string; code: string; name: string } | null;
  admin2?: { id: string; code: string; name: string } | null;
  admin3?: { id: string; code: string; name: string } | null;
  admin1Id?: string | null;
  admin2Id?: string | null;
  admin3Id?: string | null;
};

export type LocationPickerValue = {
  countryId: string;
  departmentId: string;
  municipalityId: string;
  admin3Id: string;
  postalCode: string;
  freeState?: string;
  freeCity?: string;
};

export type LocationPickerErrors = Partial<Record<keyof LocationPickerValue, string>>;

type ApiResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
};

type GeoRequestError = Error & {
  isAuth?: boolean;
};

type CountryApiItem = {
  id: string;
  code: string;
  iso3?: string | null;
  name: string;
  isActive: boolean;
  meta?: {
    level1Label?: string | null;
    level2Label?: string | null;
    level3Label?: string | null;
    maxLevel?: number | null;
  } | null;
};

type DivisionApiItem = {
  id: string;
  countryId: string;
  level: number;
  code: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  dataSource?: "official" | "operational";
};

type PostalApiResponse = {
  ok?: boolean;
  match?: PostalMatch | null;
  items?: PostalMatch[];
  error?: string;
};

type GeoLabels = {
  admin1: string;
  admin2: string;
  admin3: string;
  showAdmin3: boolean;
};

const DEFAULT_LABELS: GeoLabels = {
  admin1: "Nivel 1",
  admin2: "Nivel 2",
  admin3: "Nivel 3",
  showAdmin3: false
};

function resolveGeoLabels(): GeoLabels {
  return DEFAULT_LABELS;
}

function normalizePostalCode(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function ensureCountries(input: unknown): CountryApiItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is CountryApiItem => {
    if (!item || typeof item !== "object") return false;
    const value = item as Partial<CountryApiItem>;
    return typeof value.id === "string" && typeof value.code === "string" && typeof value.name === "string";
  });
}

function ensureDivisions(input: unknown): DivisionApiItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is DivisionApiItem => {
    if (!item || typeof item !== "object") return false;
    const value = item as Partial<DivisionApiItem>;
    return (
      typeof value.id === "string" &&
      typeof value.code === "string" &&
      typeof value.name === "string" &&
      typeof value.level === "number"
    );
  });
}

function ensurePostalArray(input: unknown): PostalMatch[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is PostalMatch => {
    if (!item || typeof item !== "object") return false;
    const value = item as Partial<PostalMatch>;
    return (
      typeof value.id === "string" &&
      typeof value.postalCode === "string" &&
      !!value.country &&
      typeof value.country.id === "string" &&
      typeof value.country.code === "string" &&
      typeof value.country.name === "string"
    );
  });
}

function toCountryOption(item: CountryApiItem): CountryPickerOption {
  return {
    id: item.id,
    code: item.code,
    iso3: item.iso3 ?? null,
    name: item.name,
    isActive: item.isActive
  };
}

function toGeoOption(item: DivisionApiItem): GeoSearchOption {
  return {
    id: item.id,
    code: item.code,
    name: sanitizeGeoDivisionDisplayName(item.name, item.code),
    isActive: item.isActive
  };
}

function buildGeoRequestError(params: {
  status: number;
  message?: string;
  fallbackMessage: string;
}): GeoRequestError {
  const isAuth = params.status === 401 || params.status === 403 || isGeoAuthErrorLike(params.message);
  return Object.assign(new Error(mapGeoLoadErrorMessage(params.message, params.fallbackMessage)), { isAuth });
}

export default function LocationPicker({
  value,
  onChange,
  disabled,
  errors,
  className,
  idPrefix,
  title = "Ubicación",
  subtitle,
  showPostalCode = true,
  onCatalogModeChange
}: {
  value: LocationPickerValue;
  onChange: (next: LocationPickerValue) => void;
  disabled?: boolean;
  errors?: LocationPickerErrors;
  className?: string;
  idPrefix?: string;
  title?: string;
  subtitle?: string;
  showPostalCode?: boolean;
  onCatalogModeChange?: (hasDivisionCatalog: boolean) => void;
}) {
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingAdmin3, setIsLoadingAdmin3] = useState(false);
  const [isLoadingPostal, setIsLoadingPostal] = useState(false);

  const [countries, setCountries] = useState<CountryApiItem[]>([]);
  const [departments, setDepartments] = useState<DivisionApiItem[]>([]);
  const [municipalities, setMunicipalities] = useState<DivisionApiItem[]>([]);
  const [admin3Options, setAdmin3Options] = useState<DivisionApiItem[]>([]);
  const [postalInput, setPostalInput] = useState("");
  const [postalMatches, setPostalMatches] = useState<PostalMatch[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [hasDivisionCatalog, setHasDivisionCatalog] = useState(true);

  const skipPostalLookupRef = useRef(false);
  const skipReverseLookupRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const lastCatalogModeNotifiedRef = useRef<boolean | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const emitChange = useCallback(
    (next: LocationPickerValue) => {
      if (
        value.countryId === next.countryId &&
        value.departmentId === next.departmentId &&
        value.municipalityId === next.municipalityId &&
        value.admin3Id === next.admin3Id &&
        value.postalCode === next.postalCode &&
        (value.freeState ?? "") === (next.freeState ?? "") &&
        (value.freeCity ?? "") === (next.freeCity ?? "")
      ) {
        return false;
      }
      onChangeRef.current(next);
      return true;
    },
    [
      value.admin3Id,
      value.countryId,
      value.departmentId,
      value.freeCity,
      value.freeState,
      value.municipalityId,
      value.postalCode
    ]
  );

  const isDisabled = Boolean(disabled);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === value.countryId) ?? null,
    [countries, value.countryId]
  );

  const labels = useMemo(() => {
    const fallback = resolveGeoLabels();
    const meta = selectedCountry?.meta;
    if (!meta) return fallback;

    const level1 = (meta.level1Label || "").trim() || fallback.admin1;
    const level2 = (meta.level2Label || "").trim() || fallback.admin2;
    const level3 = (meta.level3Label || "").trim() || fallback.admin3;
    const maxLevel = Number.isFinite(meta.maxLevel) ? Number(meta.maxLevel) : fallback.showAdmin3 ? 3 : 2;

    return {
      admin1: level1,
      admin2: level2,
      admin3: level3,
      showAdmin3: maxLevel >= 3
    } satisfies GeoLabels;
  }, [selectedCountry]);

  const showAdmin3 = labels.showAdmin3 || admin3Options.length > 0 || Boolean(value.admin3Id);

  const computedSubtitle =
    subtitle ||
    (hasDivisionCatalog
      ? `Selecciona País → ${labels.admin1} → ${labels.admin2}${showAdmin3 ? ` → ${labels.admin3}` : ""}`
      : "País sin catálogo oficial: se habilita Estado/Provincia y Ciudad en texto libre.");

  const applyPostalMatch = useCallback(
    (match: PostalMatch) => {
      skipReverseLookupRef.current = true;

      const nextCountryId = match.country.id || value.countryId;
      const nextDepartmentId = match.admin1Id ?? match.admin1?.id ?? "";
      const nextMunicipalityId = match.admin2Id ?? match.admin2?.id ?? "";
      const nextAdmin3Id = match.admin3Id ?? match.admin3?.id ?? "";

      emitChange({
        countryId: nextCountryId,
        departmentId: hasDivisionCatalog ? nextDepartmentId : "",
        municipalityId: hasDivisionCatalog ? nextMunicipalityId : "",
        admin3Id: hasDivisionCatalog ? nextAdmin3Id : "",
        postalCode: match.postalCode,
        freeState: hasDivisionCatalog ? value.freeState ?? "" : (match.admin1?.name ?? value.freeState ?? ""),
        freeCity: hasDivisionCatalog ? value.freeCity ?? "" : (match.admin2?.name ?? value.freeCity ?? "")
      });

      setPostalMatches((prev) => (prev.length ? [] : prev));
      setError((prev) => (prev === null ? prev : null));
    },
    [emitChange, hasDivisionCatalog, value.countryId, value.freeCity, value.freeState]
  );

  useEffect(() => {
    const nextPostal = value.postalCode || "";
    setPostalInput((prev) => (prev === nextPostal ? prev : nextPostal));
  }, [value.postalCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      setIsLoadingCountries(true);
      try {
        const res = await fetch("/api/geo/countries?active=1&limit=350", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<CountryApiItem>;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudo cargar paises."
          });
        }
        if (cancelled) return;
        setCountries(ensureCountries(json.items));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setCountries([]);
        setError(mapGeoLoadErrorMessage((err as Error)?.message, "No se pudo cargar paises."));
      } finally {
        if (!cancelled) setIsLoadingCountries(false);
      }
    }

    void loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!value.countryId) {
      setDepartments((prev) => (prev.length ? [] : prev));
      setMunicipalities((prev) => (prev.length ? [] : prev));
      setAdmin3Options((prev) => (prev.length ? [] : prev));
      setPostalMatches((prev) => (prev.length ? [] : prev));
      setHasDivisionCatalog((prev) => (prev ? prev : true));
      return;
    }

    async function loadDepartments() {
      setIsLoadingDepartments(true);
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          level: "1",
          active: "1",
          limit: "600"
        });
        const res = await fetch(`/api/geo/divisions?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<DivisionApiItem>;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudieron cargar divisiones de primer nivel."
          });
        }
        if (cancelled) return;
        const items = ensureDivisions(json.items);
        setDepartments(items);
        setHasDivisionCatalog((prev) => (prev === (items.length > 0) ? prev : items.length > 0));
        setError((prev) => (prev === null ? prev : null));
      } catch (err) {
        if (cancelled) return;
        const geoError = err as GeoRequestError;
        setDepartments([]);
        setHasDivisionCatalog((prev) => {
          const next = !geoError.isAuth ? false : true;
          return prev === next ? prev : next;
        });
        setError(mapGeoLoadErrorMessage(geoError.message, "No se pudieron cargar divisiones de primer nivel."));
      } finally {
        if (!cancelled) setIsLoadingDepartments(false);
      }
    }

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [value.countryId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDivisionCatalog || !value.departmentId) {
      setMunicipalities((prev) => (prev.length ? [] : prev));
      setAdmin3Options((prev) => (prev.length ? [] : prev));
      return;
    }

    async function loadMunicipalities() {
      setIsLoadingMunicipalities(true);
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          level: "2",
          parentId: value.departmentId,
          active: "1",
          limit: "700"
        });
        const res = await fetch(`/api/geo/divisions?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<DivisionApiItem>;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudieron cargar divisiones de segundo nivel."
          });
        }
        if (cancelled) return;
        setMunicipalities(ensureDivisions(json.items));
        setError((prev) => (prev === null ? prev : null));
      } catch (err) {
        if (cancelled) return;
        setMunicipalities((prev) => (prev.length ? [] : prev));
        setError(mapGeoLoadErrorMessage((err as Error)?.message, "No se pudieron cargar divisiones de segundo nivel."));
      } finally {
        if (!cancelled) setIsLoadingMunicipalities(false);
      }
    }

    void loadMunicipalities();
    return () => {
      cancelled = true;
    };
  }, [hasDivisionCatalog, value.countryId, value.departmentId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDivisionCatalog || !value.municipalityId) {
      setAdmin3Options((prev) => (prev.length ? [] : prev));
      return;
    }

    async function loadAdmin3() {
      setIsLoadingAdmin3(true);
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          level: "3",
          parentId: value.municipalityId,
          active: "1",
          limit: "700"
        });
        const res = await fetch(`/api/geo/divisions?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<DivisionApiItem>;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudieron cargar divisiones de tercer nivel."
          });
        }
        if (cancelled) return;
        setAdmin3Options(ensureDivisions(json.items));
        setError((prev) => (prev === null ? prev : null));
      } catch (err) {
        if (cancelled) return;
        setAdmin3Options((prev) => (prev.length ? [] : prev));
        setError(mapGeoLoadErrorMessage((err as Error)?.message, "No se pudieron cargar divisiones de tercer nivel."));
      } finally {
        if (!cancelled) setIsLoadingAdmin3(false);
      }
    }

    void loadAdmin3();
    return () => {
      cancelled = true;
    };
  }, [hasDivisionCatalog, value.countryId, value.municipalityId]);

  useEffect(() => {
    if (skipPostalLookupRef.current) {
      skipPostalLookupRef.current = false;
      return;
    }

    let cancelled = false;
    const normalizedPostal = normalizePostalCode(postalInput);

    if (!value.countryId || normalizedPostal.length < 3) {
      if (!normalizedPostal.length) {
        setPostalMatches((prev) => (prev.length ? [] : prev));
      }
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoadingPostal(true);
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          postalCode: normalizedPostal,
          limit: "30"
        });
        const res = await fetch(`/api/geo/postal?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as PostalApiResponse;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudo buscar el codigo postal."
          });
        }
        if (cancelled) return;

        const items = ensurePostalArray(json.items);
        if (items.length === 1) {
          applyPostalMatch(items[0]);
          skipPostalLookupRef.current = true;
          setPostalInput((prev) => (prev === items[0].postalCode ? prev : items[0].postalCode));
          return;
        }

        setPostalMatches(items);
        setError((prev) => (prev === null ? prev : null));
      } catch (err) {
        if (cancelled) return;
        setPostalMatches((prev) => (prev.length ? [] : prev));
        setError(mapGeoLoadErrorMessage((err as Error)?.message, "No se pudo buscar el codigo postal."));
      } finally {
        if (!cancelled) setIsLoadingPostal(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [applyPostalMatch, postalInput, value.countryId]);

  useEffect(() => {
    if (skipReverseLookupRef.current) {
      skipReverseLookupRef.current = false;
      return;
    }

    if (!hasDivisionCatalog) return;

    let cancelled = false;

    if (!value.countryId) return;
    if (!value.departmentId && !value.municipalityId && !value.admin3Id) return;

    const timeout = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          limit: "20"
        });
        if (value.departmentId) query.set("admin1Id", value.departmentId);
        if (value.municipalityId) query.set("admin2Id", value.municipalityId);
        if (value.admin3Id) query.set("admin3Id", value.admin3Id);

        const res = await fetch(`/api/geo/postal?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as PostalApiResponse;
        if (!res.ok || json.ok === false) {
          throw buildGeoRequestError({
            status: res.status,
            message: json.error,
            fallbackMessage: "No se pudo resolver codigo postal para la ubicacion."
          });
        }
        if (cancelled) return;

        const items = ensurePostalArray(json.items);
        if (items.length === 1) {
          skipPostalLookupRef.current = true;
          setPostalInput((prev) => (prev === items[0].postalCode ? prev : items[0].postalCode));
          emitChange({
            countryId: value.countryId,
            departmentId: value.departmentId,
            municipalityId: value.municipalityId,
            admin3Id: value.admin3Id,
            postalCode: items[0].postalCode,
            freeState: value.freeState ?? "",
            freeCity: value.freeCity ?? ""
          });
          setPostalMatches((prev) => (prev.length ? [] : prev));
          return;
        }

        if (items.length > 1) {
          setPostalMatches(items);
          return;
        }

        if (!value.admin3Id) {
          setPostalMatches((prev) => (prev.length ? [] : prev));
        }
      } catch {
        if (!cancelled) setPostalMatches((prev) => (prev.length ? [] : prev));
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    emitChange,
    hasDivisionCatalog,
    value.admin3Id,
    value.countryId,
    value.departmentId,
    value.freeCity,
    value.freeState,
    value.municipalityId
  ]);

  const postalHintWithoutCountry = Boolean(!value.countryId && postalInput.trim().length > 0);

  const countryOptions = useMemo(() => countries.map(toCountryOption), [countries]);
  const departmentOptions = useMemo(() => departments.map(toGeoOption), [departments]);
  const municipalityOptions = useMemo(() => municipalities.map(toGeoOption), [municipalities]);
  const admin3SearchOptions = useMemo(() => admin3Options.map(toGeoOption), [admin3Options]);
  const postalMatchOptions = useMemo<GeoSearchOption[]>(
    () =>
      postalMatches.map((match) => ({
        id: match.id,
        code: match.postalCode,
        name: `${match.postalCode}${match.label ? ` · ${match.label}` : ""}${
          match.isOperational || match.dataSource === "operational" ? " · Operativo" : ""
        }`
      })),
    [postalMatches]
  );

  useEffect(() => {
    if (!onCatalogModeChange) return;
    if (lastCatalogModeNotifiedRef.current === hasDivisionCatalog) return;
    lastCatalogModeNotifiedRef.current = hasDivisionCatalog;
    onCatalogModeChange(hasDivisionCatalog);
  }, [hasDivisionCatalog, onCatalogModeChange]);

  const postalInputId = idPrefix ? `${idPrefix}-postal-code` : undefined;
  const countryTriggerId = idPrefix ? `${idPrefix}-country` : undefined;
  const admin1TriggerId = idPrefix ? `${idPrefix}-admin1` : undefined;
  const admin2TriggerId = idPrefix ? `${idPrefix}-admin2` : undefined;
  const admin3TriggerId = idPrefix ? `${idPrefix}-admin3` : undefined;
  const freeStateInputId = idPrefix ? `${idPrefix}-free-state` : undefined;
  const freeCityInputId = idPrefix ? `${idPrefix}-free-city` : undefined;

  return (
    <section className={cn("space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{computedSubtitle}</p>
      </div>

      {showPostalCode ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Código postal (opcional)</p>
            <input
              id={postalInputId}
              value={postalInput}
              onChange={(event) => {
                const nextPostal = event.target.value;
                setPostalInput((prev) => (prev === nextPostal ? prev : nextPostal));
                emitChange({
                  countryId: value.countryId,
                  departmentId: value.departmentId,
                  municipalityId: value.municipalityId,
                  admin3Id: value.admin3Id,
                  postalCode: nextPostal,
                  freeState: value.freeState ?? "",
                  freeCity: value.freeCity ?? ""
                });
              }}
              placeholder={value.countryId ? "Ej. 05011" : "Puedes escribir CP; selecciona país para resolver"}
              disabled={isDisabled}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                errors?.postalCode && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
                isDisabled && "cursor-not-allowed bg-slate-100 text-slate-400"
              )}
            />
            {isLoadingPostal ? <p className="text-xs text-slate-500">Buscando código postal...</p> : null}
            {postalHintWithoutCountry ? (
              <p className="text-xs text-amber-700">Selecciona un país para resolver el código postal automáticamente.</p>
            ) : null}
            {errors?.postalCode ? <p className="text-xs text-rose-700">{errors.postalCode}</p> : null}
          </div>

          {postalMatches.length > 1 ? (
            <div className="space-y-1">
              <GeoSearchSelect
                label="Coincidencias de código postal"
                value=""
                options={postalMatchOptions}
                placeholder="Selecciona una coincidencia"
                disabled={isDisabled}
                onChange={(selectedId) => {
                  const match = postalMatches.find((item) => item.id === selectedId);
                  if (!match) return;
                  skipPostalLookupRef.current = true;
                  setPostalInput((prev) => (prev === match.postalCode ? prev : match.postalCode));
                  applyPostalMatch(match);
                }}
              />
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
      ) : null}

      <div className={cn("grid gap-3", hasDivisionCatalog ? (showAdmin3 ? "md:grid-cols-4" : "md:grid-cols-3") : "md:grid-cols-3")}>
        <CountryPicker
          triggerId={countryTriggerId}
          value={value.countryId}
          options={countryOptions}
          onChange={(countryId) => {
            setPostalMatches((prev) => (prev.length ? [] : prev));
            emitChange({
              countryId,
              departmentId: "",
              municipalityId: "",
              admin3Id: "",
              postalCode: "",
              freeState: "",
              freeCity: ""
            });
          }}
          disabled={isDisabled || isLoadingCountries}
          placeholder={isLoadingCountries ? "Cargando países..." : "Selecciona país"}
          error={errors?.countryId}
          label="País"
        />

        {hasDivisionCatalog ? (
          <>
            <GeoSearchSelect
              triggerId={admin1TriggerId}
              label={labels.admin1}
              value={value.departmentId}
              options={departmentOptions}
              onChange={(departmentId) =>
                emitChange({
                  countryId: value.countryId,
                  departmentId,
                  municipalityId: "",
                  admin3Id: "",
                  postalCode: value.postalCode,
                  freeState: value.freeState ?? "",
                  freeCity: value.freeCity ?? ""
                })
              }
              disabled={isDisabled || !value.countryId || isLoadingDepartments}
              placeholder={!value.countryId ? "Selecciona país primero" : isLoadingDepartments ? "Cargando..." : `Selecciona ${labels.admin1.toLowerCase()}`}
              error={errors?.departmentId}
            />

            <GeoSearchSelect
              triggerId={admin2TriggerId}
              label={labels.admin2}
              value={value.municipalityId}
              options={municipalityOptions}
              onChange={(municipalityId) =>
                emitChange({
                  countryId: value.countryId,
                  departmentId: value.departmentId,
                  municipalityId,
                  admin3Id: "",
                  postalCode: value.postalCode,
                  freeState: value.freeState ?? "",
                  freeCity: value.freeCity ?? ""
                })
              }
              disabled={isDisabled || !value.departmentId || isLoadingMunicipalities}
              placeholder={
                !value.departmentId
                  ? `Selecciona ${labels.admin1.toLowerCase()} primero`
                  : isLoadingMunicipalities
                    ? "Cargando..."
                    : `Selecciona ${labels.admin2.toLowerCase()}`
              }
              error={errors?.municipalityId}
            />

            {showAdmin3 ? (
              <GeoSearchSelect
                triggerId={admin3TriggerId}
                label={labels.admin3}
                value={value.admin3Id}
                options={admin3SearchOptions}
                onChange={(admin3Id) =>
                  emitChange({
                    countryId: value.countryId,
                    departmentId: value.departmentId,
                    municipalityId: value.municipalityId,
                    admin3Id,
                    postalCode: value.postalCode,
                    freeState: value.freeState ?? "",
                    freeCity: value.freeCity ?? ""
                  })
                }
                disabled={isDisabled || !value.municipalityId || isLoadingAdmin3}
                placeholder={
                  !value.municipalityId
                    ? `Selecciona ${labels.admin2.toLowerCase()} primero`
                    : isLoadingAdmin3
                      ? "Cargando..."
                      : `Selecciona ${labels.admin3.toLowerCase()}`
                }
                error={errors?.admin3Id}
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Estado / Provincia (texto)</p>
              <input
                id={freeStateInputId}
                value={value.freeState ?? ""}
                onChange={(event) =>
                  emitChange({
                    countryId: value.countryId,
                    departmentId: "",
                    municipalityId: "",
                    admin3Id: "",
                    postalCode: value.postalCode,
                    freeState: event.target.value,
                    freeCity: value.freeCity ?? ""
                  })
                }
                disabled={isDisabled}
                placeholder="Ej. California, Cundinamarca, Alajuela"
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                  errors?.freeState && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
                  isDisabled && "cursor-not-allowed bg-slate-100 text-slate-400"
                )}
              />
              {errors?.freeState ? <p className="text-xs text-rose-700">{errors.freeState}</p> : null}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">Ciudad / Municipio (texto)</p>
              <input
                id={freeCityInputId}
                value={value.freeCity ?? ""}
                onChange={(event) =>
                  emitChange({
                    countryId: value.countryId,
                    departmentId: "",
                    municipalityId: "",
                    admin3Id: "",
                    postalCode: value.postalCode,
                    freeState: value.freeState ?? "",
                    freeCity: event.target.value
                  })
                }
                disabled={isDisabled}
                placeholder="Ej. Los Ángeles, Quito, San José"
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                  errors?.freeCity && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
                  isDisabled && "cursor-not-allowed bg-slate-100 text-slate-400"
                )}
              />
              {errors?.freeCity ? <p className="text-xs text-rose-700">{errors.freeCity}</p> : null}
            </div>

            <div className="hidden md:block" />
          </>
        )}
      </div>

      {!hasDivisionCatalog ? (
        <p className="text-xs text-slate-500">Este país no tiene catálogo geográfico cargado. Se registrará ubicación operativa en texto libre.</p>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </section>
  );
}
