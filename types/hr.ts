export const HR_EMPLOYMENT_TYPES = ["DEPENDENCIA", "HONORARIOS", "OUTSOURCING", "TEMPORAL", "PRACTICAS"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYEE_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_EMPLOYEE_DOCUMENT_TYPES = ["DPI", "CV", "CONTRACT", "TITLE", "LICENSE", "EVALUATION", "WARNING", "OTHER"] as const;
export type HrEmployeeDocumentType = (typeof HR_EMPLOYEE_DOCUMENT_TYPES)[number];

export const PAY_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

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

export type LegalEntitySummary = {
  id: string;
  name: string;
  comercialName: string | null;
  nit?: string | null;
};

export type EmployeeEngagement = {
  id: string;
  legalEntity: LegalEntitySummary;
  employmentType: HrEmploymentType;
  status: HrEmployeeStatus;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  isPayrollEligible: boolean;
  compensationAmount: string | null;
  compensationCurrency: string;
  compensationFrequency: PayFrequency;
  compensationNotes: string | null;
};

export type EmployeeCompensation = {
  id: string;
  engagementId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  baseSalary: string | null;
  currency: string;
  payFrequency: PayFrequency;
  allowances?: unknown;
  deductions?: unknown;
};

export type EmployeeBranchAssignment = {
  id: string;
  branchId: string;
  branch: HrBranch | null;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
};

export type EmployeePositionAssignment = {
  id: string;
  positionId: string;
  position: HrPosition | null;
  departmentId: string | null;
  department: HrDepartment | null;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export type EmployeeDocumentVersion = {
  id: string;
  versionNumber: number;
  fileUrl: string;
  issuedAt: string | null;
  deliveredAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type EmployeeDocument = {
  id: string;
  type: HrEmployeeDocumentType;
  title: string;
  notes: string | null;
  retentionUntil: string | null;
  isArchived: boolean;
  currentVersion: EmployeeDocumentVersion | null;
  versions: EmployeeDocumentVersion[];
};

export type ProfessionalLicense = {
  applies: boolean;
  number: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  issuingEntity?: string | null;
  fileUrl: string | null;
  reminderDays: number | null;
  notes: string | null;
};

export type HrAlert = {
  type: "DOCUMENT_EXPIRY" | "LICENSE_EXPIRY" | "CONTRACT_EXPIRY";
  title: string;
  entityId: string;
  dueAt: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
};

export type HrEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dpi: string;
  nit: string | null;
  email: string | null;
  personalEmail: string | null;
  phone: string | null;
  homePhone: string | null;
  birthDate: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  residenceProofUrl: string | null;
  dpiPhotoUrl: string | null;
  rtuFileUrl: string | null;
  photoUrl: string | null;
  status: HrEmployeeStatus;
  isActive: boolean;
  primaryLegalEntity: LegalEntitySummary | null;
  primaryBranch: HrBranch | null;
  primaryPosition: HrPosition | null;
  primaryDepartment: HrDepartment | null;
  primaryEngagement: EmployeeEngagement | null;
  engagements: EmployeeEngagement[];
  branchAssignments: EmployeeBranchAssignment[];
  positionAssignments: EmployeePositionAssignment[];
  documents: EmployeeDocument[];
  professionalLicense: ProfessionalLicense | null;
  alerts: {
    documentsExpiring: number;
    licenseExpiring: boolean;
    items: HrAlert[];
  };
};
