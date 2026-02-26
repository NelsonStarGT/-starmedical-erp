export const COMPANY_EMPLOYEE_RANGES = [
  { id: "size_1_10", label: "1-10 empleados" },
  { id: "size_11_50", label: "11-50 empleados" },
  { id: "size_51_200", label: "51-200 empleados" },
  { id: "size_201_500", label: "201-500 empleados" },
  { id: "size_501_1000", label: "501-1000 empleados" },
  { id: "size_1000_plus", label: "1000+ empleados" }
] as const;

export type CompanyEmployeeRangeId = (typeof COMPANY_EMPLOYEE_RANGES)[number]["id"];

const BY_ID = new Set<string>(COMPANY_EMPLOYEE_RANGES.map((item) => item.id));

export function isCompanyEmployeeRangeId(value?: string | null): value is CompanyEmployeeRangeId {
  if (!value) return false;
  return BY_ID.has(value);
}
