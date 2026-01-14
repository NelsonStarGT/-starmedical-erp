import { randomUUID } from "crypto";
import {
  NotificationSeverity,
  NotificationType,
  Prisma,
  PrismaClient,
  HrEmployeeDocumentType,
  HrDocumentVisibility
} from "@prisma/client";
import { computeRetentionUntil, parseDateInput, cleanNullableString } from "./utils";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function generateEmployeeCode(tx: Pick<PrismaClient, "hrEmployee">) {
  const last = await tx.hrEmployee.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  const lastNum = last?.employeeCode?.match(/(\d+)/)?.[1] ? parseInt(last.employeeCode.match(/(\d+)/)![1], 10) : 0;
  return `EMP-${String(lastNum + 1).padStart(6, "0")}`;
}

export async function assertDpiUnique(tx: Pick<PrismaClient, "hrEmployee">, dpi: string, selfId?: string) {
  const existing = await tx.hrEmployee.findFirst({
    where: {
      dpi,
      NOT: selfId ? { id: selfId } : undefined
    }
  });
  if (existing) {
    throw new Error("DPI ya registrado");
  }
}

function deriveVisibility(type: string, provided?: string | null) {
  if (provided) return provided;
  if (type === "DPI" || type === "RTU" || type === "RECIBO_SERVICIO") return "PERSONAL";
  if (type === "CONTRATO" || type === "SANCION") return "RESTRINGIDO";
  return "PERSONAL";
}

function computeSeverity(expiresAt: Date) {
  const now = new Date();
  const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return NotificationSeverity.CRITICAL;
  if (diffDays <= 15) return NotificationSeverity.WARNING;
  return NotificationSeverity.INFO;
}

export async function upsertEmployeeDocument(
  tx: Tx,
  employeeId: string,
  doc: {
    id?: string;
    type: string;
    title: string;
    visibility?: string | null;
    notes?: string | null;
    retentionUntil?: string | null;
    version: {
      versionNumber?: number | null;
      fileUrl: string;
      issuedAt?: string | null;
      deliveredAt?: string | null;
      expiresAt?: string | null;
      canEmployeeView?: boolean;
      viewGrantedUntil?: string | null;
      notes?: string | null;
    };
  },
  actorUserId?: string | null
) {
  const docType = doc.type as HrEmployeeDocumentType;
  const existing = await tx.employeeDocument.findFirst({
    where: { employeeId, type: docType, isArchived: false },
    select: { id: true }
  });

  const documentId = doc.id || existing?.id || randomUUID();
  const versionId = randomUUID();
  const issuedAt = parseDateInput(doc.version.issuedAt, "Fecha de emisión");
  const deliveredAt = parseDateInput(doc.version.deliveredAt, "Fecha de entrega");
  const expiresAt = parseDateInput(doc.version.expiresAt, "Fecha de vencimiento");
  const viewGrantedUntil = parseDateInput(doc.version.viewGrantedUntil, "Vigencia visibilidad");
  const retentionUntil = computeRetentionUntil(issuedAt, parseDateInput(doc.retentionUntil, "Retención"));
  const visibility = deriveVisibility(doc.type, doc.visibility) as HrDocumentVisibility;

  if (existing) {
    await tx.employeeDocument.update({
      where: { id: existing.id },
      data: {
        title: doc.title.trim(),
        visibility,
        notes: cleanNullableString(doc.notes),
        retentionUntil,
        currentVersionId: versionId,
        versions: {
          create: {
            id: versionId,
            versionNumber: doc.version.versionNumber || 1,
            fileUrl: doc.version.fileUrl.trim(),
            issuedAt,
            deliveredAt,
            expiresAt,
            canEmployeeView: doc.version.canEmployeeView ?? false,
            viewGrantedUntil,
            notes: cleanNullableString(doc.version.notes),
            uploadedById: actorUserId || null
          }
        }
      }
    });
  } else {
    await tx.employeeDocument.create({
      data: {
        id: documentId,
        employeeId,
        type: docType,
        visibility,
        title: doc.title.trim(),
        notes: cleanNullableString(doc.notes),
        retentionUntil,
        isArchived: false,
        currentVersionId: versionId,
        createdById: actorUserId || null,
        versions: {
          create: {
            id: versionId,
            versionNumber: doc.version.versionNumber || 1,
            fileUrl: doc.version.fileUrl.trim(),
            issuedAt,
            deliveredAt,
            expiresAt,
            canEmployeeView: doc.version.canEmployeeView ?? false,
            viewGrantedUntil,
            notes: cleanNullableString(doc.version.notes),
            uploadedById: actorUserId || null
          }
        }
      }
    });
  }

  if (expiresAt) {
    await tx.notification.upsert({
      where: { id: `doc-${documentId}-expiry` },
      update: {
        type: NotificationType.DOCUMENT_EXPIRY,
        severity: computeSeverity(expiresAt),
        title: `Documento ${doc.title} por vencer`,
        description: doc.title,
        entityId: documentId,
        entityType: "EmployeeDocument",
        employeeId,
        dueAt: expiresAt
      },
      create: {
        id: `doc-${documentId}-expiry`,
        type: NotificationType.DOCUMENT_EXPIRY,
        severity: computeSeverity(expiresAt),
        title: `Documento ${doc.title} por vencer`,
        description: doc.title,
        entityId: documentId,
        entityType: "EmployeeDocument",
        employeeId,
        dueAt: expiresAt
      }
    });
  }
}
