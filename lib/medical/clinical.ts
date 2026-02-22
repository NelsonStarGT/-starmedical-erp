import type {
  ClinicalTemplateDefinition,
  ClinicalTemplateField,
  EncounterHistoryDraft,
  EncounterHistoryFieldDraft,
  EncounterHistorySectionDraft,
  EncounterRichTextValue,
  VitalTemplateDefinition,
  VitalTemplateField,
  VitalTemplateKey
} from "@/components/medical/encounter/types";

export const DEFAULT_CLINICAL_TEMPLATE_ID = "tpl-historia-clinica-basica";
export const DEFAULT_VITAL_TEMPLATE_ID = "tpl-signos-vitales-basica";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }]
};

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDocWithText(text: string) {
  const clean = text.trim();
  if (!clean) return EMPTY_DOC;
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: clean }] }]
  };
}

export function createRichTextValue(seedText = ""): EncounterRichTextValue {
  const clean = seedText.trim();
  return {
    json: buildDocWithText(seedText),
    html: clean ? `<p>${escapeHtml(clean)}</p>` : "<p></p>",
    text: clean
  };
}

const DEFAULT_VITAL_FIELDS: VitalTemplateField[] = [
  { key: "bloodPressure", label: "TA", unit: "mmHg", required: true, visible: true, source: "triage", order: 10 },
  { key: "heartRate", label: "FC", unit: "lpm", required: true, visible: true, source: "triage", order: 20, min: 20, max: 260 },
  { key: "respRate", label: "FR", unit: "rpm", required: true, visible: true, source: "triage", order: 30, min: 6, max: 80 },
  { key: "temperatureC", label: "Temperatura", unit: "°C", required: true, visible: true, source: "triage", order: 40, min: 30, max: 45 },
  { key: "spo2", label: "SpO2", unit: "%", required: true, visible: true, source: "triage", order: 50, min: 40, max: 100 },
  { key: "weightKg", label: "Peso", unit: "kg", required: true, visible: true, source: "triage", order: 60, min: 1, max: 500 },
  { key: "heightCm", label: "Talla", unit: "cm", required: true, visible: true, source: "triage", order: 70, min: 30, max: 260 },
  {
    key: "glucometryMgDl",
    label: "Glucometría",
    unit: "mg/dL",
    required: false,
    visible: true,
    source: "triage",
    order: 80,
    min: 10,
    max: 800
  },
  {
    key: "abdominalCircumferenceCm",
    label: "Circunferencia abdominal",
    unit: "cm",
    required: false,
    visible: true,
    source: "triage",
    order: 90,
    min: 20,
    max: 300
  },
  { key: "bodyMassIndex", label: "IMC", unit: "kg/m²", required: false, visible: true, source: "triage", order: 100, min: 5, max: 80 }
];

function normalizeVitalField(field: VitalTemplateField): VitalTemplateField {
  return {
    ...field,
    label: field.label.trim() || field.key,
    unit: field.unit.trim(),
    required: field.key === "bodyMassIndex" ? false : field.required,
    source: field.source === "manual" || field.source === "triage" ? field.source : "triage",
    order: Number.isFinite(field.order) ? field.order : 9999,
    min: typeof field.min === "number" ? field.min : undefined,
    max: typeof field.max === "number" ? field.max : undefined
  };
}

export function createDefaultVitalTemplate(nowIso = new Date().toISOString()): VitalTemplateDefinition {
  return {
    id: DEFAULT_VITAL_TEMPLATE_ID,
    title: "Signos vitales básicos",
    isDefault: true,
    updatedAt: nowIso,
    fields: DEFAULT_VITAL_FIELDS.map((field) => ({ ...field }))
  };
}

export function defaultVitalTemplates(nowIso = new Date().toISOString()): VitalTemplateDefinition[] {
  return [createDefaultVitalTemplate(nowIso)];
}

export function normalizeVitalTemplatePayload(template: VitalTemplateDefinition): VitalTemplateDefinition {
  const keys = new Set<VitalTemplateKey>();
  const normalized = template.fields
    .map((field) => normalizeVitalField(field))
    .filter((field) => {
      if (keys.has(field.key)) return false;
      keys.add(field.key);
      return true;
    })
    .sort((a, b) => a.order - b.order);

  return {
    ...template,
    title: template.title.trim(),
    fields: normalized
  };
}

export function createDefaultClinicalTemplate(nowIso = new Date().toISOString()): ClinicalTemplateDefinition {
  return {
    id: DEFAULT_CLINICAL_TEMPLATE_ID,
    title: "Historia Clínica Básica",
    type: "Básica",
    isDefault: true,
    updatedAt: nowIso,
    sections: [
      {
        id: "sec-motivo",
        title: "Motivo de consulta",
        description: "Síntoma principal y tiempo de evolución.",
        fields: [
          {
            id: "fld-motivo-consulta",
            key: "motivo_consulta",
            label: "Motivo de consulta",
            kind: "rich_text",
            required: true,
            visible: true,
            defaultValue: ""
          }
        ]
      },
      {
        id: "sec-hea",
        title: "HEA",
        description: "Historia de la enfermedad actual.",
        fields: [
          {
            id: "fld-hea",
            key: "hea",
            label: "Historia de la enfermedad actual",
            kind: "rich_text",
            required: true,
            visible: true,
            defaultValue: ""
          }
        ]
      },
      {
        id: "sec-antecedentes",
        title: "Antecedentes",
        description: "Personales, familiares y relevantes.",
        fields: [
          {
            id: "fld-antecedentes",
            key: "antecedentes",
            label: "Antecedentes",
            kind: "rich_text",
            required: false,
            visible: true,
            defaultValue: "—"
          }
        ]
      },
      {
        id: "sec-examen",
        title: "Examen físico",
        description: "Hallazgos del examen físico.",
        fields: [
          {
            id: "fld-examen-fisico",
            key: "examen_fisico",
            label: "Examen físico",
            kind: "rich_text",
            required: true,
            visible: true,
            defaultValue: ""
          }
        ]
      },
      {
        id: "sec-social",
        title: "Perfil social",
        description: "Contexto social y ocupacional.",
        fields: [
          {
            id: "fld-perfil-social",
            key: "perfil_social",
            label: "Perfil social",
            kind: "textarea",
            required: false,
            visible: true,
            defaultValue: "—"
          }
        ]
      }
    ]
  };
}

