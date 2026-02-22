export type AgendaStatus =
  | "waiting"
  | "triage"
  | "ready"
  | "in_consult"
  | "done"
  | "no_show"
  | "canceled"
  | "rescheduled";

export type TriageStatus = "pending" | "in_progress" | "ready" | "not_required";

export type PatientSex = "M" | "F" | "Otro";

export type AgendaPriority = "Alta" | "Media" | "Baja";

export type AgendaDiagnosticFlags = {
  pending: boolean;
  resultsReady: boolean;
  principalDxSelected: boolean;
};

export type AgendaEncounter = {
  open: boolean;
  id: string | null;
};

export type AgendaPatient = {
  id: string;
  name: string;
  age: number;
  sex: PatientSex;
  phone: string | null;
};

export type AgendaDoctor = {
  id: string;
  name: string;
};

export type AgendaRow = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (local)
  patient: AgendaPatient;
  specialty: string;
  status: AgendaStatus;
  triageStatus: TriageStatus;
  waitMin: number;
  priority: AgendaPriority;
  checkedIn: boolean;
  diagnostic: AgendaDiagnosticFlags;
  encounter: AgendaEncounter;
  doctor: AgendaDoctor;
  canReschedule: boolean;
};

export type MedicalPersona = "DOCTOR" | "NURSE" | "COORDINATION" | "ADMIN" | "READ_ONLY";

export type AgendaFiltersState = {
  date: string;
  status: "all" | AgendaStatus;
  priority: "all" | AgendaPriority;
  triageStatus: "all" | TriageStatus;
  resultsReady: "all" | "yes" | "no";
  diagnosisPending: "all" | "yes" | "no";
  query: string;
};

export type QuickHistory = {
  allergies: string[];
  lastDx: string[];
  lastResults: Array<{
    id: string;
    date: string;
    title: string;
    summary: string;
  }>;
  notes: string[];
};
