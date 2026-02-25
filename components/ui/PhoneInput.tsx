"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectPhoneCountryFromInput, normalizePhoneToE164, type PhoneCountryCodeConfig } from "@/lib/phone/normalize";
import { buildE164, sanitizeLocalNumber, sanitizePhoneInputValue } from "@/lib/clients/phoneValidation";
import {
  createSyntheticPhoneOption,
  resolvePreferredPhoneIso2,
  type GeoCountryPhoneHint
} from "@/lib/phone/preferredCountry";

type PhoneCountryOption = PhoneCountryCodeConfig & {
  id: string;
  geoCountryId?: string | null;
};

export type PhoneInputMeta = {
  selectedIso2: string | null;
  selectedDialCode: string | null;
  e164Preview: string | null;
  isValid: boolean;
  error: string | null;
};

type ApiResponse = {
  ok?: boolean;
  items?: Array<{
    id: string;
    iso2: string;
    countryName: string;
    dialCode: string;
    minLength: number;
    maxLength: number;
    example?: string | null;
    isActive: boolean;
    geoCountryId?: string | null;
  }>;
  error?: string;
};

type GeoCountriesApiResponse = {
  ok?: boolean;
  items?: Array<{
    id: string;
    code: string;
    name: string;
    callingCode?: string | null;
  }>;
  error?: string;
};

