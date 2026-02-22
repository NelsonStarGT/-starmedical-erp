import { medicosMock } from "@/lib/mock/medicos";
import type {
  AdminDiagnosticRow,
  AdminDoctor,
  DiagnosticAcceptance,
  DiagnosticOrderStatus,
  DiagnosticOrderType
} from "./types";

const PATIENTS: Array<{ id: string; firstName: string; lastName: string; phone: string | null }> = [
  { id: "p1", firstName: "Ana", lastName: "Torres", phone: "502 5556 0001" },
  { id: "p2", firstName: "Carlos", lastName: "Pérez", phone: "502 5556 0002" },
  { id: "p3", firstName: "Lucía", lastName: "Gómez", phone: "502 5556 0003" },
  { id: "p4", firstName: "Eduardo", lastName: "Ruiz", phone: "502 5556 0004" },
  { id: "p5", firstName: "María", lastName: "López", phone: "502 5556 0005" },
  { id: "p6", firstName: "Jorge", lastName: "Castillo", phone: "502 5556 0006" }
];

const EXAMS: Array<{ name: string; type: DiagnosticOrderType }> = [
  { name: "Hemograma completo", type: "LAB" },
  { name: "Perfil lipídico", type: "LAB" },
  { name: "Glicemia en ayunas", type: "LAB" },
  { name: "RX Tórax PA", type: "RX" },
  { name: "RX Columna lumbar", type: "RX" },
  { name: "USG abdominal", type: "USG" },
  { name: "USG pélvico", type: "USG" }
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

export function buildAdminDiagnosticsMockData(params: { date: string; myDoctorId: string; myDoctorName: string }) {
  const knownDoctors: AdminDoctor[] = medicosMock.map((m) => ({
    id: m.id,
    name: m.nombre,
    specialty: m.especialidad || null
  }));

  const hasMe = knownDoctors.some((d) => d.id === params.myDoctorId);
  const doctors: AdminDoctor[] = hasMe
    ? knownDoctors
    : [{ id: params.myDoctorId, name: params.myDoctorName, specialty: null }, ...knownDoctors];

  const acceptances: DiagnosticAcceptance[] = [
    "accepted",
    "accepted",
    "accepted",
    "rejected",
    "accepted",
    "accepted",
    "rejected",
    "accepted"
  ];

  const statuses: DiagnosticOrderStatus[] = ["pending", "in_progress", "ready", "pending", "in_progress", "ready", "pending", "ready"];

  const baseTime = "08:20";

  const rows: AdminDiagnosticRow[] = Array.from({ length: 18 }).map((_, i) => {
    const patient = PATIENTS[i % PATIENTS.length]!;
    const exam = EXAMS[i % EXAMS.length]!;
    const doctor = doctors[i % doctors.length]!;
    const acceptance = acceptances[i % acceptances.length]!;
    const status = statuses[i % statuses.length]!;

    const orderId = `ord-${params.date}-${i + 1}`;
    const encounterId = status === "ready" || i % 3 === 0 ? `enc-${params.date}-${i + 1}` : null;

    return {
      id: `admin-diag-${params.date}-${i + 1}`,
      date: params.date,
      time: addMinutes(baseTime, i * 15),
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phone: patient.phone
      },
      examName: exam.name,
      type: exam.type,
      acceptance,
      status,
      doctor,
      orderId,
      encounterId
    };
  });

  return { rows, doctors };
}

