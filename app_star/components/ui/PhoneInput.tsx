"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { detectPhoneCountryFromInput, inferPhoneIso2ByCountryText, normalizePhoneToE164, type PhoneCountryCodeConfig } from "@/lib/phone/normalize";

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

function findPreferredIso2(
  options: PhoneCountryOption[],
  input: {
    preferredGeoCountryId?: string | null;
    preferredCountryText?: string | null;
  }
): string | null {
  const byGeo = (input.preferredGeoCountryId ?? "").trim();
  if (byGeo) {
    const found = options.find((item) => item.geoCountryId === byGeo);
    if (found) return found.iso2;
  }

  const byCountryText = inferPhoneIso2ByCountryText(input.preferredCountryText, options);
  if (byCountryText) return byCountryText;

  return null;
}

function buildMeta(value: string, selectedIso2: string | null, options: PhoneCountryOption[]): PhoneInputMeta {
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
  className
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
}) {
  const [options, setOptions] = useState<PhoneCountryOption[]>([]);
  const [selectedIso2, setSelectedIso2] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const manualSelectionRef = useRef(false);
  const preferredKeyRef = useRef("");

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
    if (!options.length) return;
    const preferredKey = `${preferredGeoCountryId ?? ""}|${preferredCountryText ?? ""}`;
    const preferenceChanged = preferredKeyRef.current !== preferredKey;
    if (preferenceChanged) {
      preferredKeyRef.current = preferredKey;
      manualSelectionRef.current = false;
    }

    const preferredIso2 = findPreferredIso2(options, { preferredGeoCountryId, preferredCountryText });
    const selectedStillValid = options.some((item) => item.iso2 === selectedIso2);

    if (!preferredIso2) {
      if (!manualSelectionRef.current && selectedIso2 && (preferenceChanged || !selectedStillValid)) {
        setSelectedIso2("");
        if (value.trim()) {
          onChange(value, buildMeta(value, null, options));
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
        onChange(value, buildMeta(value, preferredIso2, options));
      }
    }
  }, [onChange, options, preferredCountryText, preferredGeoCountryId, selectedIso2, value]);

  const selectedOption = useMemo(
    () => options.find((item) => item.iso2 === selectedIso2) ?? null,
    [options, selectedIso2]
  );

  const computedMeta = useMemo(() => buildMeta(value, selectedIso2 || null, options), [options, selectedIso2, value]);

  const helperMessage = useMemo(() => {
    if (error) return error;
    if (fetchError) return fetchError;
    if (value.trim() && computedMeta.error) return computedMeta.error;
    if (computedMeta.e164Preview) return `Se guardará como: ${computedMeta.e164Preview}`;
    if (selectedOption?.example) return `Ejemplo: ${selectedOption.dialCode} ${selectedOption.example}`;
    return null;
  }, [computedMeta.e164Preview, computedMeta.error, error, fetchError, selectedOption?.dialCode, selectedOption?.example, value]);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-semibold text-slate-500">
        {label}
        {required ? " *" : ""}
      </p>

      <div className="grid grid-cols-[minmax(130px,180px)_1fr] gap-2">
        <select
          value={selectedIso2}
          onChange={(event) => {
            const nextIso2 = event.target.value;
            manualSelectionRef.current = true;
            setSelectedIso2(nextIso2);
            onChange(value, buildMeta(value, nextIso2, options));
          }}
          disabled={disabled || loading || !options.length}
          className={cn(
            "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
            (disabled || loading || !options.length) && "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        >
          <option value="">{loading ? "Cargando..." : "Prefijo"}</option>
          {options.map((option) => (
            <option key={option.id} value={option.iso2}>
              {option.dialCode} · {option.countryName}
            </option>
          ))}
        </select>

        <input
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            const detected = detectPhoneCountryFromInput(nextValue, options);
            const nextIso2 = detected?.iso2 ?? selectedIso2;
            if (detected?.iso2 && detected.iso2 !== selectedIso2) {
              setSelectedIso2(detected.iso2);
            }
            onChange(nextValue, buildMeta(nextValue, nextIso2 || null, options));
          }}
          disabled={disabled}
          placeholder={placeholder ?? "Escribe local o +prefijo internacional"}
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
