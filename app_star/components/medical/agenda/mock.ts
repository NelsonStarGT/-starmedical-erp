import type { AgendaRow, QuickHistory, AgendaDoctor, AgendaPriority, AgendaStatus, TriageStatus } from "./types";
import { medicosMock } from "@/lib/mock/medicos";

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function addMinutes(hhmm: string, minutes: number) {
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  const base = new Date(2000, 0, 1, hh, mm, 0, 0);
  const next = new Date(base.getTime() + minutes * 60000);
  return `${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
}

const SPECIALTIES = [
  "Medicina General",
  "Control crónico",
  "Ocupacional",
  "Pediatría",
  "Ginecología"
] as const;

const PATIENTS = [
  { id: "p1", name: "Ana Torres", age: 34, sex: "F" as const, phone: "502 5556 0001" },
  { id: "p2", name: "Carlos Pérez", age: 38, sex: "M" as const, phone: "502 5556 0002" },
  { id: "p3", name: "Lucía Gómez", age: 29, sex: "F" as const, phone: "502 5556 0003" },
  { id: "p4", name: "Eduardo Ruiz", age: 46, sex: "M" as const, phone: "502 5556 0004" },
  { id: "p5", name: "María López", age: 52, sex: "F" as const, phone: "502 5556 0005" },
  { id: "p6", name: "Jorge Castillo", age: 41, sex: "M" as const, phone: "502 5556 0006" }
];

export function buildAgendaMockData(params: {
  date: string;
  myDoctorId: string;
  myDoctorName: string;
}) {
  const knownDoctors: AgendaDoctor[] = medicosMock.map((m) => ({
    id: m.id,
    name: m.nombre
  }));

  const hasMe = knownDoctors.some((d) => d.id === params.myDoctorId);
  const doctors: AgendaDoctor[] = hasMe
    ? knownDoctors
    : [{ id: params.myDoctorId, name: params.myDoctorName }, ...knownDoctors];

  const doctorForRow = (idx: number) => doctors[idx % doctors.length];
  const specialtyForRow = (idx: number) => SPECIALTIES[idx % SPECIALTIES.length];

  const statuses: AgendaStatus[] = ["waiting", "triage", "ready", "in_consult", "done", "waiting", "ready", "triage"];
  const priorities: AgendaPriority[] = ["Media", "Alta", "Media", "Baja", "Media", "Alta", "Baja", "Media"];
  const triage: TriageStatus[] = ["pending", "in_progress", "ready", "ready", "not_required", "pending", "ready", "in_progress"];

  const baseTime = "08:30";

  const rows: AgendaRow[] = Array.from({ length: 12 }).map((_, i) => {
    const time = addMinutes(baseTime, i * 20);
    const patient = PATIENTS[i % PATIENTS.length];
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const triageStatus = triage[i % triage.length];
    const doctor = doctorForRow(i);

    const encounterOpen = status === "in_consult";
    const principalDxSelected = status === "in_consult" ? i % 2 === 0 : i % 5 === 0;
    const resultsReady = i % 3 === 0;
    const diagnosticPending = status !== "done" && !principalDxSelected;

    return {
      id: `ag-${params.date}-${i + 1}`,
      date: params.date,
      time,
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        phone: patient.phone
      },
      specialty: specialtyForRow(i),
      status,
      triageStatus,
      waitMin: Math.max(0, 6 + i * 2 - (status === "done" ? 10 : 0)),
      priority,
      checkedIn: status !== "waiting" ? true : i % 4 !== 0,
      diagnostic: {
        pending: diagnosticPending,
        resultsReady,
        principalDxSelected
      },
      encounter: {
        open: encounterOpen,
        id: encounterOpen ? `enc-${params.date}-${i + 1}` : null
      },
      doctor,
      canReschedule: status !== "done" && status !== "canceled" && status !== "no_show"
    };
  });

  const quickHistoryByPatientId: Record<string, QuickHistory> = {
    p1: {
      allergies: ["Penicilina"],
      lastDx: ["I10 · Hipertensión esencial", "R51 · Cefalea", "E11.9 · DM2 sin complicaciones"],
      lastResults: [
        {
          id: "r-p1-1",
          date: `${params.date}`,
          title: "Hemograma",
          summary: "Leucocitosis leve; Hb normal; plaquetas normales."
        },
        {
          id: "r-p1-2",
          date: `${params.date}`,
          title: "Glicemia",
          summary: "Levemente elevada; considerar control crónico."
        }
      ],
      notes: ["Control de HTA irregular (adherencia variable).", "Refiere cefalea tensional intermitente."]
    },
    p2: {
      allergies: [],
      lastDx: ["K21.9 · Reflujo gastroesofágico", "M54.5 · Lumbalgia", "J06.9 · IVRS aguda"],
      lastResults: [
        {
          id: "r-p2-1",
          date: `${params.date}`,
          title: "Perfil lipídico",
          summary: "Triglicéridos elevados; LDL borderline."
        }
      ],
      notes: ["Evitar AINEs si gastritis activa.", "Se sugiere higiene postural por lumbalgia."]
    },
    p3: {
      allergies: ["AINEs (rash)"],
      lastDx: ["F41.1 · Ansiedad generalizada", "R07.9 · Dolor torácico no especificado", "R51 · Cefalea"],
      lastResults: [],
      notes: ["Riesgo bajo; descartar banderas rojas en dolor torácico.", "AINEs causan rash: usar alternativas."]
    },
    p4: {
      allergies: ["Lactosa (intolerancia)"],
      lastDx: ["I10 · Hipertensión esencial", "E78.5 · Hiperlipidemia", "M54.5 · Lumbalgia"],
      lastResults: [
        {
          id: "r-p4-1",
          date: `${params.date}`,
          title: "RX Columna lumbar",
          summary: "Cambios degenerativos leves; sin hallazgos agudos."
        }
      ],
      notes: ["Control de lípidos pendiente.", "Intolerancia a lactosa (dieta)."]
    },
    p5: {
      allergies: ["Mariscos"],
      lastDx: ["N39.0 · IVU", "R10.9 · Dolor abdominal", "K21.9 · ERGE"],
      lastResults: [
        {
          id: "r-p5-1",
          date: `${params.date}`,
          title: "EGO",
          summary: "Leucocituria; nitritos (+); sugerente de IVU."
        }
      ],
      notes: ["Alergia a mariscos (verificar contraste si aplica)."]
    },
    p6: {
      allergies: [],
      lastDx: ["J45.909 · Asma no complicada", "J06.9 · IVRS aguda", "R05 · Tos"],
      lastResults: [],
      notes: ["Plan de acción asma: revisar uso de inhalador.", "Tos persistente: vigilar signos de alarma."]
    }
  };

  return { rows, doctors, quickHistoryByPatientId };
}
