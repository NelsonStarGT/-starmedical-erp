export function normalizeAcquisitionToken(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isReferralAcquisitionSource(input?: { code?: string | null; name?: string | null } | null) {
  const token = normalizeAcquisitionToken(input?.code || input?.name);
  return token.includes("REFER");
}

export function isSocialAcquisitionSource(input?: { code?: string | null; name?: string | null } | null) {
  const token = normalizeAcquisitionToken(input?.code || input?.name);
  return token.includes("SOCIAL") || token.includes("REDES");
}

export function isOtherAcquisitionSource(input?: { code?: string | null; name?: string | null } | null) {
  const token = normalizeAcquisitionToken(input?.code || input?.name);
  return token === "OTRO" || token === "OTHER";
}

export function isOtherAcquisitionDetail(input?: { code?: string | null; name?: string | null } | null) {
  const token = normalizeAcquisitionToken(input?.code || input?.name);
  if (!token) return false;
  return (
    token === "OTRA_RED" ||
    token === "OTHER_NETWORK" ||
    token === "RED_SOCIAL_OTRA" ||
    token === "OTHER"
  );
}

export function requiresAcquisitionOtherNote(input: {
  sourceCode?: string | null;
  sourceName?: string | null;
  detailCode?: string | null;
  detailName?: string | null;
}) {
  if (isOtherAcquisitionSource({ code: input.sourceCode, name: input.sourceName })) return true;
  if (!isSocialAcquisitionSource({ code: input.sourceCode, name: input.sourceName })) return false;
  return isOtherAcquisitionDetail({ code: input.detailCode, name: input.detailName });
}

export type AcquisitionConditionalValidationInput = {
  sourceCode?: string | null;
  sourceName?: string | null;
  detailCode?: string | null;
  detailName?: string | null;
  detailOptionId?: string | null;
  otherNote?: string | null;
};

export type AcquisitionConditionalValidationResult = {
  requiresSocialDetail: boolean;
  requiresOtherNote: boolean;
  detailError: string | null;
  noteError: string | null;
  normalizedOtherNote: string | null;
};

export function validateAcquisitionConditionalFields(
  input: AcquisitionConditionalValidationInput
): AcquisitionConditionalValidationResult {
  const requiresSocialDetail = isSocialAcquisitionSource({
    code: input.sourceCode,
    name: input.sourceName
  });
  const requiresOtherNote = requiresAcquisitionOtherNote({
    sourceCode: input.sourceCode,
    sourceName: input.sourceName,
    detailCode: input.detailCode,
    detailName: input.detailName
  });

  const detailId = (input.detailOptionId ?? "").trim();
  const normalizedOtherNote = (input.otherNote ?? "").trim();

  let detailError: string | null = null;
  let noteError: string | null = null;

  if (requiresSocialDetail && !detailId) {
    detailError = "Selecciona la red social.";
  }

  if (requiresOtherNote && normalizedOtherNote.length === 0) {
    noteError = requiresSocialDetail ? "Describe la red social." : "Describe cómo nos conoció.";
  } else if (requiresOtherNote && normalizedOtherNote.length > 150) {
    noteError = "La descripción del canal no puede exceder 150 caracteres.";
  }

  return {
    requiresSocialDetail,
    requiresOtherNote,
    detailError,
    noteError,
    normalizedOtherNote: requiresOtherNote ? normalizedOtherNote : null
  };
}
