export type DiagnosticOrderStatus = "DRAFT" | "PAID" | "IN_PROGRESS" | "READY" | "RELEASED" | "CANCELLED";
export type DiagnosticOrderAdminStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "INSURANCE_AUTH"
  | "PAID"
  | "SENT_TO_EXECUTION"
  | "COMPLETED"
  | "CANCELLED";
export type DiagnosticPaymentMethod = "CASH" | "CARD" | "TRANSFER" | "INSURANCE";
export type DiagnosticOrderSourceType = "WALK_IN" | "CONSULTA" | "RECEPTION";
export type DiagnosticItemKind = "LAB" | "IMAGING";
export type DiagnosticItemStatus =
  | "ORDERED"
  | "COLLECTED"
  | "IN_ANALYSIS"
  | "PENDING_VALIDATION"
  | "VALIDATED"
  | "RELEASED"
  | "CANCELLED";
export type ImagingModality = "XR" | "US" | "CT" | "MR";
export type LabResultFlag = "NORMAL" | "HIGH" | "LOW" | "CRITICAL";
export type ReportStatus = "DRAFT" | "SIGNED" | "RELEASED";

export type DiagnosticLabResult = {
  id: string;
  testCode: string | null;
  valueText: string | null;
  valueNumber: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  flag: LabResultFlag | null;
  resultAt: string | null;
  enteredByUserId: string | null;
  validatedByUserId: string | null;
  validatedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosticCatalogItem = {
  id: string;
  code: string;
  name: string;
  kind: DiagnosticItemKind;
  modality: ImagingModality | null;
  unit: string | null;
  price: number | null;
  refLow: number | null;
  refHigh: number | null;
  isActive?: boolean;
};

export type DiagnosticImagingReport = {
  id: string;
  status: ReportStatus;
  findings: string | null;
  impression: string | null;
  createdByUserId: string | null;
  signedByUserId: string | null;
  signedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosticImagingStudy = {
  id: string;
  modality: ImagingModality;
  orthancStudyId: string | null;
  studyInstanceUID: string | null;
  receivedAt: string | null;
  reports: DiagnosticImagingReport[];
};

export type ClinicalModuleSummary = {
  expected: boolean;
  total: number;
  released: number;
  cancelled: number;
  pending: number;
  completed: boolean;
};

export type DiagnosticClinicalSummary = {
  lab: ClinicalModuleSummary;
  xr: ClinicalModuleSummary;
  us: ClinicalModuleSummary;
};

export type DiagnosticOrderItem = {
  id: string;
  orderId: string;
  kind: DiagnosticItemKind;
  status: DiagnosticItemStatus;
  priority?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  catalogItem: DiagnosticCatalogItem;
  specimen?: {
    id: string;
    specimenCode: string;
    collectedAt: string | null;
    collectedByUserId: string | null;
  } | null;
  labResults: DiagnosticLabResult[];
  imagingStudy: DiagnosticImagingStudy | null;
};

export type DiagnosticOrderDTO = {
  id: string;
  patientId: string;
  patient: { id: string; name: string | null; dpi?: string | null; nit?: string | null } | null;
  sourceType?: DiagnosticOrderSourceType;
  sourceRefId?: string | null;
  status: DiagnosticOrderStatus;
  adminStatus: DiagnosticOrderAdminStatus;
  paymentMethod: DiagnosticPaymentMethod | null;
  paymentReference: string | null;
  insuranceId: string | null;
  authorizedAt: string | null;
  paidAt: string | null;
  authorizedByUserId: string | null;
  orderedAt: string;
  notes?: string | null;
  totalAmount: number | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: DiagnosticOrderItem[];
  clinicalSummary?: DiagnosticClinicalSummary;
};
