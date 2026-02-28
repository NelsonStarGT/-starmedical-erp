export type ClientsReportsDatePresetKey =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "last_12_months"
  | "last_24_months"
  | "last_36_months"
  | "last_48_months"
  | "month_to_date"
  | "year_to_date"
  | "previous_year";

export const CLIENTS_REPORTS_DATE_PRESETS: Array<{ key: ClientsReportsDatePresetKey; label: string }> = [
  { key: "today", label: "Hoy" },
  { key: "last_7_days", label: "7 días" },
  { key: "last_30_days", label: "30 días" },
  { key: "last_12_months", label: "12m" },
  { key: "last_24_months", label: "24m" },
  { key: "last_36_months", label: "36m" },
  { key: "last_48_months", label: "48m" },
  { key: "month_to_date", label: "Mes actual" },
  { key: "year_to_date", label: "Año actual" },
  { key: "previous_year", label: "Año anterior" }
];

export const CLIENTS_REPORTS_DEFAULT_RANGE_PRESET: ClientsReportsDatePresetKey = "last_30_days";

export const CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS = [
  { key: "today", label: "Hoy" },
  { key: "last_7_days", label: "Últimos 7 días" },
  { key: "last_30_days", label: "Últimos 30 días" },
  { key: "last_12_months", label: "Últimos 12 meses" },
  { key: "last_24_months", label: "Últimos 24 meses" },
  { key: "last_36_months", label: "Últimos 36 meses" },
  { key: "last_48_months", label: "Últimos 48 meses" },
  { key: "month_to_date", label: "Mes actual" },
  { key: "year_to_date", label: "Año actual" },
  { key: "previous_year", label: "Año anterior" }
] as const satisfies ReadonlyArray<{ key: ClientsReportsDatePresetKey; label: string }>;

export const CLIENTS_REPORTS_RANGE_DROPDOWN_KEYS = CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS.map(
  (option) => option.key
) as readonly ClientsReportsDatePresetKey[];

export function resolveClientsReportsRangePresetToggle(
  current: ClientsReportsDatePresetKey | null,
  next: ClientsReportsDatePresetKey
) {
  return current === next ? CLIENTS_REPORTS_DEFAULT_RANGE_PRESET : next;
}

function toLocalDateStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function subDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function subMonths(date: Date, months: number) {
  const target = new Date(date);
  const day = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() - months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

export function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveClientsReportsDatePresetRange(
  key: ClientsReportsDatePresetKey,
  now = new Date()
): { from: string; to: string } {
  const today = toLocalDateStart(now);

  switch (key) {
    case "today":
      return {
        from: toIsoLocalDate(today),
        to: toIsoLocalDate(today)
      };
    case "last_7_days": {
      const from = subDays(today, 6);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "last_30_days": {
      const from = subDays(today, 29);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "last_12_months": {
      const from = subMonths(today, 12);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "last_24_months": {
      const from = subMonths(today, 24);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "last_36_months": {
      const from = subMonths(today, 36);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "last_48_months": {
      const from = subMonths(today, 48);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "month_to_date": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "year_to_date": {
      const from = new Date(today.getFullYear(), 0, 1);
      return {
        from: toIsoLocalDate(from),
        to: toIsoLocalDate(today)
      };
    }
    case "previous_year": {
      const year = today.getFullYear() - 1;
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`
      };
    }
    default:
      return {
        from: toIsoLocalDate(today),
        to: toIsoLocalDate(today)
      };
  }
}

export function resolveClientsReportsDatePresetFromRange(
  params: { from?: string | null; to?: string | null },
  now = new Date(),
  keys: readonly ClientsReportsDatePresetKey[] = CLIENTS_REPORTS_RANGE_DROPDOWN_KEYS
): ClientsReportsDatePresetKey | null {
  const from = String(params.from || "").trim();
  const to = String(params.to || "").trim();
  if (!from || !to) return null;

  for (const key of keys) {
    const range = resolveClientsReportsDatePresetRange(key, now);
    if (range.from === from && range.to === to) {
      return key;
    }
  }

  return null;
}
