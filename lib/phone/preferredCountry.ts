import { inferPhoneIso2ByCountryText, type PhoneCountryCodeConfig } from "@/lib/phone/normalize";

export type PhoneCountryOptionWithGeo = PhoneCountryCodeConfig & {
  id: string;
  geoCountryId?: string | null;
};

export type GeoCountryPhoneHint = {
  id: string;
  code: string;
  name: string;
  callingCode?: string | null;
};

const FALLBACK_DIAL_BY_ISO2: Record<string, string> = {
  AR: "+54",
  BZ: "+501",
  BR: "+55",
  CO: "+57",
  CR: "+506",
  EC: "+593",
  SV: "+503",
  GT: "+502",
  HN: "+504",
  MX: "+52",
  NI: "+505",
  PA: "+507",
  PE: "+51",
  PY: "+595",
  US: "+1",
  UY: "+598"
};

function normalizeIso2(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

export function normalizeDialCode(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

export function getFallbackDialCodeForIso2(iso2: string | null | undefined): string | null {
  const normalized = normalizeIso2(iso2);
  if (!normalized) return null;
  return FALLBACK_DIAL_BY_ISO2[normalized] ?? null;
}

export function resolvePreferredPhoneIso2(
  options: PhoneCountryOptionWithGeo[],
  input: {
    preferredGeoCountryId?: string | null;
    preferredCountryText?: string | null;
    geoCountryHintsById?: Map<string, GeoCountryPhoneHint>;
  }
): string | null {
  const byGeo = (input.preferredGeoCountryId ?? "").trim();
  if (byGeo) {
    const found = options.find((item) => item.geoCountryId === byGeo);
    if (found) return normalizeIso2(found.iso2);

    const hintedIso2 = normalizeIso2(input.geoCountryHintsById?.get(byGeo)?.code);
    if (hintedIso2) return hintedIso2;
  }

  const byCountryText = inferPhoneIso2ByCountryText(input.preferredCountryText, options);
  if (byCountryText) return normalizeIso2(byCountryText);

  return null;
}

export function createSyntheticPhoneOption(
  options: PhoneCountryOptionWithGeo[],
  input: {
    preferredIso2: string;
    preferredGeoCountryId?: string | null;
    geoCountryHintsById?: Map<string, GeoCountryPhoneHint>;
  }
): PhoneCountryOptionWithGeo | null {
  const preferredIso2 = normalizeIso2(input.preferredIso2);
  if (!preferredIso2) return null;
  if (options.some((item) => normalizeIso2(item.iso2) === preferredIso2)) return null;

  const geoHint = (input.preferredGeoCountryId ?? "").trim()
    ? input.geoCountryHintsById?.get((input.preferredGeoCountryId ?? "").trim())
    : null;

  const dialCode = normalizeDialCode(geoHint?.callingCode) ?? getFallbackDialCodeForIso2(preferredIso2);
  if (!dialCode) return null;

  return {
    id: `fallback-${preferredIso2}`,
    iso2: preferredIso2,
    countryName: geoHint?.name || preferredIso2,
    dialCode,
    minLength: 6,
    maxLength: 15,
    isActive: true,
    geoCountryId: (input.preferredGeoCountryId ?? "").trim() || null
  };
}
