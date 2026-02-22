import { z } from "zod";
import {
  DiagnosticItemKind,
  DiagnosticOrderAdminStatus,
  DiagnosticOrderStatus,
  DiagnosticOrderSourceType,
  DiagnosticPaymentMethod,
  ImagingModality,
  LabResultFlag,
  ReportStatus
} from "@prisma/client";

const optionalDateString = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().optional()
);

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.coerce.number()
);

export const diagnosticOrderItemInputSchema = z.object({
  catalogItemId: z.string().min(1, "catalogItemId requerido"),
  kind: z.nativeEnum(DiagnosticItemKind),
  priority: z.string().optional(),
  scheduledAt: optionalDateString
});

export const createDiagnosticOrderSchema = z.object({
  patientId: z.string().min(1, "patientId requerido"),
  branchId: z.string().optional(),
  notes: z.string().optional(),
  sourceType: z.nativeEnum(DiagnosticOrderSourceType).optional(),
  sourceRefId: z.string().optional(),
  orderedAt: optionalDateString,
  items: z.array(diagnosticOrderItemInputSchema).min(1, "Al menos un item")
});

export const diagnosticOrderQuerySchema = z.object({
  status: z.nativeEnum(DiagnosticOrderStatus).optional(),
  adminStatus: z.nativeEnum(DiagnosticOrderAdminStatus).optional(),
  q: z.string().optional()
});

export const diagnosticOrderAdminStatusSchema = z.object({
  adminStatus: z.nativeEnum(DiagnosticOrderAdminStatus),
  paymentMethod: z.nativeEnum(DiagnosticPaymentMethod).optional(),
  paymentReference: z.string().optional(),
  insuranceId: z.string().optional()
});

export const labSpecimenSchema = z.object({
  orderItemId: z.string().min(1),
  specimenCode: z.string().min(1),
  collectedAt: optionalDateString
});

export const labResultInputSchema = z
  .object({
    orderItemId: z.string().min(1),
    testCode: z.string().optional(),
    valueText: z.string().optional(),
    valueNumber: optionalNumber.optional(),
    unit: z.string().optional(),
    refLow: optionalNumber.optional(),
    refHigh: optionalNumber.optional(),
    flag: z.nativeEnum(LabResultFlag).optional(),
    resultAt: optionalDateString
  })
  .refine(
    (val) => typeof val.valueText === "string" || typeof val.valueNumber === "number",
    { message: "Se requiere valueText o valueNumber" }
  );

export const imagingStudyInputSchema = z.object({
  orderItemId: z.string().min(1),
  modality: z.nativeEnum(ImagingModality),
  orthancStudyId: z.string().min(1),
  studyInstanceUID: z.string().optional(),
  receivedAt: optionalDateString
});

export const imagingReportInputSchema = z.object({
  id: z.string().optional(),
  imagingStudyId: z.string().min(1),
  findings: z.string().optional(),
  impression: z.string().optional(),
  status: z.nativeEnum(ReportStatus).optional()
});

export const hl7OruSchema = z.object({
  orderExternalId: z.string().min(1),
  patientExternalId: z.string().min(1),
  results: z
    .array(
      z.object({
        testCode: z.string().min(1),
        value: z.union([z.string(), z.number()]),
        unit: z.string().optional(),
        refLow: z.union([z.string(), z.number()]).optional(),
        refHigh: z.union([z.string(), z.number()]).optional(),
        observedAt: optionalDateString
      })
    )
    .min(1)
});
