import { ClientLocationType } from "@prisma/client";

export type PersonLocationDraft = {
  type: ClientLocationType;
  address: string;
  addressLine1: string | null;
  isPrimary?: boolean;
};

type BuildPersonLocationDraftsInput = {
  addressGeneral?: string | null;
  addressHome?: string | null;
  addressWork?: string | null;
  hasGeoContext: boolean;
  geoAdmin2Name?: string | null;
  geoFreeCity?: string | null;
  geoAdmin1Name?: string | null;
  geoFreeState?: string | null;
  geoCountryName?: string | null;
  workHasGeoContext?: boolean;
  workGeoAdmin2Name?: string | null;
  workGeoFreeCity?: string | null;
  workGeoAdmin1Name?: string | null;
  workGeoFreeState?: string | null;
  workGeoCountryName?: string | null;
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildPersonLocationDrafts(input: BuildPersonLocationDraftsInput): PersonLocationDraft[] {
  const addressGeneral = normalizeText(input.addressGeneral);
  const addressHome = normalizeText(input.addressHome);
  const addressWork = normalizeText(input.addressWork);
  const residenceAddressLine1 = addressHome ?? addressGeneral;

  const inferredResidenceAddress =
    residenceAddressLine1 ||
    [input.geoAdmin2Name ?? input.geoFreeCity, input.geoAdmin1Name ?? input.geoFreeState, input.geoCountryName]
      .filter(Boolean)
      .join(", ")
      .trim() ||
    null;

  const locations: PersonLocationDraft[] = [];
  if (inferredResidenceAddress && (residenceAddressLine1 || input.hasGeoContext)) {
    locations.push({
      type: ClientLocationType.HOME,
      address: inferredResidenceAddress,
      addressLine1: residenceAddressLine1,
      isPrimary: true
    });
  }
  const inferredWorkAddress =
    addressWork ||
    [input.workGeoAdmin2Name ?? input.workGeoFreeCity, input.workGeoAdmin1Name ?? input.workGeoFreeState, input.workGeoCountryName]
      .filter(Boolean)
      .join(", ")
      .trim() ||
    null;

  if (inferredWorkAddress && (addressWork || input.workHasGeoContext)) {
    locations.push({
      type: ClientLocationType.WORK,
      address: inferredWorkAddress,
      addressLine1: addressWork
    });
  }

  return locations;
}

type BuildBirthPlaceLabelInput = {
  cityOrTown?: string | null;
  geoAdmin2Name?: string | null;
  geoFreeCity?: string | null;
  geoAdmin1Name?: string | null;
  geoFreeState?: string | null;
  geoCountryName?: string | null;
};

function dedupeParts(parts: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const part of parts) {
    const key = part.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(part.trim());
  }
  return output;
}

export function buildBirthPlaceLabel(input: BuildBirthPlaceLabelInput): string | null {
  const cityOrTown = normalizeText(input.cityOrTown);
  const municipality = normalizeText(input.geoAdmin2Name) ?? normalizeText(input.geoFreeCity);
  const department = normalizeText(input.geoAdmin1Name) ?? normalizeText(input.geoFreeState);
  const country = normalizeText(input.geoCountryName);

  const parts = dedupeParts([cityOrTown, municipality, department, country].filter((value): value is string => Boolean(value)));
  if (!parts.length) return null;
  return parts.join(", ");
}
