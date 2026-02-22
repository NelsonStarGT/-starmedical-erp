export type AdminPatientStatus =
  | "waiting"
  | "triage"
  | "ready"
  | "in_consult"
  | "done"
  | "no_show"
  | "canceled"
  | "rescheduled";

export type ClientKind = "particular" | "empresa" | "institucion";

export type AdminDoctor = {
  id: string;
  name: string;
  specialty?: string | null;
};

export type AdminPatient = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

export type AdminPatientRow = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  patient: AdminPatient;
  receptionReason: string | null;
  clientKind: ClientKind;
  status: AdminPatientStatus;
  doctor: AdminDoctor;
  appointmentId: string;
  encounterId: string | null;
};

