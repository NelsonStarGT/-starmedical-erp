import { z } from "zod";

export const clinicalTemplateFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["rich_text", "textarea", "text", "number"]),
  required: z.boolean().default(false),
  visible: z.boolean().default(true),
  defaultValue: z.string().default("")
});

export const clinicalTemplateSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  fields: z.array(clinicalTemplateFieldSchema).min(1)
});

export const vitalTemplateKeySchema = z.enum([
  "bloodPressure",
  "heartRate",
  "respRate",
  "temperatureC",
  "spo2",
  "weightKg",
  "heightCm",
  "glucometryMgDl",
  "abdominalCircumferenceCm",
  "bodyMassIndex"
]);

export const vitalTemplateFieldSchema = z.object({
  key: vitalTemplateKeySchema,
  label: z.string().min(1),
  unit: z.string().default(""),
  required: z.boolean().default(false),
  visible: z.boolean().default(true),
  source: z.enum(["triage", "manual"]).default("triage"),
  order: z.number().int().nonnegative(),
  min: z.number().optional(),
  max: z.number().optional()
});

export const clinicalTemplateUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  type: z.string().min(1),
  isDefault: z.boolean().default(false),
  sections: z.array(clinicalTemplateSectionSchema).min(1)
});

export const vitalTemplateUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  isDefault: z.boolean().default(false),
  fields: z.array(vitalTemplateFieldSchema).min(1)
});

export const medicalDocumentSettingsSchema = z.object({
  logoUrl: z.string().trim().max(600).nullable().default(null),
  letterheadBackgroundUrl: z.string().trim().max(600).nullable().default(null),
  margins: z.object({
    topIn: z.number().min(0.3).max(1.5).default(0.75),
    rightIn: z.number().min(0.3).max(1.5).default(0.75),
    bottomIn: z.number().min(0.3).max(1.5).default(0.75),
    leftIn: z.number().min(0.3).max(1.5).default(0.75)
  }),
  footerText: z.string().trim().max(240).default("Documento clínico institucional StarMedical."),
  updatedAt: z.string().optional()
});

export const documentBrandingUpsertSchema = z.object({
  id: z.string().min(1).optional(),
  scope: z.enum(["clinical", "order_lab", "order_rx", "order_usg"]).default("clinical"),
  title: z.string().trim().min(1).max(120),
  isDefault: z.boolean().default(false),
  updatedAt: z.string().optional(),
  backgroundImageUrl: z.string().trim().max(1200).nullable().default(null),
  backgroundOpacity: z.number().min(0).max(1).default(0.12),
  backgroundScale: z.number().min(0.5).max(1.2).default(1),
  backgroundPosition: z.enum(["center", "top", "bottom"]).default("center"),
  logoUrl: z.string().trim().max(1200).nullable().default(null),
  logoWidthPx: z.number().int().min(60).max(320).default(140),
  logoPosition: z.enum(["top-left", "top-center", "top-right"]).default("top-right"),
  footerEnabled: z.boolean().default(true),
  footerLeftText: z.string().trim().max(240).default("Documento clínico"),
  footerRightText: z.string().trim().max(240).default("Emitido desde StarMedical ERP"),
  marginTopIn: z.number().min(0.35).max(1.5).default(0.75),
  marginRightIn: z.number().min(0.35).max(1.5).default(0.75),
  marginBottomIn: z.number().min(0.35).max(1.5).default(0.75),
  marginLeftIn: z.number().min(0.35).max(1.5).default(0.75)
});

export const icd10SourceSchema = z.enum(["WHO_OPS_PDF", "LOCAL"]);

export const icd10CreateSchema = z.object({
  code: z.string().min(3),
  title: z.string().min(1),
  chapter: z.string().nullable().optional(),
  chapterRange: z.string().nullable().optional(),
  level: z.union([z.literal(3), z.literal(4)]).optional(),
  parentCode: z.string().nullable().optional(),
  source: icd10SourceSchema.default("LOCAL"),
  isActive: z.boolean().optional()
});

