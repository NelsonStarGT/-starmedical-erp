export type PhoneCountryCodeConfig = {
  iso2: string;
  countryName: string;
  dialCode: string;
  minLength: number;
  maxLength: number;
  example?: string | null;
  isActive?: boolean;
};

export type ParsedE164 = {
  iso2?: string;
  dialCode: string;
  nationalNumber: string;
};

export type NormalizedPhoneResult = {
  e164: string;
  iso2: string;
  countryName: string;
  dialCode: string;
  localNumber: string;
};

type PreparedPhoneCountryCode = PhoneCountryCodeConfig & {
  iso2: string;
  dialCode: string;
  dialDigits: string;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeIso2(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function normalizeDialCode(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function formatLengthRule(min: number, max: number) {
  if (min === max) return `${min}`;
  return `${min}-${max}`;
}

function prepareCatalog(catalog: PhoneCountryCodeConfig[]): PreparedPhoneCountryCode[] {
  return catalog
    .filter((item) => item.isActive !== false)
    .map((item) => {
      const iso2 = normalizeIso2(item.iso2);
      const dialCode = normalizeDialCode(item.dialCode);
      const dialDigits = dialCode.replace("+", "");
      return {
        ...item,
        iso2,
        dialCode,
        dialDigits
      };
    })
    .filter((item) => item.iso2 && item.dialDigits)
    .sort((a, b) => b.dialDigits.length - a.dialDigits.length);
}

export function sanitizeInput(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/[^\d]/g, "")}`;
  }
  return cleaned.replace(/[^\d]/g, "");
}

export function isValidNationalNumber(
  iso2: string | null | undefined,
  nationalNumber: string | null | undefined,
  catalog: PhoneCountryCodeConfig[]
): boolean {
  const prepared = prepareCatalog(catalog);
  const normalizedIso2 = normalizeIso2(iso2);
  const code = prepared.find((item) => item.iso2 === normalizedIso2);
  if (!code) return false;
  const digits = sanitizeInput(nationalNumber);
  if (!digits || digits.startsWith("+")) return false;
  return digits.length >= code.minLength && digits.length <= code.maxLength;
}

export function normalizeE164(input: {
  iso2?: string | null;
  dialCode?: string | null;
  nationalNumber: string;
  catalog: PhoneCountryCodeConfig[];
}): string {
  const prepared = prepareCatalog(input.catalog);
  const nationalDigits = sanitizeInput(input.nationalNumber);
  if (!nationalDigits || nationalDigits.startsWith("+")) {
    throw new Error("Número nacional inválido.");
  }

  const normalizedIso2 = normalizeIso2(input.iso2);
  let code: PreparedPhoneCountryCode | undefined;

  if (normalizedIso2) {
    code = prepared.find((item) => item.iso2 === normalizedIso2);
  } else {
    const normalizedDialCode = normalizeDialCode(input.dialCode);
    if (normalizedDialCode) {
      code = prepared.find((item) => item.dialCode === normalizedDialCode);
    }
  }

  if (!code) {
    throw new Error("Prefijo telefónico inválido.");
  }

  if (nationalDigits.length < code.minLength || nationalDigits.length > code.maxLength) {
    throw new Error(`Teléfono inválido para ${code.iso2} (debe tener ${formatLengthRule(code.minLength, code.maxLength)} dígitos).`);
  }

  return `+${code.dialDigits}${nationalDigits}`;
}

export function parseE164(rawValue: string | null | undefined, catalog: PhoneCountryCodeConfig[]): ParsedE164 | null {
  const prepared = prepareCatalog(catalog);
  const sanitized = sanitizeInput(rawValue);
  if (!sanitized || !sanitized.startsWith("+")) return null;

  const digits = sanitized.slice(1);
  const matched = prepared.find((item) => digits.startsWith(item.dialDigits));
  if (!matched) return null;

  const nationalNumber = digits.slice(matched.dialDigits.length);
  if (!nationalNumber) return null;

  return {
    iso2: matched.iso2,
    dialCode: matched.dialCode,
    nationalNumber
  };
}

function assertLocalLength(
  localNumber: string,
  code: PreparedPhoneCountryCode,
  fieldLabel: string
): asserts localNumber is string {
  if (localNumber.length < code.minLength || localNumber.length > code.maxLength) {
    throw new Error(
      `${fieldLabel} inválido para ${code.countryName}. Debe tener ${formatLengthRule(code.minLength, code.maxLength)} dígitos locales.`
    );
  }
}

function buildResult(code: PreparedPhoneCountryCode, localNumber: string): NormalizedPhoneResult {
  return {
    e164: `+${code.dialDigits}${localNumber}`,
    iso2: code.iso2,
    countryName: code.countryName,
    dialCode: code.dialCode,
    localNumber
  };
}

function resolveFromPlusInput(
  digitsWithCountry: string,
  catalog: PreparedPhoneCountryCode[],
  fieldLabel: string
): NormalizedPhoneResult {
  const matched = catalog.find((item) => digitsWithCountry.startsWith(item.dialDigits));
  if (!matched) {
    throw new Error(`${fieldLabel} inválido. Prefijo internacional no reconocido.`);
  }
  const localNumber = digitsWithCountry.slice(matched.dialDigits.length);
  assertLocalLength(localNumber, matched, fieldLabel);
  return buildResult(matched, localNumber);
}

function resolveFromPreferredCountry(
  localOrDialNumber: string,
  code: PreparedPhoneCountryCode,
  fieldLabel: string
): NormalizedPhoneResult {
  let localNumber = localOrDialNumber;
  if (localOrDialNumber.startsWith(code.dialDigits)) {
    const withoutDial = localOrDialNumber.slice(code.dialDigits.length);
    if (withoutDial.length >= code.minLength && withoutDial.length <= code.maxLength) {
      localNumber = withoutDial;
    }
  }
  assertLocalLength(localNumber, code, fieldLabel);
  return buildResult(code, localNumber);
}

export function inferPhoneIso2ByCountryText(
  countryText: string | null | undefined,
  catalog: PhoneCountryCodeConfig[]
): string | null {
  const normalized = normalizeText(countryText);
  if (!normalized) return null;

  const prepared = prepareCatalog(catalog);
  const directIso = normalizeIso2(countryText);
  if (directIso.length === 2 && prepared.some((item) => item.iso2 === directIso)) {
    return directIso;
  }

  const exactByName = prepared.find((item) => normalizeText(item.countryName) === normalized);
  if (exactByName) return exactByName.iso2;

  const containsByName = prepared.find((item) => normalizeText(item.countryName).includes(normalized));
  if (containsByName) return containsByName.iso2;

  return null;
}

export function detectPhoneCountryFromInput(
  rawInput: string | null | undefined,
  catalog: PhoneCountryCodeConfig[]
): PreparedPhoneCountryCode | null {
  const prepared = prepareCatalog(catalog);
  const sanitized = sanitizeInput(rawInput);
  if (!sanitized.startsWith("+")) return null;
  const digits = sanitized.slice(1);
  if (!digits) return null;
  return prepared.find((item) => digits.startsWith(item.dialDigits)) ?? null;
}

export function normalizePhoneToE164(
  rawInput: string | null | undefined,
  catalog: PhoneCountryCodeConfig[],
  options?: {
    preferredIso2?: string | null;
    required?: boolean;
    fieldLabel?: string;
  }
): NormalizedPhoneResult | null {
  const fieldLabel = options?.fieldLabel?.trim() || "Teléfono";
  const prepared = prepareCatalog(catalog);
  if (!prepared.length) {
    throw new Error("No hay catálogo de prefijos telefónicos disponible.");
  }

  const sanitized = sanitizeInput(rawInput);
  if (!sanitized) {
    if (options?.required) throw new Error(`${fieldLabel} requerido.`);
    return null;
  }

  if (sanitized.startsWith("+")) {
    return resolveFromPlusInput(sanitized.slice(1), prepared, fieldLabel);
  }

  const digits = sanitized.replace(/[^\d]/g, "");
  if (!digits) {
    if (options?.required) throw new Error(`${fieldLabel} requerido.`);
    return null;
  }

  const preferredIso2 = normalizeIso2(options?.preferredIso2);
  if (!preferredIso2) {
    throw new Error("Selecciona país para guardar el teléfono.");
  }

  const preferred = prepared.find((item) => item.iso2 === preferredIso2);
  if (!preferred) {
    throw new Error(`Prefijo telefónico no configurado para ${preferredIso2}.`);
  }
  return resolveFromPreferredCountry(digits, preferred, fieldLabel);
}
