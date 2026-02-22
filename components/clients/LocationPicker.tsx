"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LocationOption = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

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
};

export type LocationPickerErrors = Partial<Record<keyof LocationPickerValue, string>>;

type ApiResponse = {
  ok?: boolean;
  items?: LocationOption[];
  error?: string;
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
  admin1: "Departamento",
  admin2: "Municipio",
  admin3: "Distrito",
  showAdmin3: false
};

function resolveGeoLabels(countryCode: string): GeoLabels {
  switch (countryCode) {
    case "US":
      return { admin1: "State", admin2: "County", admin3: "City", showAdmin3: false };
    case "MX":
      return { admin1: "Estado", admin2: "Municipio/Alcaldía", admin3: "Localidad/Colonia", showAdmin3: false };
    case "CO":
      return { admin1: "Departamento", admin2: "Municipio", admin3: "Localidad", showAdmin3: false };
    case "EC":
      return { admin1: "Provincia", admin2: "Cantón", admin3: "Parroquia", showAdmin3: false };
    case "CR":
      return { admin1: "Provincia", admin2: "Cantón", admin3: "Distrito", showAdmin3: true };
    case "PA":
      return { admin1: "Provincia / Comarca", admin2: "Distrito", admin3: "Corregimiento", showAdmin3: true };
    case "SV":
      return { admin1: "Departamento", admin2: "Municipio", admin3: "Distrito", showAdmin3: true };
    case "NI":
      return { admin1: "Departamento / Región", admin2: "Municipio", admin3: "Distrito", showAdmin3: false };
    case "HN":
      return { admin1: "Departamento", admin2: "Municipio", admin3: "Distrito", showAdmin3: false };
    case "GT":
      return { admin1: "Departamento", admin2: "Municipio", admin3: "Distrito", showAdmin3: false };
    default:
      return DEFAULT_LABELS;
  }
}

