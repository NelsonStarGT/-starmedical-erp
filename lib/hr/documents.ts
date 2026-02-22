import { randomUUID } from "crypto";
import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cleanNullableString, computeRetentionUntil, parseDateInput } from "@/lib/hr/utils";

export type DocumentPayload = {
  employeeId: string;
  type: string;
  title: string;
  visibility: "PERSONAL" | "EMPRESA" | "RESTRINGIDO";
  notes?: string | null;
  retentionUntil?: string | null;
  version: {
    fileUrl: string;
    versionNumber?: number;
    issuedAt?: string | null;
    deliveredAt?: string | null;
    expiresAt?: string | null;
    canEmployeeView?: boolean;
    viewGrantedUntil?: string | null;
    notes?: string | null;
  };
  uploadedById?: string | null;
};

export async function createDocumentWithVersion(params: {
  payload: DocumentPayload;
  documentId?: string;
  tx?: Prisma.TransactionClient;
}) {
  const { payload } = params;
  const tx = params.tx || prisma;
  const documentId = params.documentId || randomUUID();
  const versionId = randomUUID();

  const issuedAt = parseDateInput(payload.version.issuedAt, "Fecha de emisión");
  const deliveredAt = parseDateInput(payload.version.deliveredAt, "Fecha de entrega");
  const expiresAt = parseDateInput(payload.version.expiresAt, "Fecha de vencimiento");
  const viewGrantedUntil = parseDateInput(payload.version.viewGrantedUntil, "Vigencia visibilidad");
  const retentionUntil = computeRetentionUntil(issuedAt, parseDateInput(payload.retentionUntil, "Retención"));

  const versionNumber = payload.version.versionNumber || 1;

  const doc = await tx.employeeDocument.create({
    data: {
      id: documentId,
      employeeId: payload.employeeId,
      type: payload.type as any,
      visibility: payload.visibility,
      title: payload.title.trim(),
      notes: cleanNullableString(payload.notes),
      retentionUntil,
      isArchived: false,
      currentVersionId: versionId,
      createdById: payload.uploadedById || null,
      versions: {
        create: {
          id: versionId,
          versionNumber,
          fileUrl: payload.version.fileUrl.trim(),
          issuedAt,
          deliveredAt,
          expiresAt,
          canEmployeeView: payload.version.canEmployeeView ?? false,
          viewGrantedUntil,
          notes: cleanNullableString(payload.version.notes),
          uploadedById: payload.uploadedById || null
        }
      }
    }
  });

  if (expiresAt) {
    await tx.notification.create({
      data: {
        employeeId: payload.employeeId,
        type: NotificationType.DOCUMENT_EXPIRY,
        title: `Documento ${payload.title} por vencer`,
        entityId: documentId,
        dueAt: expiresAt
      }
    });
  }

  return doc;
}

export async function addDocumentVersion(params: {
  documentId: string;
  employeeId: string;
  payload: DocumentPayload;
  tx?: Prisma.TransactionClient;
}) {
  const tx = params.tx || prisma;
  const versionId = randomUUID();

  const issuedAt = parseDateInput(params.payload.version.issuedAt, "Fecha de emisión");
  const deliveredAt = parseDateInput(params.payload.version.deliveredAt, "Fecha de entrega");
  const expiresAt = parseDateInput(params.payload.version.expiresAt, "Fecha de vencimiento");
  const viewGrantedUntil = parseDateInput(params.payload.version.viewGrantedUntil, "Vigencia visibilidad");
  const retentionUntil = computeRetentionUntil(issuedAt, parseDateInput(params.payload.retentionUntil, "Retención"));

  const existingVersions = await tx.employeeDocumentVersion.findMany({
    where: { documentId: params.documentId },
    select: { versionNumber: true }
  });
  const nextVersion = params.payload.version.versionNumber || (existingVersions.length ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1 : 1);

  await tx.employeeDocument.update({
    where: { id: params.documentId },
    data: {
      title: params.payload.title.trim(),
      notes: cleanNullableString(params.payload.notes),
      visibility: params.payload.visibility,
      retentionUntil,
      currentVersionId: versionId,
      versions: {
        create: {
          id: versionId,
          versionNumber: nextVersion,
          fileUrl: params.payload.version.fileUrl.trim(),
          issuedAt,
          deliveredAt,
          expiresAt,
          canEmployeeView: params.payload.version.canEmployeeView ?? false,
          viewGrantedUntil,
          notes: cleanNullableString(params.payload.version.notes),
          uploadedById: params.payload.uploadedById || null
        }
      }
    }
  });

  if (expiresAt) {
    await tx.notification.upsert({
      where: { id: `DOC-EXP-${params.documentId}` },
      update: { dueAt: expiresAt, title: `Documento ${params.payload.title} por vencer`, employeeId: params.employeeId, type: NotificationType.DOCUMENT_EXPIRY, entityId: params.documentId },
      create: {
        id: `DOC-EXP-${params.documentId}`,
        employeeId: params.employeeId,
        type: NotificationType.DOCUMENT_EXPIRY,
        title: `Documento ${params.payload.title} por vencer`,
        entityId: params.documentId,
        dueAt: expiresAt
      }
    });
  }
}
