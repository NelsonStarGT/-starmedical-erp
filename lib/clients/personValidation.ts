export function parseOptionalBirthDate(value?: string | null): Date | null {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida.");
  }
  if (parsed.getTime() > Date.now()) {
    throw new Error("La fecha de nacimiento no puede ser futura.");
  }
  return parsed;
}
