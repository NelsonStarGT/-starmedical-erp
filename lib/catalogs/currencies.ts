export type IsoCurrencyOption = {
  code: string;
  name: string;
  label: string;
};

const ISO_4217_CURRENCY_SEED = [
  { code: "GTQ", name: "Quetzal guatemalteco" },
  { code: "USD", name: "Dólar estadounidense" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "BZD", name: "Dólar beliceño" },
  { code: "HNL", name: "Lempira hondureño" },
  { code: "NIO", name: "Córdoba nicaragüense" },
  { code: "CRC", name: "Colón costarricense" },
  { code: "PAB", name: "Balboa panameño" },
  { code: "DOP", name: "Peso dominicano" },
  { code: "COP", name: "Peso colombiano" },
  { code: "VES", name: "Bolívar venezolano" },
  { code: "PEN", name: "Sol peruano" },
  { code: "BOB", name: "Boliviano" },
  { code: "CLP", name: "Peso chileno" },
  { code: "ARS", name: "Peso argentino" },
  { code: "PYG", name: "Guaraní paraguayo" },
  { code: "UYU", name: "Peso uruguayo" },
  { code: "BRL", name: "Real brasileño" },
  { code: "CAD", name: "Dólar canadiense" }
] as const;

export const ISO_4217_CURRENCIES: ReadonlyArray<IsoCurrencyOption> = ISO_4217_CURRENCY_SEED.map((item) => ({
  code: item.code,
  name: item.name,
  label: `${item.code} · ${item.name}`
}));

export const ISO_4217_CURRENCY_BY_CODE = new Map(ISO_4217_CURRENCIES.map((item) => [item.code, item]));
const ISO_4217_CODE_SET = new Set(ISO_4217_CURRENCIES.map((item) => item.code));

function normalizeCodeToken(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized.length ? normalized : null;
}

export function isIso4217CurrencyCode(value: string | null | undefined): value is string {
  const normalized = normalizeCodeToken(value);
  return normalized ? ISO_4217_CODE_SET.has(normalized) : false;
}

export function getIso4217CurrencyOptions() {
  return ISO_4217_CURRENCIES;
}

export function resolveCurrencyPreferenceSelection(input: {
  preferredCurrencyCode?: string | null;
  acceptedCurrencyCodes?: ReadonlyArray<string | null | undefined> | null;
}) {
  const preferredRaw = normalizeCodeToken(input.preferredCurrencyCode);
  const preferredCurrencyCode = preferredRaw && ISO_4217_CODE_SET.has(preferredRaw) ? preferredRaw : null;
  const invalidPreferredCurrencyCode = preferredRaw && !preferredCurrencyCode ? preferredRaw : null;

  const acceptedCurrencyCodes: string[] = [];
  const invalidAcceptedCurrencyCodes: string[] = [];
  for (const row of input.acceptedCurrencyCodes ?? []) {
    const next = normalizeCodeToken(row);
    if (!next) continue;
    if (!ISO_4217_CODE_SET.has(next)) {
      invalidAcceptedCurrencyCodes.push(next);
      continue;
    }
    if (!acceptedCurrencyCodes.includes(next)) {
      acceptedCurrencyCodes.push(next);
    }
  }

  if (preferredCurrencyCode && !acceptedCurrencyCodes.includes(preferredCurrencyCode)) {
    acceptedCurrencyCodes.unshift(preferredCurrencyCode);
  }

  return {
    preferredCurrencyCode,
    acceptedCurrencyCodes,
    invalidPreferredCurrencyCode,
    invalidAcceptedCurrencyCodes
  };
}
