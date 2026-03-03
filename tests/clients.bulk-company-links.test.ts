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
  roles?: string[];
  mode: "analyze" | "process";
  dedupeMode?: "skip" | "update";
  csv: string;
  allowCompanyNameFallback?: boolean;
}) {
  const token = buildToken(payload);
  const form = new FormData();
  form.append("type", "PERSON");
  form.append("mode", payload.mode);
  form.append("dedupeMode", payload.dedupeMode || "skip");
  if (payload.allowCompanyNameFallback) {
    form.append("allowCompanyNameFallback", "true");
  }
  form.append("file", new File([payload.csv], "personas.csv", { type: "text/csv" }));

  return new NextRequest("http://localhost/api/admin/clientes/import/csv", {
    method: "POST",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    },
    body: form
  });
}

type CompanyStub = {
  id: string;
  companyName: string;
  tradeName: string | null;
  nit: string | null;
  clientCode: string | null;
};

function setupBulkImportPrismaMocks(input: {
  companyByNit?: Record<string, CompanyStub>;
  companyByCode?: Record<string, CompanyStub>;
  companyByName?: Record<string, CompanyStub[]>;
}) {
  const clientCatalogItemDelegate = (prisma as any).clientCatalogItem;
  const clientProfileDelegate = (prisma as any).clientProfile;
  const personCompanyLinkDelegate = (prisma as any).personCompanyLink;
  const clientAffiliationDelegate = (prisma as any).clientAffiliation;

  assert.ok(clientCatalogItemDelegate?.findFirst, "clientCatalogItem.findFirst delegate missing");
  assert.ok(clientProfileDelegate?.findFirst, "clientProfile.findFirst delegate missing");
  assert.ok(clientProfileDelegate?.findMany, "clientProfile.findMany delegate missing");
  assert.ok(clientProfileDelegate?.update, "clientProfile.update delegate missing");
  assert.ok(personCompanyLinkDelegate?.upsert, "personCompanyLink.upsert delegate missing");
  assert.ok(clientAffiliationDelegate?.findFirst, "clientAffiliation.findFirst delegate missing");
  assert.ok(clientAffiliationDelegate?.create, "clientAffiliation.create delegate missing");

  const originalCatalogFindFirst = clientCatalogItemDelegate.findFirst;
  const originalClientProfileFindFirst = clientProfileDelegate.findFirst;
  const originalClientProfileFindMany = clientProfileDelegate.findMany;
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

    if (where?.type === "COMPANY") {
      if (where?.nit && input.companyByNit?.[where.nit]) {
        return input.companyByNit[where.nit];
      }

      if (where?.clientCode && input.companyByCode?.[String(where.clientCode).toUpperCase()]) {
        return input.companyByCode[String(where.clientCode).toUpperCase()];
      }

      if (Array.isArray(where?.OR)) {
        for (const clause of where.OR) {
          if (clause?.nit && input.companyByNit?.[clause.nit]) return input.companyByNit[clause.nit];
          if (clause?.clientCode && input.companyByCode?.[String(clause.clientCode).toUpperCase()]) {
            return input.companyByCode[String(clause.clientCode).toUpperCase()];
          }
        }
      }
    }

    if (where?.phone || where?.email) {
      return null;
    }

    return null;
  };

  clientProfileDelegate.findMany = async (args: any) => {
    const where = args?.where || {};
    const companyName = where?.OR?.find((item: any) => item?.companyName?.equals)?.companyName?.equals;
    const tradeName = where?.OR?.find((item: any) => item?.tradeName?.equals)?.tradeName?.equals;
    const lookup = String(companyName || tradeName || "").trim().toLowerCase();
    if (!lookup) return [];
    return input.companyByName?.[lookup] || [];
  };

  clientProfileDelegate.update = async () => ({ id: "person-existing-1" });
  personCompanyLinkDelegate.upsert = async (args: any) => {
    upsertCalls.push(args);
    return { id: "link-1" };
  };
  clientAffiliationDelegate.findFirst = async () => null;
  clientAffiliationDelegate.create = async () => ({ id: "aff-1" });

  return {
    upsertCalls,
    restore: () => {
      clientCatalogItemDelegate.findFirst = originalCatalogFindFirst;
      clientProfileDelegate.findFirst = originalClientProfileFindFirst;
      clientProfileDelegate.findMany = originalClientProfileFindMany;
      clientProfileDelegate.update = originalClientProfileUpdate;
      personCompanyLinkDelegate.upsert = originalPersonCompanyLinkUpsert;
      clientAffiliationDelegate.findFirst = originalClientAffiliationFindFirst;
      clientAffiliationDelegate.create = originalClientAffiliationCreate;
    }
  };
}

