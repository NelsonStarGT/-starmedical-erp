export const INSURER_LINE_SEED = [
  { id: "medico", label: "Médico / Salud" },
  { id: "auto", label: "Auto" },
  { id: "vida", label: "Vida" },
  { id: "funerario", label: "Funerario" },
  { id: "hogar", label: "Hogar" },
  { id: "empresarial", label: "Empresarial" },
  { id: "responsabilidad_civil", label: "Responsabilidad civil" },
  { id: "accidentes_personales", label: "Accidentes personales" },
  { id: "viajes", label: "Viajes" },
  { id: "reaseguro", label: "Reaseguro" },
  { id: "tpa", label: "TPA / Administrador de terceros" }
] as const;

export const INSURER_LINE_FALLBACK = [
  ...INSURER_LINE_SEED,
  { id: "otro", label: "Otro" }
] as const;

function normalizeCode(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || null;
}

export function normalizeInsurerLineSelection(input: {
  primaryCode?: string | null;
  secondaryCodes?: ReadonlyArray<string | null | undefined>;
}) {
  const primaryCode = normalizeCode(input.primaryCode);
  const secondaryCodes = Array.from(
    new Set((input.secondaryCodes ?? []).map((item) => normalizeCode(item)).filter(Boolean) as string[])
  ).filter((code) => code !== primaryCode);

  return {
    primaryCode,
    secondaryCodes
  };
}
