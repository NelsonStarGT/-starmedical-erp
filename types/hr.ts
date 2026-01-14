export const HR_EMPLOYMENT_TYPES = ["DEPENDENCIA", "HONORARIOS", "OUTSOURCING", "TEMPORAL", "PRACTICAS"] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_EMPLOYEE_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const ONBOARDING_STATUSES = ["DRAFT", "IN_REVIEW", "ACTIVE"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const HR_EMPLOYEE_DOCUMENT_TYPES = [
  "DPI",
  "RTU",
  "RENAS",
  "POLICIACOS",
  "RECIBO_SERVICIO",
  "CONTRATO",
  "SANCION",
  "PERMISO",
  "OTRO"
] as const;
export type HrEmployeeDocumentType = (typeof HR_EMPLOYEE_DOCUMENT_TYPES)[number];

export const PAY_FREQUENCIES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const HR_PAYMENT_SCHEMES = ["MONTHLY", "DAILY", "PER_SERVICE", "HOURLY"] as const;
export type HrPaymentScheme = (typeof HR_PAYMENT_SCHEMES)[number];

export const HR_DOCUMENT_VISIBILITY = ["PERSONAL", "EMPRESA", "RESTRINGIDO"] as const;
export type HrDocumentVisibility = (typeof HR_DOCUMENT_VISIBILITY)[number];

export const LEAVE_TYPES = ["VACACIONES", "INCAPACIDAD", "PERMISO"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const DISCIPLINARY_ACTION_TYPES = ["LLAMADA_ATENCION", "AMONESTACION", "SUSPENSION", "TERMINACION"] as const;
export type DisciplinaryActionType = (typeof DISCIPLINARY_ACTION_TYPES)[number];

export const EVALUATION_QUESTION_TYPES = ["TEXT", "MULTIPLE", "SCALE"] as const;
export type EvaluationQuestionType = (typeof EVALUATION_QUESTION_TYPES)[number];

export const ATTENDANCE_STATUSES = ["NORMAL", "TARDY", "ABSENT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_COLORS = ["GREEN", "ORANGE", "RED"] as const;
export type AttendanceColor = (typeof ATTENDANCE_COLORS)[number];

export const ATTENDANCE_CLOSE_STATUSES = ["OPEN", "READY_TO_CLOSE", "CLOSED", "NEEDS_REVIEW"] as const;
export type AttendanceCloseStatus = (typeof ATTENDANCE_CLOSE_STATUSES)[number];

export const TIME_CLOCK_TYPES = ["IN", "OUT"] as const;
export type TimeClockType = (typeof TIME_CLOCK_TYPES)[number];

export const TIME_CLOCK_SOURCES = ["BIOMETRIC", "MANUAL"] as const;
export type TimeClockSource = (typeof TIME_CLOCK_SOURCES)[number];

export const OVERTIME_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type OvertimeRequestStatus = (typeof OVERTIME_REQUEST_STATUSES)[number];

export const PAYROLL_RUN_STATUSES = ["DRAFT", "APPROVED", "PUBLISHED"] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const PAYROLL_CONCEPT_TYPES = ["EARNING", "DEDUCTION"] as const;
export type PayrollConceptType = (typeof PAYROLL_CONCEPT_TYPES)[number];

export type HrBranch = {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
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
  paymentScheme: HrPaymentScheme;
  baseSalary: string | null;
  baseAllowance?: string | null;
  compensationAmount?: string | null;
  compensationCurrency?: string;
  compensationFrequency?: PayFrequency;
  compensationNotes?: string | null;
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
  code?: string | null;
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
  canEmployeeView?: boolean;
  viewGrantedUntil?: string | null;
  createdAt: string;
};

export type EmployeeDocument = {
  id: string;
  type: HrEmployeeDocumentType;
  visibility: HrDocumentVisibility;
  title: string;
  notes: string | null;
  retentionUntil: string | null;
  isArchived: boolean;
  currentVersion: EmployeeDocumentVersion | null;
  versions: EmployeeDocumentVersion[];
};

export type ProfessionalLicense = {
  applies: boolean;
  licenseNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  issuingEntity?: string | null;
  fileUrl: string | null;
  reminderDays: number | null;
  notes: string | null;
};

export type LeavePolicy = {
  id: string;
  name: string;
  daysPerYear: number;
  isActive: boolean;
};

export type LeaveBalance = {
  policy: LeavePolicy;
  availableDays: string;
};

export type LeaveRequest = {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  days: string;
  approvedBy?: string | null;
};

export type DisciplinaryAttachment = {
  id: string;
  fileUrl: string;
  fileName: string;
  mime?: string | null;
};

export type DisciplinaryAction = {
  id: string;
  type: DisciplinaryActionType;
  title: string;
  description?: string | null;
  issuedAt: string;
  endDate?: string | null;
  cooldownDays?: number | null;
  documentUrl?: string | null;
  attachments?: DisciplinaryAttachment[];
};

export type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  weeklyPattern?: unknown;
  toleranceMinutes: number;
  maxDailyHours?: string | null;
  maxWeeklyHours?: string | null;
  isActive: boolean;
};

export type EmployeeShiftAssignmentView = {
  id: string;
  shiftTemplate: ShiftTemplate | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

export type TimeClockDevice = {
  id: string;
  name: string;
  ipAddress?: string | null;
  branchId?: string | null;
  legalEntityId?: string | null;
  isActive: boolean;
  lastSyncAt?: string | null;
};

export type TimeClockLogEntry = {
  id: string;
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  legalEntityId?: string | null;
  timestamp: string;
  type: TimeClockType;
  source: TimeClockSource;
  notes?: string | null;
};

export type AttendanceComputed = {
  id: string;
  date: string;
  totalHours: string | null;
  status: AttendanceStatus;
  color: AttendanceColor;
  notes?: string | null;
};

export type AttendanceDay = {
  id: string;
  employeeId: string;
  date: string;
  shiftTemplateId?: string | null;
  branchId?: string | null;
  legalEntityId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  totalHours?: string | null;
  regularHours?: string | null;
  overtimeHours?: string | null;
  tardyMinutes?: number | null;
  status: AttendanceStatus;
  color: AttendanceColor;
  notes?: string | null;
  isApproved: boolean;
  approvedById?: string | null;
  approvedAt?: string | null;
};

export type OvertimeRequest = {
  id: string;
  employeeId: string;
  attendanceDayId: string;
  calculatedHours: string;
  requestedHours: string;
  status: OvertimeRequestStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  notes?: string | null;
  attendanceDay?: AttendanceDay | null;
  employeeName?: string | null;
  employeeCode?: string | null;
};

export type AttendanceAlert = {
  type: "TARDY" | "ABSENT" | "OVERTIME";
  title: string;
  severity: "warning" | "critical" | "info";
  employeeName?: string;
  employeeCode?: string;
  at?: string | null;
};

export type PayrollRun = {
  id: string;
  code: string;
  legalEntityId: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  totalGross?: string | null;
  totalDeductions?: string | null;
  totalNet?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  publishedAt?: string | null;
};

export type PayrollConcept = {
  id: string;
  code: string;
  type: PayrollConceptType;
  description: string;
  isTaxable: boolean;
  isEditable: boolean;
};

export type PayrollEmployeeConcept = {
  id: string;
  concept: PayrollConcept;
  quantity: string;
  amount: string;
  total: string;
};

export type PayrollEmployee = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName?: string | null;
  employeeCode?: string | null;
  employmentType: HrEmploymentType;
  baseSalary?: string | null;
  workedDays?: number | null;
  workedHours?: string | null;
  overtimeHours?: string | null;
  grossAmount?: string | null;
  totalDeductions?: string | null;
  netAmount?: string | null;
  concepts: PayrollEmployeeConcept[];
};

export type EvaluationForm = {
  id: string;
  name: string;
  description: string | null;
};

export type EmployeeEvaluation = {
  id: string;
  form: EvaluationForm;
  score: string | null;
  comments: string | null;
  evaluatedAt: string;
  evaluatedById?: string | null;
};

export type HrAlert = {
  type: "DOCUMENT_EXPIRY" | "LICENSE_EXPIRY" | "CONTRACT_EXPIRY";
  title: string;
  entityId: string;
  dueAt: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
};

export type HrDashboardKpis = {
  employeesActive: number;
  employeesExternal: number;
  employeesInternal: number;
  onboardingInProgress: number;
  docsExpiring30d: number;
  leavesPending: number;
  attendanceOpenToday: number;
  overtimePending: number;
  payrollDrafts: number;
};

export type HrDashboardAlert = {
  label: string;
  title: string;
  date: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  href: string;
};

export type HrDashboardShortcut = { label: string; href: string };

export type HrDashboardResponse = {
  data: {
    kpis: HrDashboardKpis;
    alerts: HrDashboardAlert[];
    shortcuts: HrDashboardShortcut[];
  };
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
  phoneMobile: string | null;
  phoneHome: string | null;
  birthDate: string | null;
  addressHome: string | null;
  workLocation?: string | null;
  notes: string | null;
  isExternal: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  residenceProofUrl: string | null;
  dpiPhotoUrl: string | null;
  rtuFileUrl: string | null;
  photoUrl: string | null;
  status: HrEmployeeStatus;
  isActive: boolean;
  onboardingStatus?: OnboardingStatus;
  onboardingStep?: number;
  completedAt?: string | null;
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
  access: {
    userId: string;
    email: string;
    name: string | null;
    roles: { id: string; name: string }[];
    permissions: { id: string; key: string; description: string | null }[];
  } | null;
  shiftAssignments?: EmployeeShiftAssignmentView[];
  leaveBalances?: LeaveBalance[];
  leaveRequests?: LeaveRequest[];
  disciplinaryActions?: DisciplinaryAction[];
  evaluations?: EmployeeEvaluation[];
  alerts: {
    documentsExpiring: number;
    licenseExpiring: boolean;
    items: HrAlert[];
  };
};

export type HrCompensationHistory = {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  prevSalary: string | null;
  newSalary: string | null;
  prevAllowance: string | null;
  newAllowance: string | null;
  prevPayScheme: HrPaymentScheme | null;
  newPayScheme: HrPaymentScheme | null;
  comments: string | null;
  createdById: string | null;
  createdAt: string;
};
