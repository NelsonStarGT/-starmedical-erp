export function sanitizePhoneInputValue(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";

  const plusAtStart = source.startsWith("+");
  const digits = source.replace(/[^\d]/g, "");
  if (!digits) return plusAtStart ? "+" : "";

  return plusAtStart ? `+${digits}` : digits;
}

export function sanitizeLocalNumber(value: string): string {
  return (value ?? "").replace(/[^\d]/g, "");
}

export function normalizeCallingCode(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

export function buildE164(callingCode: string | null | undefined, localNumber: string | null | undefined): string | null {
  const code = normalizeCallingCode(callingCode);
  const local = sanitizeLocalNumber(localNumber ?? "");
  if (!code || !local) return null;
  return `${code}${local}`;
}

export function assertStrictPhoneValue(rawValue: string, fieldLabel = "Teléfono"): string {
  const raw = (rawValue ?? "").trim();
  if (!raw) throw new Error(`${fieldLabel} requerido.`);

  if (/[^0-9+]/.test(raw)) {
    throw new Error(`${fieldLabel} inválido. Solo se permiten números y '+' inicial.`);
  }

  const plusMatches = raw.match(/\+/g) ?? [];
  if (plusMatches.length > 1 || (plusMatches.length === 1 && !raw.startsWith("+"))) {
    throw new Error(`${fieldLabel} inválido. '+' solo puede ir al inicio.`);
  }

  if (raw === "+" || raw.replace(/\+/g, "").length === 0) {
    throw new Error(`${fieldLabel} inválido.`);
  }

  return raw;
}

export function assertStrictLocalPhoneValue(rawValue: string, fieldLabel = "Teléfono"): string {
  const raw = (rawValue ?? "").trim();
  if (!raw) throw new Error(`${fieldLabel} requerido.`);
  if (/[^0-9]/.test(raw)) {
    throw new Error(`${fieldLabel} inválido. Solo se permiten dígitos.`);
  }
  if (!raw.length) throw new Error(`${fieldLabel} inválido.`);
  return raw;
}
