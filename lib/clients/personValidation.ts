export function parseOptionalBirthDate(value?: string | null): Date | null {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha inválida.");
  }
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const minDate = new Date(maxDate.getFullYear() - 120, maxDate.getMonth(), maxDate.getDate());

  if (parsed.getTime() > maxDate.getTime()) {
    throw new Error("La fecha de nacimiento no puede ser futura.");
  }
  if (parsed.getTime() < minDate.getTime()) {
    throw new Error("La fecha de nacimiento no puede ser anterior a 120 años.");
  }
  return parsed;
}