export const icd10UpdateSchema = z
  .object({
    code: z.string().min(3).optional(),
    title: z.string().min(1).optional(),
    chapter: z.string().nullable().optional(),
    chapterRange: z.string().nullable().optional(),
    level: z.union([z.literal(3), z.literal(4)]).optional(),
    parentCode: z.string().nullable().optional(),
    source: icd10SourceSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Se requiere al menos un campo para actualizar." });

const richValueSchema = z.object({
  json: z.record(z.unknown()).default({}),
  html: z.string().default(""),
  text: z.string().default("")
});

const historyFieldSchema = z.object({
  fieldId: z.string(),
  key: z.string(),
  label: z.string(),
  kind: z.enum(["rich_text", "textarea", "text", "number"]),
  required: z.boolean(),
  visible: z.boolean(),
  defaultValue: z.string(),
  textValue: z.string(),
  numberValue: z.number().nullable(),
  richValue: richValueSchema
});

const historySectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fields: z.array(historyFieldSchema)
});

const historyDraftSchema = z.object({
  type: z.enum(["basic", "complete", "employment"]),
  templateId: z.string().nullable(),
  templateTitle: z.string(),
  templateTypeLabel: z.string(),
  sections: z.array(historySectionSchema),
  consultationReason: z.string(),
  antecedentes: z.string(),
  physicalExam: z.string()
});

const vitalsSchema = z.object({
  bloodPressure: z.string().nullable(),
  heartRate: z.number().nullable(),
  respRate: z.number().nullable(),
  temperatureC: z.number().nullable(),
  spo2: z.number().nullable(),
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  glucometryMgDl: z.number().nullable(),
  abdominalCircumferenceCm: z.number().nullable(),
  bodyMassIndex: z.number().nullable(),
  capturedAt: z.string().nullable(),
  capturedBy: z.string().nullable(),
  circumferenceCm: z.number().nullable().optional()
});

const reconsultaSchema = z.object({
  id: z.string(),
  parentEncounterId: z.string(),
  type: z.enum(["reconsulta_resultados", "manual_evolution"]),
  sourceResultId: z.string().nullable(),
  sourceResultTitle: z.string().nullable(),
  createdAt: z.string(),
  authorName: z.string(),
  interpretation: z.string(),
  conduct: z.string(),
  therapeuticAdjustment: z.string(),
  noteRich: richValueSchema,
  entryTitle: z.string()
});

export const encounterSnapshotSchema = z.object({
  encounterId: z.string().min(1),
  signedAt: z.string().min(1),
  signedByName: z.string().min(1),
  status: z.enum(["draft", "open", "closed"]),
  patient: z.object({
    id: z.string(),
    recordNumber: z.string(),
    name: z.string(),
    age: z.number(),
    sex: z.enum(["M", "F", "Otro"]),
    dob: z.string(),
    photoUrl: z.string().nullable(),
    coverageType: z.enum(["particular", "empresa", "institucion", "aseguradora"]),
    coverageEntity: z.string().nullable(),
    phone: z.string().nullable(),
    insurer: z.string().nullable(),
    alerts: z.array(z.string())
  }),
  vitals: vitalsSchema,
  history: historyDraftSchema,
  diagnosis: z.object({
    principalCode: z.string().nullable(),
    secondaryCodes: z.array(z.string())
  }),
  prescription: z.array(
    z.object({
      id: z.string(),
      source: z.enum(["inventory", "free"]),
      productId: z.string().nullable(),
      name: z.string(),
      quantity: z.number(),
      instructions: z.string(),
      dose: z.string(),
      frequency: z.string(),
      duration: z.string(),
      notes: z.string().nullable()
    })
  ),
  reconsultations: z.array(reconsultaSchema),
  template: z
    .object({
      id: z.string(),
      title: z.string(),
      type: z.string(),
      isDefault: z.boolean(),
      sections: z.array(clinicalTemplateSectionSchema),
      updatedAt: z.string()
    })
    .nullable(),
  clinicalEvents: z.array(z.string())
});

export const createSnapshotRequestSchema = z.object({
  snapshot: encounterSnapshotSchema
});