test("PERSON import: EmpresaNIT + EmpresaCodigo que coinciden vincula correctamente", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresaNIT;EmpresaCodigo;RolEmpresa;EmpresaPrincipal;VinculoActivo",
    "Ana;Torres;1234567890101;+50255550000;1234567-8;E001;Colaborador;true;true"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const company: CompanyStub = {
    id: "company-existing-1",
    companyName: "Empresa Demo",
    tradeName: "Demo",
    nit: "1234567-8",
    clientCode: "E001"
  };

  const mock = setupBulkImportPrismaMocks({
    companyByNit: { "1234567-8": company },
    companyByCode: { E001: company }
  });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);

    const payload = (await res.json()) as {
      ok: boolean;
      summary: { updated: number; linked: number; errors: number };
      companyResolutionPreview?: Array<{ source: string; query: string; companyLabel: string }>;
    };

    assert.equal(payload.ok, true);
    assert.equal(payload.summary.updated, 1);
    assert.equal(payload.summary.linked, 1);
    assert.equal(payload.summary.errors, 0);
    assert.equal(mock.upsertCalls.length, 1);
    assert.equal(mock.upsertCalls[0]?.where?.personId_companyId?.companyId, "company-existing-1");
    assert.equal(payload.companyResolutionPreview?.[0]?.source, "strict_columns");
    assert.match(payload.companyResolutionPreview?.[0]?.query || "", /NIT:1234567-8/);
    assert.equal(payload.companyResolutionPreview?.[0]?.companyLabel, "Empresa Demo");
  } finally {
    mock.restore();
  }
});

test("PERSON import: columnas legacy EmpresasVinculadas siguen funcionando", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresasVinculadas;RolesEmpresa",
    "Ana;Torres;1234567890101;+50255550000;NIT:1234567-8;Colaborador"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const mock = setupBulkImportPrismaMocks({
    companyByNit: {
      "1234567-8": {
        id: "company-existing-1",
        companyName: "Empresa Demo",
        tradeName: "Demo",
        nit: "1234567-8",
        clientCode: "E001"
      }
    }
  });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      summary: { linked: number; errors: number };
      companyResolutionPreview?: Array<{ source: string }>;
    };
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.linked, 1);
    assert.equal(payload.summary.errors, 0);
    assert.equal(payload.companyResolutionPreview?.[0]?.source, "legacy_columns");
    assert.equal(mock.upsertCalls.length, 1);
  } finally {
    mock.restore();
  }
});

test("PERSON import: EmpresaNIT + EmpresaCodigo mismatch produce error por fila", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresaNIT;EmpresaCodigo",
    "Ana;Torres;1234567890101;+50255550000;1234567-8;E009"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const mock = setupBulkImportPrismaMocks({
    companyByNit: {
      "1234567-8": {
        id: "company-existing-1",
        companyName: "Empresa Demo 1",
        tradeName: "Demo 1",
        nit: "1234567-8",
        clientCode: "E001"
      }
    },
    companyByCode: {
      E009: {
        id: "company-existing-9",
        companyName: "Empresa Demo 9",
        tradeName: "Demo 9",
        nit: "9876543-1",
        clientCode: "E009"
      }
    }
  });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      summary: { errors: number; linked: number };
      errorsPreview: Array<{ row: number; message: string }>;
    };
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.linked, 0);
    assert.equal(payload.summary.errors, 1);
    assert.match(payload.errorsPreview[0]?.message || "", /no coinciden/i);
    assert.equal(mock.upsertCalls.length, 0);
  } finally {
    mock.restore();
  }
});

test("PERSON import: solo EmpresaCodigo resuelve empresa y vincula", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresaCodigo;RolEmpresa",
    "Ana;Torres;1234567890101;+50255550000;E001;Supervisor"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const mock = setupBulkImportPrismaMocks({
    companyByCode: {
      E001: {
        id: "company-existing-1",
        companyName: "Empresa Demo",
        tradeName: "Demo",
        nit: "1234567-8",
        clientCode: "E001"
      }
    }
  });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      summary: { linked: number; errors: number };
      companyResolutionPreview?: Array<{ source: string; query: string }>;
    };
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.linked, 1);
    assert.equal(payload.summary.errors, 0);
    assert.equal(payload.companyResolutionPreview?.[0]?.source, "strict_columns");
    assert.match(payload.companyResolutionPreview?.[0]?.query || "", /CODE:E001/);
    assert.equal(mock.upsertCalls.length, 1);
  } finally {
    mock.restore();
  }
});

test("PERSON import: solo EmpresaNombre falla por defecto (modo laxo deshabilitado)", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*;EmpresaNombre",
    "Ana;Torres;1234567890101;+50255550000;Empresa Demo"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS", "CLIENTS_IMPORT_PROCESS_UPDATE"],
    mode: "process",
    dedupeMode: "update",
    csv
  });

  const mock = setupBulkImportPrismaMocks({
    companyByName: {
      "empresa demo": [
        {
          id: "company-existing-1",
          companyName: "Empresa Demo",
          tradeName: "Demo",
          nit: "1234567-8",
          clientCode: "E001"
        }
      ]
    }
  });

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as {
      ok: boolean;
      summary: { linked: number; errors: number };
      errorsPreview: Array<{ row: number; message: string }>;
    };
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.linked, 0);
    assert.equal(payload.summary.errors, 1);
    assert.match(payload.errorsPreview[0]?.message || "", /modo laxo/i);
    assert.equal(mock.upsertCalls.length, 0);
  } finally {
    mock.restore();
  }
});
