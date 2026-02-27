export type RecepcionQueueStatus =
  | "PENDIENTE"
  | "EN_ESPERA"
  | "EN_ADMISION"
  | "EN_CONSULTA"
  | "FINALIZADO";

export type RecepcionQueueItem = {
  id: string;
  code: string;
  clientName: string;
  documentRef: string;
  reason: string;
  status: RecepcionQueueStatus;
  waitMinutes: number;
  priority: "Normal" | "Alta";
};

export type RecepcionAppointmentItem = {
  id: string;
  hour: string;
  clientName: string;
  doctorName: string;
  status: "Programada" | "Confirmada" | "En sala" | "Atendida" | "Cancelada";
};

export type RecepcionAdmissionSummary = {
  id: string;
  ticket: string;
  clientName: string;
  at: string;
  insurer: string;
};

export type RecepcionRegistrationItem = {
  id: string;
  submittedAt: string;
  name: string;
  contact: string;
  source: "Link" | "QR";
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export const RECEPCION_QUEUE_STATUS_LABELS: Record<RecepcionQueueStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_ESPERA: "En espera",
  EN_ADMISION: "En admisión",
  EN_CONSULTA: "En consulta",
  FINALIZADO: "Finalizado"
};

export const RECEPCION_QUEUE_STATUS_COLOR: Record<RecepcionQueueStatus, string> = {
  PENDIENTE: "bg-slate-100 text-slate-700",
  EN_ESPERA: "bg-amber-100 text-amber-800",
  EN_ADMISION: "bg-sky-100 text-sky-800",
  EN_CONSULTA: "bg-indigo-100 text-indigo-800",
  FINALIZADO: "bg-emerald-100 text-emerald-800"
};

export const RECEPCION_DASHBOARD_KPIS = [
  { key: "pendientes", label: "Pendientes", value: 8 },
  { key: "en_espera", label: "En espera", value: 5 },
  { key: "atendidos", label: "Atendidos", value: 16 },
  { key: "cobros", label: "Cobros", value: "Q 4,320" }
] as const;

export const RECEPCION_QUEUE_MOCK: RecepcionQueueItem[] = [
  {
    id: "queue-1",
    code: "A-012",
    clientName: "Ana Lucía Molina",
    documentRef: "DPI 2490-12345-0101",
    reason: "Consulta general",
    status: "EN_ESPERA",
    waitMinutes: 18,
    priority: "Normal"
  },
  {
    id: "queue-2",
    code: "A-013",
    clientName: "Carlos Pérez",
    documentRef: "NIT 548112-9",
    reason: "Control de laboratorio",
    status: "EN_ADMISION",
    waitMinutes: 7,
    priority: "Alta"
  },
  {
    id: "queue-3",
    code: "A-014",
    clientName: "Instituto Horizonte",
    documentRef: "NIT 9081123-1",
    reason: "Chequeo ocupacional",
    status: "PENDIENTE",
    waitMinutes: 3,
    priority: "Normal"
  },
  {
    id: "queue-4",
    code: "A-015",
    clientName: "Seguros Bienestar",
    documentRef: "NIT 777100-4",
    reason: "Validación de cobertura",
    status: "EN_CONSULTA",
    waitMinutes: 24,
    priority: "Normal"
  }
];

export const RECEPCION_APPOINTMENTS_MOCK: RecepcionAppointmentItem[] = [
  {
    id: "apt-1",
    hour: "08:30",
    clientName: "María José González",
    doctorName: "Dr. Luis Méndez",
    status: "Confirmada"
  },
  {
    id: "apt-2",
    hour: "09:00",
    clientName: "Comercial Santa Clara",
    doctorName: "Dra. Elena García",
    status: "Programada"
  },
  {
    id: "apt-3",
    hour: "09:40",
    clientName: "Jorge Gómez",
    doctorName: "Dr. Luis Méndez",
    status: "En sala"
  },
  {
    id: "apt-4",
    hour: "10:15",
    clientName: "Aseguradora VidaTotal",
    doctorName: "Dra. Elena García",
    status: "Cancelada"
  }
];

export const RECEPCION_ADMISSIONS_MOCK: RecepcionAdmissionSummary[] = [
  {
    id: "adm-1",
    ticket: "ADM-2026-0201",
    clientName: "Paola Cifuentes",
    at: "08:22",
    insurer: "Particular"
  },
  {
    id: "adm-2",
    ticket: "ADM-2026-0202",
    clientName: "Edwin Cabrera",
    at: "08:49",
    insurer: "Seguros Bienestar"
  },
  {
    id: "adm-3",
    ticket: "ADM-2026-0203",
    clientName: "Inversiones La Ceiba",
    at: "09:11",
    insurer: "Convenio empresa"
  }
];

export const RECEPCION_REGISTRATIONS_MOCK: RecepcionRegistrationItem[] = [
  {
    id: "reg-1",
    submittedAt: "2026-02-27T08:14:00.000Z",
    name: "Fernanda Ortiz",
    contact: "fernanda.ortiz@mail.com",
    source: "QR",
    status: "PENDING"
  },
  {
    id: "reg-2",
    submittedAt: "2026-02-27T08:31:00.000Z",
    name: "Luis Fernando Ruiz",
    contact: "+502 5488-1120",
    source: "Link",
    status: "PENDING"
  },
  {
    id: "reg-3",
    submittedAt: "2026-02-27T07:58:00.000Z",
    name: "Mónica Herrera",
    contact: "monica@empresa.gt",
    source: "QR",
    status: "APPROVED"
  }
];

export function formatRecepcionTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-GT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}