function fieldSeedText(field: ClinicalTemplateField, seed?: Partial<EncounterHistoryDraft>) {
  const fallback = field.defaultValue || "";
  if (!seed) return fallback;
  switch (field.key) {
    case "motivo_consulta":
      return seed.consultationReason || fallback;
    case "antecedentes":
      return seed.antecedentes || fallback;
    case "examen_fisico":
      return seed.physicalExam || fallback;
    default:
      return fallback;
  }
}

function createFieldDraft(field: ClinicalTemplateField, seedText: string): EncounterHistoryFieldDraft {
  if (field.kind === "number") {
    const numeric = Number(seedText);
    return {
      fieldId: field.id,
      key: field.key,
      label: field.label,
      kind: field.kind,
      required: field.required,
      visible: field.visible,
      defaultValue: field.defaultValue || "",
      textValue: "",
      numberValue: Number.isFinite(numeric) ? numeric : null,
      richValue: createRichTextValue("")
    };
  }

  if (field.kind === "rich_text") {
    return {
      fieldId: field.id,
      key: field.key,
      label: field.label,
      kind: field.kind,
      required: field.required,
      visible: field.visible,
      defaultValue: field.defaultValue || "",
      textValue: "",
      numberValue: null,
      richValue: createRichTextValue(seedText)
    };
  }

  return {
    fieldId: field.id,
    key: field.key,
    label: field.label,
    kind: field.kind,
    required: field.required,
    visible: field.visible,
    defaultValue: field.defaultValue || "",
    textValue: seedText,
    numberValue: null,
    richValue: createRichTextValue("")
  };
}

export function buildHistorySectionsFromTemplate(
  template: ClinicalTemplateDefinition,
  seed?: Partial<EncounterHistoryDraft>
): EncounterHistorySectionDraft[] {
  return template.sections.map((section) => ({
    sectionId: section.id,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field) => createFieldDraft(field, fieldSeedText(field, seed)))
  }));
}

export function mergeHistorySectionsWithTemplate(
  template: ClinicalTemplateDefinition,
  existingSections: EncounterHistorySectionDraft[]
): EncounterHistorySectionDraft[] {
  const existingByKey = new Map<string, EncounterHistoryFieldDraft>();

  for (const section of existingSections) {
    for (const field of section.fields) {
      existingByKey.set(field.key, field);
    }
  }

  return template.sections.map((section) => ({
    sectionId: section.id,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field) => {
      const current = existingByKey.get(field.key);
      if (!current) return createFieldDraft(field, field.defaultValue || "");

      return {
        ...current,
        fieldId: field.id,
        key: field.key,
        label: field.label,
        kind: field.kind,
        required: field.required,
        visible: field.visible,
        defaultValue: field.defaultValue || ""
      };
    })
  }));
}

export function deriveLegacyHistoryFields(sections: EncounterHistorySectionDraft[]) {
  const map = new Map<string, EncounterHistoryFieldDraft>();
  for (const section of sections) {
    for (const field of section.fields) {
      map.set(field.key, field);
    }
  }

  const pull = (key: string) => {
    const field = map.get(key);
    if (!field) return "";
    if (field.kind === "rich_text") return field.richValue.text || "";
    if (field.kind === "number") return field.numberValue === null ? "" : String(field.numberValue);
    return field.textValue || "";
  };

  return {
    consultationReason: pull("motivo_consulta"),
    antecedentes: pull("antecedentes"),
    physicalExam: pull("examen_fisico")
  };
}

export function calculateBodyMassIndex(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg || !heightCm) return null;
  const heightMeters = heightCm / 100;
  if (!Number.isFinite(heightMeters) || heightMeters <= 0) return null;
  const bmi = weightKg / (heightMeters * heightMeters);
  if (!Number.isFinite(bmi)) return null;
  return Number(bmi.toFixed(1));
}

export function defaultClinicalTemplates(nowIso = new Date().toISOString()): ClinicalTemplateDefinition[] {
  return [createDefaultClinicalTemplate(nowIso)];
}

export function normalizeTemplatePayload(template: ClinicalTemplateDefinition): ClinicalTemplateDefinition {
  return {
    ...template,
    title: template.title.trim(),
    type: template.type.trim(),
    sections: template.sections.map((section) => ({
      ...section,
      title: section.title.trim(),
      description: section.description?.trim() || null,
      fields: section.fields.map((field) => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        defaultValue: field.defaultValue || ""
      }))
    }))
  };
}
