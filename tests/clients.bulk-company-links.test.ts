import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { POST as postImport } from "@/app/api/admin/clientes/import/csv/route";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildToken(payload: { tenantId: string; permissions: string[]; roles?: string[] }) {
  return jwt.sign(
    {
      id: `user-${payload.tenantId}`,
      email: `bulk+${payload.tenantId}@starmedical.test`,
      roles: payload.roles || ["OPS"],
      permissions: payload.permissions,
      tenantId: payload.tenantId
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );
}

function buildImportRequest(payload: {
  tenantId: string;
  permissions: string[];
  mode: "analyze" | "process";
  dedupeMode?: "skip" | "update";
  csv: string;
}) {
  const token = buildToken(payload);
  const form = new FormData();
  form.append("type", "PERSON");
  form.append("mode", payload.mode);
  form.append("dedupeMode", payload.dedupeMode || "skip");
  form.append("file", new File([payload.csv], "personas.csv", { type: "text/csv" }));

  return new NextRequest("http://localhost/api/admin/clientes/import/csv", {
    method: "POST",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    },
    body: form
  });
}

test("bulk import PERSON vincula empresa existente por company_keys (NIT)", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresasVinculadas",
    "Ana;Torres;1234567890101;+50255550000;NIT:1234567-8"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const clientCatalogItemDelegate = (prisma as any).clientCatalogItem;
  const clientProfileDelegate = (prisma as any).clientProfile;
  const personCompanyLinkDelegate = (prisma as any).personCompanyLink;
  const clientAffiliationDelegate = (prisma as any).clientAffiliation;

  assert.ok(clientCatalogItemDelegate?.findFirst, "clientCatalogItem.findFirst delegate missing");
  assert.ok(clientProfileDelegate?.findFirst, "clientProfile.findFirst delegate missing");
  assert.ok(clientProfileDelegate?.update, "clientProfile.update delegate missing");
  assert.ok(personCompanyLinkDelegate?.upsert, "personCompanyLink.upsert delegate missing");
  assert.ok(clientAffiliationDelegate?.findFirst, "clientAffiliation.findFirst delegate missing");
  assert.ok(clientAffiliationDelegate?.create, "clientAffiliation.create delegate missing");

  const originalCatalogFindFirst = clientCatalogItemDelegate.findFirst;
  const originalClientProfileFindFirst = clientProfileDelegate.findFirst;
  const originalClientProfileUpdate = clientProfileDelegate.update;
  const originalPersonCompanyLinkUpsert = personCompanyLinkDelegate.upsert;
  const originalClientAffiliationFindFirst = clientAffiliationDelegate.findFirst;
  const originalClientAffiliationCreate = clientAffiliationDelegate.create;

  const upsertCalls: any[] = [];

  clientCatalogItemDelegate.findFirst = async () => ({ id: "status-active" });
  clientProfileDelegate.findFirst = async (args: any) => {
    const where = args?.where || {};

    if (where?.type === "PERSON" && where?.dpi === "1234567890101") {
      return {
        id: "person-existing-1",
        type: "PERSON",
        firstName: "Ana",
        middleName: null,
        lastName: "Torres",
        secondLastName: null,
        companyName: null,
        tradeName: null,
        nit: null,
        dpi: "1234567890101"
      };
    }

    if (where?.type === "COMPANY" && where?.nit === "1234567-8") {
      return {
        id: "company-existing-1",
        companyName: "Empresa Demo",
        tradeName: "Demo",
        nit: "1234567-8",
        clientCode: "E001"
      };
    }

    if (where?.phone || where?.email) {
      return null;
    }

    return null;
  };

  clientProfileDelegate.update = async () => ({ id: "person-existing-1" });
  personCompanyLinkDelegate.upsert = async (args: any) => {
    upsertCalls.push(args);
    return { id: "link-1" };
  };
  clientAffiliationDelegate.findFirst = async () => null;
  clientAffiliationDelegate.create = async () => ({ id: "aff-1" });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);

    const payload = (await res.json()) as {
      ok: boolean;
      summary: {
        updated: number;
        linked: number;
      };
      personClientIds: string[];
    };

    assert.equal(payload.ok, true);
    assert.equal(payload.summary.updated, 1);
    assert.equal(payload.summary.linked, 1);
    assert.deepEqual(payload.personClientIds, ["person-existing-1"]);
    assert.equal(upsertCalls.length, 1);
    assert.equal(
      upsertCalls[0]?.where?.personId_companyId?.personId,
      "person-existing-1"
    );
    assert.equal(
      upsertCalls[0]?.where?.personId_companyId?.companyId,
      "company-existing-1"
    );
  } finally {
    clientCatalogItemDelegate.findFirst = originalCatalogFindFirst;
    clientProfileDelegate.findFirst = originalClientProfileFindFirst;
    clientProfileDelegate.update = originalClientProfileUpdate;
    personCompanyLinkDelegate.upsert = originalPersonCompanyLinkUpsert;
    clientAffiliationDelegate.findFirst = originalClientAffiliationFindFirst;
    clientAffiliationDelegate.create = originalClientAffiliationCreate;
  }
});