function ensureArray(input: unknown): LocationOption[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is LocationOption => {
    if (!item || typeof item !== "object") return false;
    const value = item as Partial<LocationOption>;
    return typeof value.id === "string" && typeof value.code === "string" && typeof value.name === "string";
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

function normalizePostalCode(value: string) {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

export default function LocationPicker({
  value,
  onChange,
  disabled,
  errors,
  className,
  title = "Ubicación",
  subtitle
}: {
  value: LocationPickerValue;
  onChange: (next: LocationPickerValue) => void;
  disabled?: boolean;
  errors?: LocationPickerErrors;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingAdmin3, setIsLoadingAdmin3] = useState(false);
  const [isLoadingPostal, setIsLoadingPostal] = useState(false);

  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [departments, setDepartments] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [admin3Options, setAdmin3Options] = useState<LocationOption[]>([]);
  const [postalInput, setPostalInput] = useState("");
  const [postalMatches, setPostalMatches] = useState<PostalMatch[]>([]);

  const [error, setError] = useState<string | null>(null);

  const skipPostalLookupRef = useRef(false);
  const skipReverseLookupRef = useRef(false);

  const isDisabled = Boolean(disabled);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === value.countryId) ?? null,
    [countries, value.countryId]
  );
  const selectedCountryCode = (selectedCountry?.code || "").toUpperCase();
  const labels = useMemo(() => resolveGeoLabels(selectedCountryCode), [selectedCountryCode]);
  const showAdmin3 = labels.showAdmin3 || admin3Options.length > 0 || Boolean(value.admin3Id);

  const computedSubtitle = subtitle || `Selecciona País → ${labels.admin1} → ${labels.admin2}${showAdmin3 ? ` → ${labels.admin3}` : ""}`;

  const applyPostalMatch = useCallback((match: PostalMatch) => {
    skipReverseLookupRef.current = true;

    onChange({
      countryId: match.country.id || value.countryId,
      departmentId: match.admin1Id ?? match.admin1?.id ?? "",
      municipalityId: match.admin2Id ?? match.admin2?.id ?? "",
      admin3Id: match.admin3Id ?? match.admin3?.id ?? "",
      postalCode: match.postalCode
    });

    setPostalMatches([]);
    setError(null);
  }, [onChange, value.countryId]);

  useEffect(() => {
    setPostalInput(value.postalCode || "");
  }, [value.postalCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      setIsLoadingCountries(true);
      try {
        const res = await fetch("/api/geo/countries?active=1&limit=300", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudo cargar países.");
        }
        if (cancelled) return;
        setCountries(ensureArray(json.items));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setCountries([]);
        setError((err as Error)?.message || "No se pudo cargar países.");
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
      setDepartments([]);
      setMunicipalities([]);
      setAdmin3Options([]);
      setPostalMatches([]);
      setPostalInput("");
      return;
    }

    async function loadDepartments() {
      setIsLoadingDepartments(true);
      try {
        const query = new URLSearchParams({
          country: value.countryId,
          active: "1",
          limit: "300"
        });
        const res = await fetch(`/api/geo/departments?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudieron cargar departamentos.");
        }
        if (cancelled) return;
        setDepartments(ensureArray(json.items));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setDepartments([]);
        setError((err as Error)?.message || "No se pudieron cargar departamentos.");
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

    if (!value.departmentId) {
      setMunicipalities([]);
      setAdmin3Options([]);
      return;
    }

    async function loadMunicipalities() {
      setIsLoadingMunicipalities(true);
      try {
        const query = new URLSearchParams({
          departmentId: value.departmentId,
          active: "1",
          limit: "600"
        });
        const res = await fetch(`/api/geo/municipalities?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudieron cargar municipios.");
        }
        if (cancelled) return;
        setMunicipalities(ensureArray(json.items));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setMunicipalities([]);
        setError((err as Error)?.message || "No se pudieron cargar municipios.");
      } finally {
        if (!cancelled) setIsLoadingMunicipalities(false);
      }
    }

    void loadMunicipalities();
    return () => {
      cancelled = true;
    };
  }, [value.departmentId]);

  useEffect(() => {
    let cancelled = false;

    if (!value.municipalityId) {
      setAdmin3Options([]);
      return;
    }

    async function loadAdmin3() {
      setIsLoadingAdmin3(true);
      try {
        const query = new URLSearchParams({
          municipalityId: value.municipalityId,
          active: "1",
          limit: "800"
        });
        const res = await fetch(`/api/geo/admin3?${query.toString()}`, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudieron cargar divisiones de tercer nivel.");
        }
        if (cancelled) return;
        setAdmin3Options(ensureArray(json.items));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setAdmin3Options([]);
        setError((err as Error)?.message || "No se pudieron cargar divisiones de tercer nivel.");
      } finally {
        if (!cancelled) setIsLoadingAdmin3(false);
      }
    }

    void loadAdmin3();
    return () => {
      cancelled = true;
    };
  }, [value.municipalityId]);

  useEffect(() => {
    if (skipPostalLookupRef.current) {
      skipPostalLookupRef.current = false;
      return;
    }

    let cancelled = false;
    const normalizedPostal = normalizePostalCode(postalInput);

    if (!value.countryId || normalizedPostal.length < 3) {
      setPostalMatches((prev) => (normalizedPostal.length ? prev : []));
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
          throw new Error(json.error || "No se pudo buscar el código postal.");
        }
        if (cancelled) return;

        const items = ensurePostalArray(json.items);
        if (items.length === 1) {
          applyPostalMatch(items[0]);
          skipPostalLookupRef.current = true;
          setPostalInput(items[0].postalCode);
          return;
        }

        setPostalMatches(items);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPostalMatches([]);
        setError((err as Error)?.message || "No se pudo buscar el código postal.");
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

    let cancelled = false;

    if (!value.countryId) {
      return;
    }

    if (!value.departmentId && !value.municipalityId && !value.admin3Id) {
      return;
    }

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
          throw new Error(json.error || "No se pudo resolver código postal para la ubicación.");
        }
        if (cancelled) return;

        const items = ensurePostalArray(json.items);
        if (items.length === 1) {
          skipPostalLookupRef.current = true;
          setPostalInput(items[0].postalCode);
          onChange({
            countryId: value.countryId,
            departmentId: value.departmentId,
            municipalityId: value.municipalityId,
            admin3Id: value.admin3Id,
            postalCode: items[0].postalCode
          });
          setPostalMatches([]);
          return;
        }

        if (items.length > 1) {
          setPostalMatches(items);
          return;
        }

        if (!value.admin3Id) {
          setPostalMatches([]);
        }
      } catch {
        if (!cancelled) {
          setPostalMatches([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [onChange, value.countryId, value.departmentId, value.municipalityId, value.admin3Id]);

  const countryPlaceholder = useMemo(() => {
    if (isLoadingCountries) return "Cargando países...";
    return "Selecciona país";
  }, [isLoadingCountries]);

  const departmentPlaceholder = useMemo(() => {
    if (!value.countryId) return "Selecciona país primero";
    if (isLoadingDepartments) return `Cargando ${labels.admin1.toLowerCase()}...`;
    return `Selecciona ${labels.admin1.toLowerCase()}`;
  }, [isLoadingDepartments, labels.admin1, value.countryId]);

  const municipalityPlaceholder = useMemo(() => {
    if (!value.departmentId) return `Selecciona ${labels.admin1.toLowerCase()} primero`;
    if (isLoadingMunicipalities) return `Cargando ${labels.admin2.toLowerCase()}...`;
    return `Selecciona ${labels.admin2.toLowerCase()}`;
  }, [isLoadingMunicipalities, labels.admin1, labels.admin2, value.departmentId]);

  const admin3Placeholder = useMemo(() => {
    if (!value.municipalityId) return `Selecciona ${labels.admin2.toLowerCase()} primero`;
    if (isLoadingAdmin3) return `Cargando ${labels.admin3.toLowerCase()}...`;
    return `Selecciona ${labels.admin3.toLowerCase()}`;
  }, [isLoadingAdmin3, labels.admin2, labels.admin3, value.municipalityId]);

  return (
    <section className={cn("space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{computedSubtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Código postal (opcional)</p>
          <input
            value={postalInput}
            onChange={(event) => {
              const nextPostal = event.target.value;
              setPostalInput(nextPostal);
              onChange({
                countryId: value.countryId,
                departmentId: value.departmentId,
                municipalityId: value.municipalityId,
                admin3Id: value.admin3Id,
                postalCode: nextPostal
              });
            }}
            placeholder={value.countryId ? "Ej. 05011" : "Selecciona país primero"}
            disabled={isDisabled || !value.countryId}
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
              errors?.postalCode && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
              (isDisabled || !value.countryId) && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          />
          {isLoadingPostal ? <p className="text-xs text-slate-500">Buscando código postal...</p> : null}
          {errors?.postalCode ? <p className="text-xs text-rose-700">{errors.postalCode}</p> : null}
        </div>

        {postalMatches.length > 1 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Coincidencias de código postal</p>
            <select
              value=""
              onChange={(event) => {
                const match = postalMatches.find((item) => item.id === event.target.value);
                if (!match) return;
                skipPostalLookupRef.current = true;
                setPostalInput(match.postalCode);
                applyPostalMatch(match);
              }}
              disabled={isDisabled}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                isDisabled && "cursor-not-allowed bg-slate-100 text-slate-400"
              )}
            >
              <option value="">Selecciona una coincidencia</option>
              {postalMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.postalCode}
                  {match.label ? ` · ${match.label}` : ""}
                  {match.isOperational || match.dataSource === "operational" ? " · Operativo" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      <div className={cn("grid gap-3", showAdmin3 ? "md:grid-cols-4" : "md:grid-cols-3")}>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">País</p>
          <select
            value={value.countryId}
            onChange={(event) => {
              setPostalInput("");
              setPostalMatches([]);
              onChange({
                countryId: event.target.value,
                departmentId: "",
                municipalityId: "",
                admin3Id: "",
                postalCode: ""
              });
            }}
            disabled={isDisabled || isLoadingCountries}
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
              (isDisabled || isLoadingCountries) && "cursor-not-allowed bg-slate-100 text-slate-400",
              errors?.countryId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
            )}
          >
            <option value="">{countryPlaceholder}</option>
            {countries.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {errors?.countryId ? <p className="text-xs text-rose-700">{errors.countryId}</p> : null}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">{labels.admin1}</p>
          <select
            value={value.departmentId}
            onChange={(event) =>
              onChange({
                countryId: value.countryId,
                departmentId: event.target.value,
                municipalityId: "",
                admin3Id: "",
                postalCode: value.postalCode
              })
            }
            disabled={isDisabled || !value.countryId || isLoadingDepartments}
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
              (isDisabled || !value.countryId || isLoadingDepartments) && "cursor-not-allowed bg-slate-100 text-slate-400",
              errors?.departmentId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
            )}
          >
            <option value="">{departmentPlaceholder}</option>
            {departments.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {errors?.departmentId ? <p className="text-xs text-rose-700">{errors.departmentId}</p> : null}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">{labels.admin2}</p>
          <select
            value={value.municipalityId}
            onChange={(event) =>
              onChange({
                countryId: value.countryId,
                departmentId: value.departmentId,
                municipalityId: event.target.value,
                admin3Id: "",
                postalCode: value.postalCode
              })
            }
            disabled={isDisabled || !value.departmentId || isLoadingMunicipalities}
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
              (isDisabled || !value.departmentId || isLoadingMunicipalities) && "cursor-not-allowed bg-slate-100 text-slate-400",
              errors?.municipalityId && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
            )}
          >
            <option value="">{municipalityPlaceholder}</option>
            {municipalities.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {errors?.municipalityId ? <p className="text-xs text-rose-700">{errors.municipalityId}</p> : null}
        </div>

        {showAdmin3 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">{labels.admin3}</p>
            <select
              value={value.admin3Id}
              onChange={(event) =>
                onChange({
                  countryId: value.countryId,
                  departmentId: value.departmentId,
                  municipalityId: value.municipalityId,
                  admin3Id: event.target.value,
                  postalCode: value.postalCode
                })
              }
              disabled={isDisabled || !value.municipalityId || isLoadingAdmin3}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
                (isDisabled || !value.municipalityId || isLoadingAdmin3) && "cursor-not-allowed bg-slate-100 text-slate-400",
                errors?.admin3Id && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
              )}
            >
              <option value="">{admin3Placeholder}</option>
              {admin3Options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {errors?.admin3Id ? <p className="text-xs text-rose-700">{errors.admin3Id}</p> : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </section>
  );
}
