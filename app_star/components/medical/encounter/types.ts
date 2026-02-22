export type EncounterStatus = "draft" | "open" | "closed";

export type PatientSex = "M" | "F" | "Otro";
export type CoverageType = "particular" | "empresa" | "institucion" | "aseguradora";

export type RichTextJSON = {
  type?: string;
  content?: unknown[];
  [key: string]: unknown;
};

export type EncounterRichTextValue = {
  json: RichTextJSON;
  html: string;
  text: string;
};

export type ClinicalTemplateFieldKind = "rich_text" | "textarea" | "text" | "number";

export type VitalTemplateKey =
  | "bloodPressure"
  | "heartRate"
  | "respRate"
  | "temperatureC"
  | "spo2"
  | "weightKg"
  | "heightCm"
  | "glucometryMgDl"
  | "abdominalCircumferenceCm"
  | "bodyMassIndex";

export type VitalTemplateField = {
  key: VitalTemplateKey;
  label: string;
  unit: string;
  required: boolean;
  visible: boolean;
  source: "triage" | "manual";
  order: number;
  min?: number;
  max?: number;
};

export type VitalTemplateDefinition = {
  id: string;
  title: string;
  isDefault: boolean;
  fields: VitalTemplateField[];
  updatedAt: string;
};

export type ClinicalTemplateField = {
  id: string;
  key: string;
  label: string;
  kind: ClinicalTemplateFieldKind;
  required: boolean;
  visible: boolean;
  defaultValue: string;
};

export type ClinicalTemplateSection = {
  id: string;
  title: string;
  description: string | null;
  fields: ClinicalTemplateField[];
};

export type ClinicalTemplateDefinition = {
  id: string;
  title: string;
  type: string;
  isDefault: boolean;
  sections: ClinicalTemplateSection[];
  updatedAt: string;
};

export type EncounterVitals = {
  bloodPressure?: string | null;
  heartRate?: number | null;
  respRate?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  glucometryMgDl?: number | null;
  abdominalCircumferenceCm?: number | null;
  bodyMassIndex?: number | null;
  capturedAt?: string | null;
  capturedBy?: string | null;
  circumferenceCm?: number | null; // LEGACY: no usar en UI
};

export type EncounterRecentHistory = {
  id: string;
  date: string;
  summary: string;
  principalDxCode: string | null;
  encounterId: string;
};

export type EncounterClinicalHistory = {
  basic: {
    allergies: string;
    chronicConditions: string;
    surgeries: string;
    habits: string;
  };
  employment: {
    occupation: string;
    employer: string;
    exposures: string;
    notes: string;
  };
};

export type EncounterHistoryType = "basic" | "complete" | "employment";

export type EncounterHistoryFieldDraft = {
  fieldId: string;
  key: string;
  label: string;
  kind: ClinicalTemplateFieldKind;
  required: boolean;
  visible: boolean;
  defaultValue: string;
  textValue: string;
  numberValue: number | null;
  richValue: EncounterRichTextValue;
};

export type EncounterHistorySectionDraft = {
  sectionId: string;
  title: string;
  description: string | null;
  fields: EncounterHistoryFieldDraft[];
};

// SOLO historia clínica (sin reconsultas ni entidades de evolución)
export type EncounterHistoryDraft = {
  type: EncounterHistoryType;
  templateId: string | null;
  templateTitle: string;
  templateTypeLabel: string;
  sections: EncounterHistorySectionDraft[];
  consultationReason: string;
  antecedentes: string;
  physicalExam: string;
};

export type EncounterPatient = {
  id: string;
  recordNumber: string;
  name: string;
  age: number;
  sex: PatientSex;
  dob: string;
  photoUrl: string | null;
  coverageType: CoverageType;
  coverageEntity: string | null;
  phone: string | null;
  insurer: string | null;
  alerts: string[];
};

export type ReceptionContext = {
  reason: string;
  capturedAt: string;
  capturedBy: string;
};

export type SoapNoteValue = {
  subjective: string;
  objective: string;
  assessment: string;
};

export type EncounterPlanValue = {
  treatmentPlan: string;
  medications: string;
  instructions: string;
};

export type EncounterDiagnosis = {
  principalCode: string | null;
  secondaryCodes: string[];
};

export type EncounterOrderType = "LAB" | "RX" | "USG";
export type EncounterOrderStatus = "requested" | "in_progress" | "results_ready" | "cancelled";

