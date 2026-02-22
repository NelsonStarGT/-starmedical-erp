import { medicosMock } from "@/lib/mock/medicos";
import type { AdminDoctor, AdminPatientRow, AdminPatientStatus, ClientKind } from "./types";

const PATIENTS: Array<{ id: string; firstName: string; lastName: string; phone: string | null; kind: ClientKind }> = [
  { id: "p1", firstName: "Ana", lastName: "Torres", phone: "502 5556 0001", kind: "particular" },
  { id: "p2", firstName: "Carlos", lastName: "Pérez", phone: "502 5556 0002", kind: "empresa" },
  { id: "p3", firstName: "Lucía", lastName: "Gómez", phone: "502 5556 0003", kind: "institucion" },
  { id: "p4", firstName: "Eduardo", lastName: "Ruiz", phone: "502 5556 0004", kind: "particular" },
  { id: "p5", firstName: "María", lastName: "López", phone: "502 5556 0005", kind: "empresa" },
  { id: "p6", firstName: "Jorge", lastName: "Castillo", phone: "502 5556 0006", kind: "particular" }
];

const REASONS = [
  "Dolor abdominal, náuseas",
  "Control crónico (HTA/DM2)",
  "Síntomas respiratorios (tos y fiebre)",
  "Chequeo preventivo",
  "Dolor lumbar",
  "Ansiedad/insomnio"
];

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function addMinutes(hhmm: string, minutes: number) {
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  const base = new Date(2000, 0, 1, hh, mm, 0, 0);
  const next = new Date(base.getTime() + minutes * 60000);
  return `${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
}

export function buildAdminPatientsMockData(params: { date: string; myDoctorId: string; myDoctorName: string }) {
  const knownDoctors: AdminDoctor[] = medicosMock.map((m) => ({
    id: m.id,
    name: m.nombre,
    specialty: m.especialidad || null
  }));

  const hasMe = knownDoctors.some((d) => d.id === params.myDoctorId);
  const doctors: AdminDoctor[] = hasMe
    ? knownDoctors
    : [{ id: params.myDoctorId, name: params.myDoctorName, specialty: null }, ...knownDoctors];

  const statuses: AdminPatientStatus[] = [
    "waiting",
    "triage",
    "ready",
    "in_consult",
    "done",
    "waiting",
    "ready",
    "triage",
    "rescheduled",
    "no_show"
  ];

  const baseTime = "08:30";

  const rows: AdminPatientRow[] = Array.from({ length: 14 }).map((_, i) => {
    const patient = PATIENTS[i % PATIENTS.length]!;
    const status = statuses[i % statuses.length]!;
    const doctor = doctors[i % doctors.length]!;

    const appointmentId = `appt-${params.date}-${i + 1}`;
    const encounterId = status === "done" || status === "in_consult" ? `enc-${params.date}-${i + 1}` : i % 4 === 0 ? null : `enc-${params.date}-${i + 1}`;

    return {
      id: `admin-patient-${params.date}-${i + 1}`,
      date: params.date,
      time: addMinutes(baseTime, i * 20),
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone
      },
      receptionReason: REASONS[i % REASONS.length] ?? null,
      clientKind: patient.kind,
      status,
      doctor,
      appointmentId,
      encounterId
    };
  });

  return { rows, doctors };
}

