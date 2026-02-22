import { prisma } from "@/lib/prisma";
import {
  DiagnosticItemStatus,
  DiagnosticOrderAdminStatus,
  DiagnosticOrderStatus,
  LabResultFlag,
  Prisma,
  ReportStatus
} from "@prisma/client";

const toNumber = (val: Prisma.Decimal | null | undefined) => (val === null || val === undefined ? null : Number(val));

export type DiagnosticOrderWithRelations = Prisma.DiagnosticOrderGetPayload<{
  include: {
    patient: true;
    items: {
      include: {
        catalogItem: true;
        specimen: true;
        labResults: true;
        imagingStudy: { include: { reports: true } };
      };
    };
  };
}>;

export function computeResultFlag(
  valueNumber?: number | null,
  refLow?: number | null,
  refHigh?: number | null
): LabResultFlag | null {
  if (valueNumber === null || valueNumber === undefined) return null;
  if (refLow !== null && refLow !== undefined && valueNumber < refLow) return LabResultFlag.LOW;
  if (refHigh !== null && refHigh !== undefined && valueNumber > refHigh) return LabResultFlag.HIGH;
  return LabResultFlag.NORMAL;
}

export async function syncDiagnosticOrderStatus(orderId: string) {
  const order = await prisma.diagnosticOrder.findUnique({
    where: { id: orderId },
    select: { status: true, adminStatus: true }
  });
  if (!order) return null;
  if (adminStatusRank(order.adminStatus) < adminStatusRank(DiagnosticOrderAdminStatus.PAID)) {
    return order.status;
  }
  const items = await prisma.diagnosticOrderItem.findMany({ where: { orderId }, select: { status: true } });
  if (!items.length) return order.status;

  const allCancelled = items.every((i) => i.status === DiagnosticItemStatus.CANCELLED);
  const allReleased = items.every((i) => i.status === DiagnosticItemStatus.RELEASED);
  const validatedSet: DiagnosticItemStatus[] = [DiagnosticItemStatus.VALIDATED, DiagnosticItemStatus.RELEASED];
  const progressSet: DiagnosticItemStatus[] = [
    DiagnosticItemStatus.COLLECTED,
    DiagnosticItemStatus.IN_ANALYSIS,
    DiagnosticItemStatus.PENDING_VALIDATION,
    DiagnosticItemStatus.VALIDATED
  ];
  const allValidatedOrReleased = items.every((i) => validatedSet.includes(i.status));
  const hasProgress = items.some((i) => progressSet.includes(i.status));

  let nextStatus = order.status;
  if (allCancelled) nextStatus = DiagnosticOrderStatus.CANCELLED;
  else if (allReleased) nextStatus = DiagnosticOrderStatus.RELEASED;
  else if (allValidatedOrReleased) nextStatus = DiagnosticOrderStatus.READY;
  else if (hasProgress) nextStatus = DiagnosticOrderStatus.IN_PROGRESS;
  else if (order.status === DiagnosticOrderStatus.PAID) nextStatus = DiagnosticOrderStatus.PAID;

  if (nextStatus !== order.status) {
    await prisma.diagnosticOrder.update({ where: { id: orderId }, data: { status: nextStatus } });
  }
  return nextStatus;
}

function adminStatusRank(status: DiagnosticOrderAdminStatus) {
  const order: DiagnosticOrderAdminStatus[] = [
    DiagnosticOrderAdminStatus.DRAFT,
    DiagnosticOrderAdminStatus.PENDING_PAYMENT,
    DiagnosticOrderAdminStatus.INSURANCE_AUTH,
    DiagnosticOrderAdminStatus.PAID,
    DiagnosticOrderAdminStatus.SENT_TO_EXECUTION,
    DiagnosticOrderAdminStatus.COMPLETED,
    DiagnosticOrderAdminStatus.CANCELLED
  ];
  const idx = order.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export function serializeDiagnosticOrder(order: DiagnosticOrderWithRelations) {
  return {
    id: order.id,
    patientId: order.patientId,
    patient: order.patient
      ? {
          id: order.patient.id,
          name: [order.patient.firstName, order.patient.lastName].filter(Boolean).join(" ") || order.patient.companyName,
          dpi: order.patient.dpi,
          nit: order.patient.nit
        }
      : null,
    sourceType: order.sourceType,
    sourceRefId: order.sourceRefId,
    status: order.status,
    adminStatus: order.adminStatus,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    insuranceId: order.insuranceId,
    authorizedAt: order.authorizedAt ? order.authorizedAt.toISOString() : null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    authorizedByUserId: order.authorizedByUserId,
    orderedAt: order.orderedAt.toISOString(),
    notes: order.notes,
    totalAmount: toNumber(order.totalAmount),
    branchId: order.branchId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      kind: item.kind,
      status: item.status,
      priority: item.priority,
      scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      catalogItem: {
        id: item.catalogItem.id,
        code: item.catalogItem.code,
        name: item.catalogItem.name,
        kind: item.catalogItem.kind,
        modality: item.catalogItem.modality,
        unit: item.catalogItem.unit,
        price: toNumber(item.catalogItem.price),
        refLow: toNumber(item.catalogItem.refLow),
        refHigh: toNumber(item.catalogItem.refHigh)
      },
      specimen: item.specimen
        ? {
            id: item.specimen.id,
            specimenCode: item.specimen.specimenCode,
            collectedAt: item.specimen.collectedAt ? item.specimen.collectedAt.toISOString() : null,
            collectedByUserId: item.specimen.collectedByUserId
          }
        : null,
      labResults: item.labResults.map((res) => ({
        id: res.id,
        testCode: res.testCode,
        valueText: res.valueText,
        valueNumber: toNumber(res.valueNumber),
        unit: res.unit,
        refLow: toNumber(res.refLow),
        refHigh: toNumber(res.refHigh),
        flag: res.flag,
        resultAt: res.resultAt ? res.resultAt.toISOString() : null,
        enteredByUserId: res.enteredByUserId,
        validatedByUserId: res.validatedByUserId,
        validatedAt: res.validatedAt ? res.validatedAt.toISOString() : null,
        releasedAt: res.releasedAt ? res.releasedAt.toISOString() : null,
        createdAt: res.createdAt.toISOString(),
        updatedAt: res.updatedAt.toISOString()
      })),
      imagingStudy: item.imagingStudy
        ? {
            id: item.imagingStudy.id,
            modality: item.imagingStudy.modality,
            orthancStudyId: item.imagingStudy.orthancStudyId,
            studyInstanceUID: item.imagingStudy.studyInstanceUID,
            receivedAt: item.imagingStudy.receivedAt ? item.imagingStudy.receivedAt.toISOString() : null,
            reports: item.imagingStudy.reports.map((rep) => ({
              id: rep.id,
              status: rep.status,
              findings: rep.findings,
              impression: rep.impression,
              createdByUserId: rep.createdByUserId,
              signedByUserId: rep.signedByUserId,
              signedAt: rep.signedAt ? rep.signedAt.toISOString() : null,
              releasedAt: rep.releasedAt ? rep.releasedAt.toISOString() : null,
              createdAt: rep.createdAt.toISOString(),
              updatedAt: rep.updatedAt.toISOString()
            }))
          }
        : null
    }))
  };
}

export function canEditReport(status: ReportStatus) {
  return status === ReportStatus.DRAFT;
}
