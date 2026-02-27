export const INSTITUTION_TYPES = [
  { id: "gobierno", label: "Gobierno" },
  { id: "municipalidad", label: "Municipalidad" },
  { id: "educativa", label: "Educativa" },
  { id: "ong_fundacion", label: "ONG / Fundación" },
  { id: "salud", label: "Salud" },
  { id: "iglesia", label: "Iglesia" },
  { id: "comunitaria", label: "Comunitaria" },
  { id: "deportiva", label: "Deportiva" },
  { id: "cultural", label: "Cultural" },
  { id: "otro", label: "Otro" }
] as const;

export type InstitutionTypeId = (typeof INSTITUTION_TYPES)[number]["id"];

export function isInstitutionTypeId(value: string): value is InstitutionTypeId {
  return INSTITUTION_TYPES.some((item) => item.id === value);
}
