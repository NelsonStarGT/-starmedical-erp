import test from "node:test";
import assert from "node:assert/strict";
import { ClientDocumentApprovalStatus, ClientProfileType } from "@prisma/client";
import { getClientCompletenessScore, type ClientCompletenessSnapshot } from "@/lib/clients/completeness";
import { buildRequiredDocumentsChecklist } from "@/lib/clients/requiredDocuments";

const personSnapshotComplete: ClientCompletenessSnapshot = {
  type: ClientProfileType.PERSON,
  firstName: "Ana",
  middleName: "Lucia",
  lastName: "Lopez",
  secondLastName: "Perez",
  dpi: "1234567890123",
  phone: "55550000",
  companyName: null,
  tradeName: null,
  nit: null,
  address: "Zona 10",
  city: "Guatemala",
  department: "Guatemala",
  institutionTypeId: null
};

test("buildRequiredDocumentsChecklist calcula snapshot de requeridos", () => {
  const result = buildRequiredDocumentsChecklist({
    rules: [
      {
        id: "rule-dpi",
        clientType: ClientProfileType.PERSON,
        documentTypeId: "doc-dpi",
        documentTypeName: "DPI escaneado",
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: false,
        weight: 5,
        isActive: true
      },
      {
        id: "rule-rtu",
        clientType: ClientProfileType.PERSON,
        documentTypeId: "doc-rtu",
        documentTypeName: "RTU",
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: 5,
        isActive: true
      }
    ],
    documents: [
      {
        id: "doc-row-dpi-v1",
        documentTypeId: "doc-dpi",
        title: "DPI frente",
        fileUrl: "https://cdn.test/dpi.pdf",
        fileAssetId: "asset-dpi",
        approvalStatus: ClientDocumentApprovalStatus.APPROVED,
        expiresAt: null,
        createdAt: new Date("2026-02-10T12:00:00.000Z"),
        rejectionReason: null
      },
      {
        id: "doc-row-rtu-v1",
        documentTypeId: "doc-rtu",
        title: "RTU 2026",
        fileUrl: "https://cdn.test/rtu.pdf",
        fileAssetId: "asset-rtu",
        approvalStatus: ClientDocumentApprovalStatus.REJECTED,
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-02-10T12:00:00.000Z"),
        rejectionReason: "Documento ilegible"
      }
    ],
    now: new Date("2026-02-10T13:00:00.000Z")
  });

  assert.equal(result.summary.requiredTotal, 10);
  assert.equal(result.summary.approvedAndValid, 5);
  assert.equal(result.summary.rejectedOrMissing, 5);
  assert.equal(result.summary.rejectedCount, 1);
  assert.equal(result.summary.pendingCount, 0);
  assert.equal(result.summary.expiredCount, 0);
  assert.deepEqual(result.summary.missingLabels, ["RTU"]);
});

test("health score ponderado 70/30 con 2 requeridos (1 aprobado vigente, 1 rechazado)", () => {
  const required = buildRequiredDocumentsChecklist({
    rules: [
      {
        id: "rule-a",
        clientType: ClientProfileType.PERSON,
        documentTypeId: "doc-a",
        documentTypeName: "DPI escaneado",
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: false,
        weight: 5,
        isActive: true
      },
      {
        id: "rule-b",
        clientType: ClientProfileType.PERSON,
        documentTypeId: "doc-b",
        documentTypeName: "RTU",
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: false,
        weight: 5,
        isActive: true
      }
    ],
    documents: [
      {
        id: "doc-a-v1",
        documentTypeId: "doc-a",
        title: "DPI",
        fileUrl: "https://cdn.test/dpi.pdf",
        fileAssetId: "asset-a",
        approvalStatus: ClientDocumentApprovalStatus.APPROVED,
        expiresAt: null,
        createdAt: new Date("2026-02-10T12:00:00.000Z"),
        rejectionReason: null
      },
      {
        id: "doc-b-v1",
        documentTypeId: "doc-b",
        title: "RTU",
        fileUrl: "https://cdn.test/rtu.pdf",
        fileAssetId: "asset-b",
        approvalStatus: ClientDocumentApprovalStatus.REJECTED,
        expiresAt: null,
        createdAt: new Date("2026-02-10T12:00:00.000Z"),
        rejectionReason: "No cumple"
      }
    ]
  });

  const score = getClientCompletenessScore(personSnapshotComplete, {
    documents: {
      requiredTotal: required.summary.requiredTotal,
      approvedAndValid: required.summary.approvedAndValid,
      rejectedOrMissing: required.summary.rejectedOrMissing
    },
    weights: { profile: 70, documents: 30 }
  });

  assert.equal(score, 85);
});
