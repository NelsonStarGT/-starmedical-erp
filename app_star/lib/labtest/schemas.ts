import { z } from "zod";
import {
  LabArea,
  LabMessageChannel,
  LabSampleType,
  LabTestPriority,
  LabTestStatus,
  LabResultFlag,
  LabInstrumentStatus,
  LabTemplateFieldDataType
} from "@prisma/client";

export const labTestPrioritySchema = z.nativeEnum(LabTestPriority);
export const labAreaSchema = z.nativeEnum(LabArea);
export const labStatusSchema = z.nativeEnum(LabTestStatus);
export const labSampleTypeSchema = z.nativeEnum(LabSampleType);
export const labMessageChannelSchema = z.nativeEnum(LabMessageChannel);
export const labInstrumentStatusSchema = z.nativeEnum(LabInstrumentStatus);
export const labResultFlagSchema = z.nativeEnum(LabResultFlag);

export const createLabOrderItemSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  area: labAreaSchema,
  priority: labTestPrioritySchema.optional(),
  requirementsNotes: z.string().optional()
});

export const createLabOrderSchema = z.object({
  patientId: z.string().optional(),
  labPatient: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      docId: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional()
    })
    .optional(),
  priority: labTestPrioritySchema.default("ROUTINE"),
  fastingRequired: z.boolean().default(false),
  fastingConfirmed: z.boolean().nullable().optional(),
  requirementsNotes: z.string().optional(),
  areaHint: labAreaSchema.optional(),
  items: z.array(createLabOrderItemSchema).min(1)
});

export const registerSampleSchema = z.object({
  orderId: z.string(),
  barcode: z.string().min(3),
  type: labSampleTypeSchema,
  area: labAreaSchema.optional(),
  fastingConfirmed: z.boolean().nullable().optional(),
  status: labStatusSchema.optional(),
  itemIds: z.array(z.string()).optional()
});

export const captureResultSchema = z.object({
  itemId: z.string(),
  sampleId: z.string().optional(),
  valueText: z.string().optional(),
  valueNumber: z.number().optional(),
  unit: z.string().optional(),
  refLow: z.number().optional(),
  refHigh: z.number().optional(),
  flag: labResultFlagSchema.optional(),
  resultAt: z.coerce.date().optional()
});

export const validateResultSchema = z.object({
  resultId: z.string()
});

export const releaseResultSchema = z.object({
  resultId: z.string()
});

export const sendResultSchema = z.object({
  orderId: z.string(),
  channel: labMessageChannelSchema,
  recipient: z.string().min(4),
  payloadJson: z.any().optional()
});

export const templateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  area: labAreaSchema,
  html: z.string().min(10),
  isDefault: z.boolean().optional()
});

export const instrumentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  area: labAreaSchema,
  connectionStatus: labInstrumentStatusSchema.optional(),
  mappingJson: z.any().optional(),
  notes: z.string().optional()
});

export const settingsSchema = z.object({
  defaultMessage: z.string().optional(),
  slaRoutineMin: z.number().int().min(1).optional(),
  slaUrgentMin: z.number().int().min(1).optional(),
  slaStatMin: z.number().int().min(1).optional(),
  defaultChannel: labMessageChannelSchema.optional(),
  logsResetDaily: z.boolean().optional(),
  logsPrefixSpecimen: z.string().optional(),
  logsPrefixReport: z.string().optional(),
  workbenchAutoInProcess: z.boolean().optional(),
  templatesPreviewMode: z.string().optional(),
  reportsDefaultRangeDays: z.number().int().min(1).optional(),
  requireOtpForLabTest: z.boolean().optional(),
  otpTtlMinutes: z.number().int().min(5).max(30).optional(),
  idleTimeoutMinutes: z.number().int().min(10).max(480).optional()
});

export const labCatalogCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  order: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const labCatalogSubcategorySchema = z.object({
  id: z.string().optional(),
  categoryId: z.string(),
  name: z.string().min(2),
  order: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const labCatalogTestSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(2),
  area: labAreaSchema,
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  sampleTypeDefault: labSampleTypeSchema.optional(),
  isActive: z.boolean().optional()
});

export const labTemplateV2FieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  dataType: z.nativeEnum(LabTemplateFieldDataType),
  unitDefault: z.string().optional(),
  refLowDefault: z.number().optional(),
  refHighDefault: z.number().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const labTemplateV2Schema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  area: labAreaSchema,
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  isDefault: z.boolean().optional(),
  fields: z.array(labTemplateV2FieldSchema).optional()
});