function iso2ToFlag(iso2: string) {
  const clean = iso2.trim().toUpperCase();
  if (clean.length !== 2) return "🏳️";
  return clean
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function buildMeta(
  value: string,
  selectedIso2: string | null,
  options: PhoneCountryOption[],
  localOnly = false
): PhoneInputMeta {
  if (!options.length) {
    return {
      selectedIso2: selectedIso2 || null,
      selectedDialCode: null,
      e164Preview: null,
      isValid: true,
      error: null
    };
  }

  const selected = selectedIso2 ? options.find((item) => item.iso2 === selectedIso2) ?? null : null;
  const rawValue = value.trim();
  if (!rawValue) {
    return {
      selectedIso2: selected?.iso2 ?? null,
      selectedDialCode: selected?.dialCode ?? null,
      e164Preview: null,
      isValid: true,
      error: null
    };
  }

  if (localOnly) {
    const localNumber = sanitizeLocalNumber(rawValue);
    if (!selected) {
      return {
        selectedIso2: null,
        selectedDialCode: null,
        e164Preview: null,
        isValid: false,
        error: "Selecciona prefijo país."
      };
    }
    if (!localNumber) {
      return {
        selectedIso2: selected.iso2,
        selectedDialCode: selected.dialCode,
        e164Preview: null,
        isValid: false,
        error: "Teléfono inválido."
      };
    }
    if (localNumber.length < selected.minLength || localNumber.length > selected.maxLength) {
      return {
        selectedIso2: selected.iso2,
        selectedDialCode: selected.dialCode,
        e164Preview: null,
        isValid: false,
        error: `Debe tener ${selected.minLength}-${selected.maxLength} dígitos locales.`
      };
    }
    return {
      selectedIso2: selected.iso2,
      selectedDialCode: selected.dialCode,
      e164Preview: buildE164(selected.dialCode, localNumber),
      isValid: true,
      error: null
    };
  }

  try {
    const normalized = normalizePhoneToE164(rawValue, options, {
      preferredIso2: selected?.iso2 ?? null,
      fieldLabel: "Teléfono"
    });
    return {
      selectedIso2: normalized?.iso2 ?? selected?.iso2 ?? null,
      selectedDialCode: normalized?.dialCode ?? selected?.dialCode ?? null,
      e164Preview: normalized?.e164 ?? null,
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      selectedIso2: selected?.iso2 ?? null,
      selectedDialCode: selected?.dialCode ?? null,
      e164Preview: null,
      isValid: false,
      error: (error as Error)?.message ?? "Teléfono inválido."
    };
  }
}

export default function PhoneInput({
  value,
  onChange,
  preferredGeoCountryId,
  preferredCountryText,
  disabled,
  error,
  required,
  label = "Teléfono",
  placeholder,
  className,
  localOnly = false
}: {
  value: string;
  onChange: (next: string, meta: PhoneInputMeta) => void;
  preferredGeoCountryId?: string | null;
  preferredCountryText?: string | null;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  localOnly?: boolean;
}) {
  const [options, setOptions] = useState<PhoneCountryOption[]>([]);
  const [selectedIso2, setSelectedIso2] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openPrefix, setOpenPrefix] = useState(false);
  const [prefixQuery, setPrefixQuery] = useState("");
  const [geoHintsLoaded, setGeoHintsLoaded] = useState(false);
  const [geoCountryHintsById, setGeoCountryHintsById] = useState<Map<string, GeoCountryPhoneHint>>(new Map());
  const manualSelectionRef = useRef(false);
  const preferredKeyRef = useRef("");
  const prefixContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      try {
        const res = await fetch("/api/phone/country-codes?active=1&limit=400", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudo cargar catálogo telefónico.");
        }
        if (cancelled) return;
        const items = Array.isArray(json.items)
          ? json.items
              .filter((item) => item && typeof item.iso2 === "string" && typeof item.dialCode === "string")
              .map((item) => ({
                id: item.id,
                iso2: item.iso2,
                countryName: item.countryName,
                dialCode: item.dialCode,
                minLength: item.minLength,
                maxLength: item.maxLength,
                example: item.example ?? null,
                isActive: item.isActive,
                geoCountryId: item.geoCountryId ?? null
              }))
          : [];
        setOptions(items);
        setFetchError(null);
      } catch (err) {
        if (cancelled) return;
        setOptions([]);
        setFetchError((err as Error)?.message || "No se pudo cargar catálogo telefónico.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!preferredGeoCountryId) return;
    if (options.some((item) => item.geoCountryId === preferredGeoCountryId)) return;
    if (geoHintsLoaded) return;

    async function loadGeoHints() {
      try {
        const res = await fetch("/api/geo/countries?active=1&limit=400", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as GeoCountriesApiResponse;
        if (!res.ok || json.ok === false || !Array.isArray(json.items)) {
          return;
        }
        if (cancelled) return;
        const map = new Map<string, GeoCountryPhoneHint>();
        for (const row of json.items) {
          if (!row || typeof row.id !== "string" || typeof row.code !== "string" || typeof row.name !== "string") {
            continue;
          }
          map.set(row.id, {
            id: row.id,
            code: row.code,
            name: row.name,
            callingCode: row.callingCode ?? null
          });
        }
        setGeoCountryHintsById(map);
      } finally {
        if (!cancelled) setGeoHintsLoaded(true);
      }
    }

    void loadGeoHints();
    return () => {
      cancelled = true;
    };
  }, [geoHintsLoaded, options, preferredGeoCountryId]);

  const effectiveOptions = useMemo(() => {
    const preferredIso2 = resolvePreferredPhoneIso2(options, {
      preferredGeoCountryId,
      preferredCountryText,
      geoCountryHintsById
    });
    if (!preferredIso2) return options;

    const synthetic = createSyntheticPhoneOption(options, {
      preferredIso2,
      preferredGeoCountryId,
      geoCountryHintsById
    });
    if (!synthetic) return options;
    return [...options, synthetic];
  }, [geoCountryHintsById, options, preferredCountryText, preferredGeoCountryId]);

  useEffect(() => {
    if (!effectiveOptions.length) return;
    const preferredKey = `${preferredGeoCountryId ?? ""}|${preferredCountryText ?? ""}`;
    const preferenceChanged = preferredKeyRef.current !== preferredKey;
    if (preferenceChanged) {
      preferredKeyRef.current = preferredKey;
      manualSelectionRef.current = false;
    }

    const preferredIso2 = resolvePreferredPhoneIso2(effectiveOptions, {
      preferredGeoCountryId,
      preferredCountryText,
      geoCountryHintsById
    });
    const selectedStillValid = effectiveOptions.some((item) => item.iso2 === selectedIso2);

    if (!preferredIso2) {
      if (!manualSelectionRef.current && selectedIso2 && (preferenceChanged || !selectedStillValid)) {
        setSelectedIso2("");
        if (value.trim()) {
          onChange(value, buildMeta(value, null, effectiveOptions, localOnly));
        }
      }
      return;
    }

    const shouldSyncToPreferred =
      !selectedIso2 ||
      !selectedStillValid ||
      preferenceChanged ||
      (!manualSelectionRef.current && selectedIso2 !== preferredIso2);

    if (shouldSyncToPreferred && selectedIso2 !== preferredIso2) {
      setSelectedIso2(preferredIso2);
      if (value.trim()) {
        onChange(value, buildMeta(value, preferredIso2, effectiveOptions, localOnly));
      }
    }
  }, [effectiveOptions, geoCountryHintsById, localOnly, onChange, preferredCountryText, preferredGeoCountryId, selectedIso2, value]);

  useEffect(() => {
    if (!openPrefix) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!prefixContainerRef.current) return;
      if (!prefixContainerRef.current.contains(event.target as Node)) {
        setOpenPrefix(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openPrefix]);

  const selectedOption = useMemo(
    () => effectiveOptions.find((item) => item.iso2 === selectedIso2) ?? null,
    [effectiveOptions, selectedIso2]
  );

  const filteredOptions = useMemo(() => {
    const q = prefixQuery.trim().toLowerCase();
    if (!q) return effectiveOptions;
    return effectiveOptions.filter((option) => {
      return (
        option.countryName.toLowerCase().includes(q) ||
        option.iso2.toLowerCase().includes(q) ||
        option.dialCode.toLowerCase().includes(q)
      );
    });
  }, [effectiveOptions, prefixQuery]);

  const computedMeta = useMemo(
    () => buildMeta(value, selectedIso2 || null, effectiveOptions, localOnly),
    [effectiveOptions, localOnly, selectedIso2, value]
  );

  const helperMessage = useMemo(() => {
    if (error) return error;
    if (fetchError) return fetchError;
    if (value.trim() && computedMeta.error) return computedMeta.error;
    if (computedMeta.e164Preview) return `Se guardará como: ${computedMeta.e164Preview}`;
    if (localOnly && selectedOption?.example) return `Ejemplo local: ${selectedOption.example}`;
    if (selectedOption?.example) return `Ejemplo: ${selectedOption.dialCode} ${selectedOption.example}`;
    return null;
  }, [computedMeta.e164Preview, computedMeta.error, error, fetchError, localOnly, selectedOption?.dialCode, selectedOption?.example, value]);

  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <p className="text-xs font-semibold text-slate-500">
          {label}
          {required ? " *" : ""}
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(130px,180px)_1fr] gap-2">
        <div className="relative" ref={prefixContainerRef}>
          <button
            type="button"
            onClick={() => {
              if (disabled || loading || !effectiveOptions.length) return;
              setOpenPrefix((prev) => !prev);
            }}
            disabled={disabled || loading || !effectiveOptions.length}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
              (disabled || loading || !effectiveOptions.length) && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
            aria-label="Seleccionar prefijo telefónico"
          >
            {selectedOption ? (
              <span className="inline-flex min-w-0 items-center gap-2">
                <span>{iso2ToFlag(selectedOption.iso2)}</span>
                <span className="truncate">{selectedOption.dialCode}</span>
              </span>
            ) : (
              <span>{loading ? "Cargando..." : "Prefijo"}</span>
            )}
            <ChevronDown size={14} className="shrink-0 text-slate-400" />
          </button>

          {openPrefix && !disabled && !loading ? (
            <div className="absolute z-40 mt-2 w-[min(360px,92vw)] rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
                  <input
                    value={prefixQuery}
                    onChange={(event) => setPrefixQuery(event.target.value)}
                    placeholder="Buscar país o prefijo"
                    className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-auto p-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      manualSelectionRef.current = true;
                      setSelectedIso2(option.iso2);
                      onChange(value, buildMeta(value, option.iso2, effectiveOptions, localOnly));
                      setOpenPrefix(false);
                      setPrefixQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                      option.iso2 === selectedIso2 && "bg-[#4aadf5]/15"
                    )}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span>{iso2ToFlag(option.iso2)}</span>
                      <span className="truncate font-semibold">{option.countryName}</span>
                    </span>
                    <span className="text-xs text-slate-500">{option.dialCode}</span>
                  </button>
                ))}
                {!filteredOptions.length ? <p className="px-2 py-3 text-xs text-slate-500">Sin resultados.</p> : null}
              </div>
            </div>
          ) : null}
        </div>

        <input
          value={value}
          onChange={(event) => {
            const nextValue = localOnly
              ? sanitizeLocalNumber(event.target.value)
              : sanitizePhoneInputValue(event.target.value);
            if (localOnly) {
              onChange(nextValue, buildMeta(nextValue, selectedIso2 || null, effectiveOptions, true));
              return;
            }
            const detected = detectPhoneCountryFromInput(nextValue, effectiveOptions);
            const nextIso2 = detected?.iso2 ?? selectedIso2;
            if (detected?.iso2 && detected.iso2 !== selectedIso2) {
              setSelectedIso2(detected.iso2);
            }
            onChange(nextValue, buildMeta(nextValue, nextIso2 || null, effectiveOptions, false));
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            const nextValue = localOnly ? sanitizeLocalNumber(pasted) : sanitizePhoneInputValue(pasted);
            event.preventDefault();
            if (localOnly) {
              onChange(nextValue, buildMeta(nextValue, selectedIso2 || null, effectiveOptions, true));
              return;
            }
            const detected = detectPhoneCountryFromInput(nextValue, effectiveOptions);
            const nextIso2 = detected?.iso2 ?? selectedIso2;
            if (detected?.iso2 && detected.iso2 !== selectedIso2) {
              setSelectedIso2(detected.iso2);
            }
            onChange(nextValue, buildMeta(nextValue, nextIso2 || null, effectiveOptions, false));
          }}
          disabled={disabled}
          placeholder={placeholder ?? (localOnly ? "Escribe número local" : "Escribe local o +prefijo internacional")}
          inputMode={localOnly ? "numeric" : "tel"}
          pattern={localOnly ? "^[0-9]*$" : "^\\+?[0-9]*$"}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
            (error || (value.trim() && computedMeta.error)) && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
            disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        />
      </div>

      {helperMessage ? (
        <p className={cn("text-xs", error || fetchError || (value.trim() && computedMeta.error) ? "text-rose-700" : "text-slate-500")}>
          {helperMessage}
        </p>
      ) : null}
    </div>
  );
}
