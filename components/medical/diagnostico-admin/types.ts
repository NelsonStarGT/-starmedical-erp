export type DiagnosticOrderType = "LAB" | "RX" | "USG";

export type DiagnosticOrderStatus = "pending" | "in_progress" | "ready";

export type DiagnosticAcceptance = "accepted" | "rejected";

export type AdminDoctor = {
  id: string;
  name: string;
  specialty?: string | null;
};

export type AdminDiagnosticPatient = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

export type AdminDiagnosticRow = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  patient: AdminDiagnosticPatient;
  examName: string;
  type: DiagnosticOrderType;
  acceptance: DiagnosticAcceptance;
  status: DiagnosticOrderStatus;
  doctor: AdminDoctor;
  orderId: string;
  encounterId: string | null;
};

export type AdminDiagnosticFiltersState = {
  query: string;
  type: "all" | DiagnosticOrderType;
  acceptance: "all" | DiagnosticAcceptance;
  status: "all" | DiagnosticOrderStatus;
};

