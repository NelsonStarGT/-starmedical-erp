"use client";

import { cn } from "@/lib/utils";
import LocationPicker, { type LocationPickerErrors, type LocationPickerValue } from "@/components/clients/LocationPicker";

export type GeoCascadeValue = {
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState?: string;
  geoFreeCity?: string;
};

export type GeoCascadeErrors = Partial<Record<keyof GeoCascadeValue, string>>;

export default function GeoCascadeFieldset({
  value,
  onChange,
  disabled,
  errors,
  className,
  idPrefix,
  title = "Ubicación",
  subtitle = "Selecciona País → Departamento → Municipio",
  showPostalCode = true,
  requireCountry,
  requireAdmin1,
  requireAdmin2,
  onHasDivisionCatalogChange
}: {
  value: GeoCascadeValue;
  onChange: (next: GeoCascadeValue) => void;
  disabled?: boolean;
  errors?: GeoCascadeErrors;
  className?: string;
  idPrefix?: string;
  title?: string;
  subtitle?: string;
  showPostalCode?: boolean;
  requireCountry?: boolean;
  requireAdmin1?: boolean;
  requireAdmin2?: boolean;
  onHasDivisionCatalogChange?: (hasDivisionCatalog: boolean) => void;
}) {
  const locationValue: LocationPickerValue = {
    countryId: value.geoCountryId,
    departmentId: value.geoAdmin1Id,
    municipalityId: value.geoAdmin2Id,
    admin3Id: value.geoAdmin3Id,
    postalCode: value.geoPostalCode,
    freeState: value.geoFreeState ?? "",
    freeCity: value.geoFreeCity ?? ""
  };

  const locationErrors: LocationPickerErrors = {
    countryId: errors?.geoCountryId,
    departmentId: errors?.geoAdmin1Id,
    municipalityId: errors?.geoAdmin2Id,
    admin3Id: errors?.geoAdmin3Id,
    postalCode: errors?.geoPostalCode,
    freeState: errors?.geoAdmin1Id,
    freeCity: errors?.geoAdmin2Id
  };

  const requiredSuffix =
    requireCountry || requireAdmin1 || requireAdmin2
      ? " · Campos requeridos"
      : "";

  return (
    <LocationPicker
      className={cn(className)}
      idPrefix={idPrefix}
      value={locationValue}
      errors={locationErrors}
      disabled={disabled}
      title={title}
      subtitle={`${subtitle}${requiredSuffix}`}
      showPostalCode={showPostalCode}
      onCatalogModeChange={onHasDivisionCatalogChange}
      onChange={(next) =>
        onChange({
          geoCountryId: next.countryId,
          geoAdmin1Id: next.departmentId,
          geoAdmin2Id: next.municipalityId,
          geoAdmin3Id: next.admin3Id,
          geoPostalCode: next.postalCode,
          geoFreeState: next.freeState,
          geoFreeCity: next.freeCity
        })
      }
    />
  );
}
