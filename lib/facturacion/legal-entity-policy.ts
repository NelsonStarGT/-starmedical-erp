function normalizeIdentifier(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function requiresLegalEntitySelection(input: {
  activeLegalEntitiesCount: number;
  requestedLegalEntityId: string | null | undefined;
  profileLegalEntityId: string | null | undefined;
}) {
  if (input.activeLegalEntitiesCount <= 1) return false;
  const requested = normalizeIdentifier(input.requestedLegalEntityId);
  const profile = normalizeIdentifier(input.profileLegalEntityId);
  return !requested && !profile;
}
