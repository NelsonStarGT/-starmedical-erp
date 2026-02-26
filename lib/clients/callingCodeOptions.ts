export type CallingCodeOption = {
  id: string;
  iso2: string;
  countryName: string;
  dialCode: string;
  callingCode: string;
  minLength: number;
  maxLength: number;
  example?: string | null;
  isActive: boolean;
  geoCountryId?: string | null;
};

export function normalizeCallingCodeValue(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

export function buildCallingCodeOptionLabel(option: Pick<CallingCodeOption, "dialCode" | "callingCode" | "countryName">) {
  const dialCode = normalizeCallingCodeValue(option.dialCode || option.callingCode);
  return `${dialCode || option.callingCode} ${option.countryName}`.trim();
}
