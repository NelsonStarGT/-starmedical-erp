export const INSTITUTIONAL_REGIMES = [
  { id: "educacion", label: "Educación" },
  { id: "salud", label: "Salud" },
  { id: "asistencia_social", label: "Asistencia social" },
  { id: "seguridad", label: "Seguridad" },
  { id: "religioso", label: "Religioso" },
  { id: "deportivo", label: "Deportivo" },
  { id: "cultural", label: "Cultural" },
  { id: "comunitario", label: "Comunitario" },
  { id: "otro", label: "Otro" }
] as const;

export type InstitutionalRegimeId = (typeof INSTITUTIONAL_REGIMES)[number]["id"];

export function isInstitutionalRegimeId(value: string): value is InstitutionalRegimeId {
  return INSTITUTIONAL_REGIMES.some((item) => item.id === value);
}
