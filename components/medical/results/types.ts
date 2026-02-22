export type ResultType = "LAB" | "RX" | "USG";

export type ResultFormat = "PDF" | "IMAGE" | "VALUES";

export type MedicalResultStatus = "ready" | "in_progress" | "pending";

export type MedicalResultSummary = {
  id: string;
  patientId: string;
  title: string;
  type: ResultType;
  performedAt: string;
  status: MedicalResultStatus;
  formats: ResultFormat[];
  orderId?: string | null;
  sourceRefId?: string | null;
};

export type MedicalResultValueRow = {
  parameter: string;
  value: string;
  range: string | null;
  flag: string | null;
};

export type MedicalResultDetail = {
  id: string;
  summary: MedicalResultSummary;
  pdfUrl?: string | null;
  imageUrls?: string[];
  valuesTable?: MedicalResultValueRow[];
};

export type MedicalResultsBundle = {
  summaries: MedicalResultSummary[];
  detailsById: Record<string, MedicalResultDetail>;
  source: "api" | "mock";
  note?: string;
};
