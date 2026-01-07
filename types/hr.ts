export const HR_EMPLOYMENT_TYPES = ["DEPENDENCIA", "HONORARIOS", "OUTSOURCING", "TEMPORAL", "PRACTICAS"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYEE_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_EMPLOYEE_DOCUMENT_TYPES = ["DPI", "CV", "CONTRACT", "TITLE", "LICENSE", "EVALUATION", "WARNING", "OTHER"] as const;
export type HrEmployeeDocumentType = (typeof HR_EMPLOYEE_DOCUMENT_TYPES)[number];

export type HrBranch = {
  id: string;
  name: string;
  isActive: boolean;
};

export type HrDepartment = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type HrPosition = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type HrEmployeeDocument = {
  id: string;
  type: HrEmployeeDocumentType;
  title: string;
  fileUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type HrBranchAssignment = {
  id: string;
  branchId: string;
  branch: HrBranch | null;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
};

export type HrEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dpi: string | null;
  nit: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  address: string | null;
  hireDate: string;
  terminationDate: string | null;
  employmentType: HrEmploymentType;
  status: HrEmployeeStatus;
  primaryBranch: HrBranch | null;
  department: HrDepartment | null;
  position: HrPosition | null;
  notes: string | null;
  isActive: boolean;
  branchAssignments: HrBranchAssignment[];
  documents: HrEmployeeDocument[];
};
