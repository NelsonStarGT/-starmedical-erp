import { CIE10_LOCAL_SEED } from "@/lib/medical/cie10Seed";

export type ICD10Item = {
  code: string;
  label: string;
};

// Fallback local para entornos sin tabla/migracion.
export const ICD10_MOCK_CATALOG: ICD10Item[] = CIE10_LOCAL_SEED.map((item) => ({
  code: item.code,
  label: item.title
}));

export function searchIcd10Mock(query: string, limit = 20): ICD10Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICD10_MOCK_CATALOG.slice(0, limit);
  return ICD10_MOCK_CATALOG.filter((item) => {
    return item.code.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
  }).slice(0, limit);
}

export const searchIcd10Fallback = searchIcd10Mock;
