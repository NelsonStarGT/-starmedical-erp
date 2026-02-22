export type MedicalDocumentSettings = {
  logoUrl: string | null;
  letterheadBackgroundUrl: string | null;
  margins: {
    topIn: number;
    rightIn: number;
    bottomIn: number;
    leftIn: number;
  };
  footerText: string;
  updatedAt: string;
};

export function defaultMedicalDocumentSettings(): MedicalDocumentSettings {
  return {
    logoUrl: null,
    letterheadBackgroundUrl: null,
    margins: {
      topIn: 0.75,
      rightIn: 0.75,
      bottomIn: 0.75,
      leftIn: 0.75
    },
    footerText: "Documento clínico institucional StarMedical.",
    updatedAt: new Date(0).toISOString()
  };
}

function normalizeOptionalUrl(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function clampMargin(value: number | null | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0.3) return 0.3;
  if (parsed > 1.5) return 1.5;
  return Number(parsed.toFixed(2));
}

export function normalizeMedicalDocumentSettings(
  input: Partial<MedicalDocumentSettings> | null | undefined
): MedicalDocumentSettings {
  const fallback = defaultMedicalDocumentSettings();
  return {
    logoUrl: normalizeOptionalUrl(input?.logoUrl),
    letterheadBackgroundUrl: normalizeOptionalUrl(input?.letterheadBackgroundUrl),
    margins: {
      topIn: clampMargin(input?.margins?.topIn, fallback.margins.topIn),
      rightIn: clampMargin(input?.margins?.rightIn, fallback.margins.rightIn),
      bottomIn: clampMargin(input?.margins?.bottomIn, fallback.margins.bottomIn),
      leftIn: clampMargin(input?.margins?.leftIn, fallback.margins.leftIn)
    },
    footerText: (input?.footerText || fallback.footerText).trim() || fallback.footerText,
    updatedAt: input?.updatedAt || new Date().toISOString()
  };
}
