"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { detectPhoneCountryFromInput, normalizePhoneToE164, type PhoneCountryCodeConfig } from "@/lib/phone/normalize";
import { buildE164, sanitizeLocalNumber, sanitizePhoneInputValue } from "@/lib/clients/phoneValidation";
import {
  createSyntheticPhoneOption,
  resolvePreferredPhoneIso2,
  type GeoCountryPhoneHint
} from "@/lib/phone/preferredCountry";
import CountryCallingCodePicker from "@/components/phone/CountryCallingCodePicker";
import { useCallingCodeOptions } from "@/components/clients/useCallingCodeOptions";

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

export type PhoneNumberFieldProps = {
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
};

export default function PhoneNumberField({
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
}: PhoneNumberFieldProps) {
  const [selectedIso2, setSelectedIso2] = useState<string>("");
  const [geoHintsLoaded, setGeoHintsLoaded] = useState(false);
  const [geoCountryHintsById, setGeoCountryHintsById] = useState<Map<string, GeoCountryPhoneHint>>(new Map());
  const manualSelectionRef = useRef(false);
  const preferredKeyRef = useRef("");
  const callingCodeCatalog = useCallingCodeOptions({ limit: 400 });
  const options = useMemo<PhoneCountryOption[]>(
    () =>
      callingCodeCatalog.options
        .filter((item) => typeof item.iso2 === "string" && typeof (item.dialCode || item.callingCode) === "string")
        .map((item) => {
          const dialCode = item.dialCode || item.callingCode;
          return {
            id: item.id,
            iso2: item.iso2.toUpperCase(),
            countryName: item.countryName,
            dialCode,
            minLength: Number.isFinite(item.minLength) ? item.minLength : 6,
            maxLength: Number.isFinite(item.maxLength) ? item.maxLength : 15,
            example: item.example ?? null,
            isActive: item.isActive,
            geoCountryId: item.geoCountryId ?? null
          };
        }),
    [callingCodeCatalog.options]
  );

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

  const computedMeta = useMemo(
    () => buildMeta(value, selectedIso2 || null, effectiveOptions, localOnly),
    [effectiveOptions, localOnly, selectedIso2, value]
  );

  const helperMessage = useMemo(() => {
    if (error) return error;
    if (callingCodeCatalog.error) return callingCodeCatalog.error;
    if (value.trim() && computedMeta.error) return computedMeta.error;
    if (computedMeta.e164Preview) return `Se guardará como: ${computedMeta.e164Preview}`;
    if (localOnly && computedMeta.selectedIso2) {
      const option = effectiveOptions.find((item) => item.iso2 === computedMeta.selectedIso2);
      if (option?.example) return `Ejemplo local: ${option.example}`;
    }
    if (computedMeta.selectedIso2) {
      const option = effectiveOptions.find((item) => item.iso2 === computedMeta.selectedIso2);
      if (option?.example) return `Ejemplo: ${option.dialCode} ${option.example}`;
    }
    return null;
  }, [callingCodeCatalog.error, computedMeta.e164Preview, computedMeta.error, computedMeta.selectedIso2, effectiveOptions, error, localOnly, value]);

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      {label ? (
        <p className="truncate text-xs font-semibold text-slate-500">
          {label}
          {required ? " *" : ""}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(132px,180px)_minmax(0,1fr)]">
        <CountryCallingCodePicker
          options={effectiveOptions}
          valueIso2={selectedIso2}
          onChange={(iso2) => {
            manualSelectionRef.current = true;
            setSelectedIso2(iso2);
            onChange(value, buildMeta(value, iso2, effectiveOptions, localOnly));
          }}
          disabled={disabled}
          loading={callingCodeCatalog.loading}
        />

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
            "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
            (error || (value.trim() && computedMeta.error)) && "border-rose-300 focus:border-rose-300 focus:ring-rose-200",
            disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        />
      </div>

      {helperMessage ? (
        <p
          className={cn(
            "text-xs",
            error || callingCodeCatalog.error || (value.trim() && computedMeta.error) ? "text-rose-700" : "text-slate-500"
          )}
        >
          {helperMessage}
        </p>
      ) : null}
    </div>
  );
}
