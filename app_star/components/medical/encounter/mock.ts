import type {
  EncounterOrder,
  EncounterOrderRequestItem,
  EncounterReconsulta,
  EncounterResult,
  EncounterState,
  EncounterSupplyItem
} from "./types";
import {
  buildHistorySectionsFromTemplate,
  calculateBodyMassIndex,
  createDefaultClinicalTemplate,
  createRichTextValue,
  deriveLegacyHistoryFields
} from "@/lib/medical/clinical";

const MOCK_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiBdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMzAwIDE0NF0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSID4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgMTAwIFRkCihSZXN1bHRhZG8gZGVtbykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjQ2IDAwMDAwIG4gCjAwMDAwMDAzNDAgMDAwMDAgbiAKdHJhaWxlcgo8PCAvUm9vdCAxIDAgUiAvU2l6ZSA2ID4+CnN0YXJ0eHJlZgo0MzUKJSVFT0Y=";

function nowIso() {
  return new Date().toISOString();
}

function isoMinusMinutes(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function statusFromEncounterId(encounterId: string) {
  const id = encounterId.toLowerCase();
  if (id.includes("closed")) return "closed" as const;
  if (id.includes("draft")) return "draft" as const;
  return "open" as const;
}

function buildOrders(encounterId: string): EncounterOrder[] {
  return [
    {
      id: `ord-${encounterId}-1`,
      type: "LAB",
      title: "Hemograma completo",
      status: "requested",
      createdAt: nowIso(),
      technicalComment: "Ayuno no requerido. Toma en laboratorio.",
      resultPreview: null
    },
    {
      id: `ord-${encounterId}-2`,
      type: "RX",
      title: "Radiografía de tórax",
      status: "results_ready",
      createdAt: nowIso(),
      technicalComment: "Proyecciones PA y lateral.",
      resultPreview: "Sin hallazgos agudos. Silueta cardiaca normal (mock)."
    }
  ];
}

function buildOrderRequests(encounterId: string, clinicianName: string): EncounterOrderRequestItem[] {
  return [
    {
      id: `ordreq-${encounterId}-lab-1`,
      encounterId,
      modality: "LAB",
      assignedToService: "LAB",
      serviceId: "svc-lab-hemograma",
      serviceCode: "LAB-HMG",
      title: "Hemograma completo",
      quantity: 1,
      notes: null,
      priority: "routine",
      status: "ordered",
      createdAt: isoMinusMinutes(26),
      createdByName: clinicianName,
      updatedAt: isoMinusMinutes(26),
      updatedByName: clinicianName
    },
    {
      id: `ordreq-${encounterId}-rx-1`,
      encounterId,
      modality: "RX",
      assignedToService: "RX",
      serviceId: "svc-rx-torax-aplat",
      serviceCode: "RX-TOR-APLAT",
      title: "Rayos X de tórax (AP/Lat)",
      quantity: 1,
      notes: null,
      priority: "routine",
      status: "ordered",
      createdAt: isoMinusMinutes(22),
      createdByName: clinicianName,
      updatedAt: isoMinusMinutes(22),
      updatedByName: clinicianName
    }
  ];
}

function mockImageDataUrl(title: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4aa59c"/><stop offset="100%" stop-color="#4aadf5"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="40" y="40" width="1120" height="720" rx="24" fill="#ffffff" fill-opacity="0.88"/><text x="80" y="170" font-size="44" font-family="Arial, sans-serif" fill="#1e293b">${title}</text><text x="80" y="240" font-size="28" font-family="Arial, sans-serif" fill="#334155">${subtitle}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildResults(encounterId: string): EncounterResult[] {
  return [
    {
      id: `res-${encounterId}-lab-1`,
      title: "Hemograma completo",
      type: "LAB",
      performedAt: isoMinusMinutes(85),
      status: "ready",
      pdfUrl: null,
      imageUrls: [],
      values: [
        { parameter: "Hb", value: "13.8 g/dL", range: "12.0 - 16.0", flag: null },
        { parameter: "Leucocitos", value: "11.2 x10^3/uL", range: "4.0 - 10.5", flag: "HIGH" },
        { parameter: "Plaquetas", value: "245 x10^3/uL", range: "150 - 450", flag: null }
      ]
    },
    {
      id: `res-${encounterId}-rx-1`,
      title: "Rayos X de tórax",
      type: "RX",
      performedAt: isoMinusMinutes(140),
      status: "ready",
      pdfUrl: MOCK_PDF_DATA_URL,
      imageUrls: [mockImageDataUrl("Rayos X de tórax", "Proyección PA")],
      values: []
    },
    {
      id: `res-${encounterId}-usg-1`,
      title: "Ultrasonido abdominal",
      type: "USG",
      performedAt: isoMinusMinutes(35),
      status: "in_progress",
      pdfUrl: null,
      imageUrls: [mockImageDataUrl("Ultrasonido abdominal", "Resultado en proceso")],
      values: []
    }
  ];
}

function buildInitialReconsultations(encounterId: string, clinicianName: string): EncounterReconsulta[] {
  if (!encounterId.toLowerCase().includes("closed")) return [];
  const note = createRichTextValue(
    "Estudio sin hallazgos de consolidación ni derrame pleural. Continuar vigilancia clínica y manejo sintomático."
  );
  return [
    {
      id: `recon-${encounterId}-1`,
      parentEncounterId: encounterId,
      type: "reconsulta_resultados",
      sourceResultId: `res-${encounterId}-rx-1`,
      sourceResultTitle: "Rayos X de tórax",
      createdAt: isoMinusMinutes(20),
      authorName: clinicianName,
      interpretation: "Estudio sin hallazgos de consolidación ni derrame pleural.",
      conduct: "Continuar vigilancia clínica y manejo sintomático.",
      therapeuticAdjustment: "Sin ajuste farmacológico por imagen.",
      noteRich: note,
      entryTitle: "Interpretación por resultado: Rayos X de tórax"
    }
  ];
}

function buildMockSupplies(encounterId: string, clinicianName: string): EncounterSupplyItem[] {
  return [
    {
      id: `sup-${encounterId}-1`,
      encounterId,
      source: "inventory",
      inventoryItemId: "inv-gloves-001",
      sku: "INS-GLV-PAR",
      name: "Guantes estériles",
      unit: "par",
      quantity: 1,
      unitPrice: 8.5,
      notes: "Procedimiento ambulatorio",
      createdAt: isoMinusMinutes(18),
      createdByName: clinicianName
    },
    {
      id: `sup-${encounterId}-2`,
      encounterId,
      source: "inventory",
      inventoryItemId: "inv-gauze-001",
      sku: "INS-GASA-EST",
      name: "Gasa estéril",
      unit: "unidad",
      quantity: 2,
      unitPrice: 1.75,
      notes: null,
      createdAt: isoMinusMinutes(12),
      createdByName: clinicianName
    }
  ];
}

export function buildMockEncounter(encounterId: string, options?: { clinicianName?: string | null }): EncounterState {
  const status = statusFromEncounterId(encounterId);
  const clinicianName = options?.clinicianName || "Médico responsable";
  const closed = status === "closed";
  const principal = closed ? "J06.9" : null;
  const results = buildResults(encounterId);
  const reconsultations = buildInitialReconsultations(encounterId, clinicianName);
  const suppliesUsed = buildMockSupplies(encounterId, clinicianName);
  const orderRequests = buildOrderRequests(encounterId, clinicianName);
  const defaultTemplate = createDefaultClinicalTemplate();
  const historySections = buildHistorySectionsFromTemplate(defaultTemplate, {
    consultationReason: "Cefalea y mareos desde hace 48h, con náusea leve.",
    antecedentes: "Antecedente de hipertensión controlada. Alergia documentada a penicilina.",
    physicalExam: "Paciente orientada, sin déficit neurológico focal. Signos vitales estables."
  });
  const legacyHistory = deriveLegacyHistoryFields(historySections);

  const weightKg = 67;
  const heightCm = 165;
  const abdominalCircumferenceCm = 82;

  return {
    id: encounterId,
    status,
    patient: {
      id: "p1",
      recordNumber: "HC-20341",
      name: "Ana Torres",
      age: 34,
      sex: "F",
      dob: "1990-03-12",
      photoUrl: null,
      coverageType: "aseguradora",
      coverageEntity: "Aseguradora VidaPlus",
      phone: "502 5556 0001",
      insurer: "Aseguradora VidaPlus",
      alerts: ["Alergia a penicilina", "Hipertensión controlada"]
    },
    reception: {
      reason: "Cefalea y mareos desde hace 2 días. Refiere náusea leve. Sin trauma.",
      capturedAt: nowIso(),
      capturedBy: "Recepción"
    },
    vitals: {
      bloodPressure: "118/76",
      heartRate: 80,
      respRate: 16,
      temperatureC: 36.6,
      spo2: 98,
      weightKg,
      heightCm,
      glucometryMgDl: 96,
      abdominalCircumferenceCm,
      circumferenceCm: abdominalCircumferenceCm,
      bodyMassIndex: calculateBodyMassIndex(weightKg, heightCm),
      capturedAt: nowIso(),
      capturedBy: "Enfermería (triage)"
    },
    recentHistories: [
      {
        id: `hx-${encounterId}-1`,
        date: "2026-01-12",
        principalDxCode: "I10",
        summary: "Control HTA. Ajuste de dosis. Educación y seguimiento.",
        encounterId: "enc-2026-01-12"
      },
      {
        id: `hx-${encounterId}-2`,
        date: "2025-11-03",
        principalDxCode: "J06.9",
        summary: "IVRS. Manejo sintomático. Signos de alarma.",
        encounterId: "enc-2025-11-03"
      },
      {
        id: `hx-${encounterId}-3`,
        date: "2025-09-18",
        principalDxCode: "R51",
        summary: "Cefalea tensional. Recomendaciones de higiene del sueño.",
        encounterId: "enc-2025-09-18"
      }
    ],
    clinicalHistory: {
      basic: {
        allergies: "Penicilina (rash).",
        chronicConditions: "Hipertensión (controlada).",
        surgeries: "Niega cirugías previas.",
        habits: "Café 2 tazas/día. No tabaco."
      },
      employment: {
        occupation: "Administración",
        employer: "Empresa privada",
        exposures: "Pantallas prolongadas, estrés laboral.",
        notes: "Sin exposición a químicos conocidos."
      }
    },
    historyDraft: {
      type: "basic",
      templateId: defaultTemplate.id,
      templateTitle: defaultTemplate.title,
      templateTypeLabel: defaultTemplate.type,
      sections: historySections,
      consultationReason: legacyHistory.consultationReason,
      antecedentes: legacyHistory.antecedentes,
      physicalExam: legacyHistory.physicalExam
    },
    soap: {
      subjective: "Dolor de cabeza y mareos desde hace 48h. Niega fiebre. Sueño irregular.",
      objective: "TA 118/76 · FC 80 · Temp 36.6 · SpO2 98%. Paciente en buen estado general.",
      assessment: "Cefalea probable tensional vs IVRS. Sin signos de alarma."
    },
    diagnosis: {
      principalCode: principal,
      secondaryCodes: closed ? ["R51"] : []
    },
    plan: {
      treatmentPlan: "Hidratación + reposo. Analgesia según tolerancia. Educación de signos de alarma.",
      medications: "Paracetamol 500 mg cada 8h por 3 días (si no hay contraindicaciones).",
      instructions: "Volver si fiebre, rigidez de nuca, déficit neurológico, vómitos persistentes."
    },
    prescription: closed
      ? [
          {
            id: `rx-${encounterId}-1`,
            source: "inventory",
            productId: "p1",
            name: "Paracetamol 500mg",
            quantity: 12,
            instructions: "1 tableta cada 8h por 3 días",
            dose: "500 mg",
            frequency: "Cada 8 horas",
            duration: "3 días",
            notes: null
          }
        ]
      : [],
    suppliesUsed,
    orders: buildOrders(encounterId),
    orderRequests,
    orderGlobalNotes: {
      LAB: "",
      RX: "",
      USG: ""
    },
    results,
    followUps: reconsultations.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      authorName: entry.authorName,
      note: `${entry.sourceResultTitle}: ${entry.interpretation}`
    })),
    reconsultations,
    documents: closed
      ? [
          {
            id: `doc-snapshot-${encounterId}`,
            kind: "snapshot",
            title: "Snapshot clínico firmado",
            createdAt: nowIso(),
            storageRef: null,
            snapshotVersion: 1
          }
        ]
      : [],
    signedSnapshotDocId: closed ? `doc-snapshot-${encounterId}` : null,
    clinicalEvents: closed ? ["encounter.closed", "encounter.snapshot.created"] : [],
    closedAt: closed ? nowIso() : null,
    closedByName: closed ? clinicianName : null
  };
}
