function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function validateNotFutureDate(input: Date, now = new Date()) {
  const target = stripTime(input).getTime();
  const today = stripTime(now).getTime();
  if (target > today) {
    return "La fecha no puede ser futura.";
  }
  return null;
}

export function validateNotOlderThanYears(input: Date, yearsBack: number, now = new Date()) {
  if (!Number.isFinite(yearsBack) || yearsBack <= 0) return null;
  const maxBack = stripTime(now);
  maxBack.setFullYear(maxBack.getFullYear() - Math.floor(yearsBack));
  if (stripTime(input).getTime() < maxBack.getTime()) {
    return `La fecha no puede ser anterior a ${Math.floor(yearsBack)} años.`;
  }
  return null;
}

export function validateDateBetween(input: Date, minDate?: Date | null, maxDate?: Date | null) {
  const target = stripTime(input).getTime();
  if (minDate && target < stripTime(minDate).getTime()) {
    return "La fecha es menor al límite permitido.";
  }
  if (maxDate && target > stripTime(maxDate).getTime()) {
    return "La fecha supera el límite permitido.";
  }
  return null;
}

export function validateBirthDateRange(input: Date, options?: { now?: Date; maxYearsBack?: number }) {
  const now = options?.now ?? new Date();
  const maxYearsBack = options?.maxYearsBack ?? 120;

  const futureError = validateNotFutureDate(input, now);
  if (futureError) return futureError;

  const olderError = validateNotOlderThanYears(input, maxYearsBack, now);
  if (olderError) return olderError;

  return null;
}