export type EncounterOrder = {
  id: string;
  type: EncounterOrderType;
  title: string;
  status: EncounterOrderStatus;
  createdAt: string;
  technicalComment: string | null;
  resultPreview: string | null;
};

export type EncounterOrderRequestModality = "LAB" | "RX" | "USG";
export type EncounterOrderRequestPriority = "routine" | "urgent";
export type EncounterOrderRequestStatus = "ordered" | "in_progress" | "completed" | "cancelled";

export type EncounterOrderRequestItem = {
  id: string;
  encounterId: string;
  modality: EncounterOrderRequestModality;
  assignedToService: EncounterOrderRequestModality | null;
  serviceId: string | null;
  serviceCode: string | null;
  title: string;
  quantity: number;
  notes: string | null;
  priority: EncounterOrderRequestPriority;
  status: EncounterOrderRequestStatus;
  createdAt: string;
  createdByName: string;
  updatedAt: string;
  updatedByName: string | null;
};

export type EncounterOrderGlobalNotes = {
  LAB: string;
  RX: string;
  USG: string;
};

export type EncounterFollowUp = {
  id: string;
  createdAt: string;
  authorName: string;
  note: string;
};

export type EncounterPrescriptionItemSource = "inventory" | "free";

export type EncounterPrescriptionItem = {
  id: string;
  source: EncounterPrescriptionItemSource;
  productId: string | null;
  name: string;
  quantity: number;
  instructions: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string | null;
};

export type EncounterSupplyItem = {
  id: string;
  encounterId: string;
  source: "inventory" | "manual";
  inventoryItemId: string | null;
  sku: string | null;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
  createdAt: string;
  createdByName: string;
};

export type EncounterResultType = "LAB" | "RX" | "USG";
export type EncounterResultStatus = "ready" | "in_progress" | "pending";

export type EncounterResultValueRow = {
  parameter: string;
  value: string;
  range: string | null;
  flag: string | null;
};

export type EncounterResult = {
  id: string;
  title: string;
  type: EncounterResultType;
  performedAt: string;
  status: EncounterResultStatus;
  pdfUrl: string | null;
  imageUrls: string[];
  values: EncounterResultValueRow[];
  sourceOrderRequestId?: string | null;
};

// Entidad separada de historia clínica para flujo append-only de evolución/reconsulta
export type EncounterReconsulta = {
  id: string;
  parentEncounterId: string;
  type: "reconsulta_resultados" | "manual_evolution";
  sourceResultId: string | null;
  sourceResultTitle: string | null;
  createdAt: string;
  authorName: string;
  interpretation: string;
  conduct: string;
  therapeuticAdjustment: string;
  noteRich: EncounterRichTextValue;
  entryTitle: string;
};

export type EncounterSnapshot = {
  encounterId: string;
  signedAt: string;
  signedByName: string;
  status: EncounterStatus;
  patient: EncounterPatient;
  vitals: EncounterVitals;
  history: EncounterHistoryDraft;
  diagnosis: EncounterDiagnosis;
  prescription: EncounterPrescriptionItem[];
  reconsultations: EncounterReconsulta[];
  template: ClinicalTemplateDefinition | null;
  clinicalEvents: string[];
};

export type EncounterDocument = {
  id: string;
  kind: "snapshot" | "pdf";
  title: string;
  createdAt: string;
  storageRef: string | null;
  snapshotVersion: number | null;
};

export type EncounterState = {
  id: string;
  status: EncounterStatus;
  patient: EncounterPatient;
  reception: ReceptionContext;
  vitals: EncounterVitals;
  recentHistories: EncounterRecentHistory[];
  clinicalHistory: EncounterClinicalHistory;
  historyDraft: EncounterHistoryDraft;
  soap: SoapNoteValue;
  diagnosis: EncounterDiagnosis;
  plan: EncounterPlanValue;
  prescription: EncounterPrescriptionItem[];
  suppliesUsed: EncounterSupplyItem[];
  orders: EncounterOrder[];
  orderRequests: EncounterOrderRequestItem[];
  orderGlobalNotes: EncounterOrderGlobalNotes;
  results: EncounterResult[];
  followUps: EncounterFollowUp[];
  reconsultations: EncounterReconsulta[];
  documents: EncounterDocument[];
  signedSnapshotDocId: string | null;
  clinicalEvents: string[];
  closedAt: string | null;
  closedByName: string | null;
};

export type EncounterActionResult = { ok: true } | { ok: false; error: string };
