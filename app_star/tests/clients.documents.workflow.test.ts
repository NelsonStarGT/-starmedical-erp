import test from "node:test";
import assert from "node:assert/strict";
import { ClientDocumentApprovalStatus } from "@prisma/client";
import { actionCreateDocumentVersion, actionRejectClientDocument } from "@/app/admin/clientes/actions";
import { prisma } from "@/lib/prisma";

const actorUser = {
  id: "admin-docs-1",
  email: "admin-docs@starmedical.test",
  name: "Admin Docs",
  roles: ["ADMIN"],
  permissions: []
};

type MockDocumentRecord = {
  id: string;
  clientId: string;
  title: string;
  documentTypeId: string | null;
  expiresAt: Date | null;
  version: number;
  approvalStatus: ClientDocumentApprovalStatus;
  supersededAt: Date | null;
  supersededByDocumentId: string | null;
  fileUrl: string | null;
  fileAssetId: string | null;
  originalName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function setupVersioningPrismaMock(initialDoc: MockDocumentRecord) {
  const documents = new Map<string, MockDocumentRecord>([[initialDoc.id, { ...initialDoc }]]);
  const docAuditRows: Array<Record<string, unknown>> = [];
  const timelineRows: Array<Record<string, unknown>> = [];

  const originalFindUnique = (prisma.clientDocument as any).findUnique;
  const originalTransaction = prisma.$transaction;

  (prisma.clientDocument as any).findUnique = async ({ where }: { where: { id: string } }) => {
    const doc = documents.get(where.id);
    if (!doc) return null;
    return {
      id: doc.id,
      clientId: doc.clientId,
      title: doc.title,
      documentTypeId: doc.documentTypeId,
      expiresAt: doc.expiresAt,
      version: doc.version,
      approvalStatus: doc.approvalStatus,
      supersededByDocumentId: doc.supersededByDocumentId,
      client: { deletedAt: null }
    };
  };

  (prisma as any).$transaction = async (arg: unknown) => {
    if (typeof arg !== "function") throw new Error("Mock only supports callback transactions.");

    const tx = {
      clientDocument: {
        updateMany: async ({ where, data }: { where: { id: string; supersededByDocumentId: null }; data: { supersededAt: Date } }) => {
          const current = documents.get(where.id);
          if (!current || current.supersededByDocumentId !== null) return { count: 0 };
          current.supersededAt = data.supersededAt;
          current.updatedAt = new Date(data.supersededAt);
          documents.set(current.id, current);
          return { count: 1 };
        },
        create: async ({
          data,
          select
        }: {
          data: {
            clientId: string;
            title: string;
            documentTypeId: string | null;
            expiresAt: Date | null;
            fileUrl: string | null;
            fileAssetId: string | null;
            originalName: string | null;
            version: number;
            approvalStatus: ClientDocumentApprovalStatus;
          };
          select: { id: true; version: true; approvalStatus: true };
        }) => {
          const id = `doc-v${data.version}`;
          const createdAt = new Date("2026-02-10T15:01:00.000Z");
          const record: MockDocumentRecord = {
            id,
            clientId: data.clientId,
            title: data.title,
            documentTypeId: data.documentTypeId,
            expiresAt: data.expiresAt,
            version: data.version,
            approvalStatus: data.approvalStatus,
            supersededAt: null,
            supersededByDocumentId: null,
            fileUrl: data.fileUrl,
            fileAssetId: data.fileAssetId,
            originalName: data.originalName,
            createdAt,
            updatedAt: createdAt
          };
          documents.set(id, record);

          if (select.id && select.version && select.approvalStatus) {
            return { id: record.id, version: record.version, approvalStatus: record.approvalStatus };
          }

          throw new Error("Unexpected select in mock create.");
        },
        update: async ({ where, data }: { where: { id: string }; data: { supersededAt: Date; supersededByDocumentId: string } }) => {
          const current = documents.get(where.id);
          if (!current) throw new Error("Document not found in mock.");
          current.supersededAt = data.supersededAt;
          current.supersededByDocumentId = data.supersededByDocumentId;
          current.updatedAt = new Date(data.supersededAt);
          documents.set(current.id, current);
          return current;
        }
      },
      auditLog: {
        createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
          docAuditRows.push(...data);
          return { count: data.length };
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          docAuditRows.push(data);
          return data;
        }
      },
      clientAuditEvent: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          timelineRows.push(data);
          return data;
        }
      }
    };

    return arg(tx);
  };

  return {
    documents,
    docAuditRows,
    timelineRows,
    restore: () => {
      (prisma.clientDocument as any).findUnique = originalFindUnique;
      (prisma as any).$transaction = originalTransaction;
    }
  };
}

test("actionCreateDocumentVersion crea v2 y marca v1 como reemplazado", async () => {
  const now = new Date("2026-02-10T15:00:00.000Z");
  const mock = setupVersioningPrismaMock({
    id: "doc-v1",
    clientId: "client-1",
    title: "Constancia fiscal",
    documentTypeId: null,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    version: 1,
    approvalStatus: ClientDocumentApprovalStatus.APPROVED,
    supersededAt: null,
    supersededByDocumentId: null,
    fileUrl: "https://cdn.starmedical.test/docs/v1.pdf",
    fileAssetId: "asset-v1",
    originalName: "v1.pdf",
    createdAt: new Date("2026-01-10T12:00:00.000Z"),
    updatedAt: new Date("2026-01-10T12:00:00.000Z")
  });

  try {
    const result = await actionCreateDocumentVersion(
      {
        documentId: "doc-v1",
        title: "Constancia fiscal",
        newFileUrl: "https://cdn.starmedical.test/docs/v2.pdf",
        newFileAssetId: "asset-v2",
        newOriginalName: "v2.pdf"
      },
      { actorUser, skipRevalidate: true, now }
    );

    assert.equal(result.version, 2);
    assert.equal(result.id, "doc-v2");

    const previous = mock.documents.get("doc-v1");
    const created = mock.documents.get("doc-v2");

    assert.ok(previous);
    assert.ok(created);
    assert.equal(previous?.supersededByDocumentId, "doc-v2");
    assert.equal(previous?.supersededAt?.toISOString(), now.toISOString());

    assert.equal(created?.version, 2);
    assert.equal(created?.approvalStatus, ClientDocumentApprovalStatus.PENDING);
    assert.equal(created?.fileUrl, "https://cdn.starmedical.test/docs/v2.pdf");

    assert.ok(mock.docAuditRows.some((row) => row.action === "CLIENT_DOCUMENT_SUPERSEDED"));
    assert.ok(mock.docAuditRows.some((row) => row.action === "CLIENT_DOCUMENT_VERSION_CREATED"));
    assert.ok(mock.timelineRows.some((row) => row.action === "CLIENT_DOCUMENT_VERSION_CREATED"));
  } finally {
    mock.restore();
  }
});

test("actionRejectClientDocument exige motivo mínimo", async () => {
  await assert.rejects(
    () => actionRejectClientDocument({ documentId: "doc-1", reason: "no" }, { actorUser, skipRevalidate: true }),
    /al menos 5 caracteres/
  );
});
