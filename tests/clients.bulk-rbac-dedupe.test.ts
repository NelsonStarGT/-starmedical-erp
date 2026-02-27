import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { GET as getTemplate } from "@/app/api/admin/clientes/import/template/route";
import { GET as getExportCsv } from "@/app/api/admin/clientes/export/csv/route";
import { POST as postImport } from "@/app/api/admin/clientes/import/csv/route";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildToken(payload: { tenantId: string; permissions: string[]; roles?: string[] }) {
  return jwt.sign(
    {
      id: `user-${payload.tenantId}`,
      email: `bulk+${payload.tenantId}@starmedical.test`,
      roles: payload.roles || ["STAFF"],
      permissions: payload.permissions,
      tenantId: payload.tenantId
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );
}

function buildGetRequest(url: string, payload: { tenantId: string; permissions: string[]; roles?: string[] }) {
  const token = buildToken(payload);
  return new NextRequest(url, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    }
  });
}

function buildImportRequest(payload: {
  tenantId: string;
  permissions: string[];
  roles?: string[];
  mode: "analyze" | "process";
  csv: string;
}) {
  const token = buildToken(payload);
  const form = new FormData();
  form.append("type", "PERSON");
  form.append("mode", payload.mode);
  form.append("file", new File([payload.csv], "personas.csv", { type: "text/csv" }));

  return new NextRequest("http://localhost/api/admin/clientes/import/csv", {
    method: "POST",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    },
    body: form
  });
}

test("bulk template route devuelve 403 sin permiso CLIENTS_EXPORT_TEMPLATE", async () => {
  const req = buildGetRequest("http://localhost/api/admin/clientes/import/template?type=PERSON&format=xlsx", {
    tenantId: "tenant-alpha",
    permissions: [],
    roles: ["STAFF"]
  });

  const res = await getTemplate(req);
  assert.equal(res.status, 403);
});

test("bulk export data route devuelve 403 sin permiso CLIENTS_EXPORT_DATA", async () => {
  const req = buildGetRequest("http://localhost/api/admin/clientes/export/csv?type=PERSON", {
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_EXPORT_TEMPLATE"],
    roles: ["STAFF"]
  });

  const res = await getExportCsv(req);
  assert.equal(res.status, 403);
});

test("bulk import process devuelve 403 sin permiso CLIENTS_IMPORT_PROCESS", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*",
    "Ana;Torres;1234567890101;+50255550000"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE"],
    roles: ["OPS"],
    mode: "process",
    csv
  });

  const res = await postImport(req);
  assert.equal(res.status, 403);
});

test("bulk import process: duplicado exacto se marca SKIP y se reporta", async () => {
  const csv = [
    "sep=;",
    "PrimerNombre*;PrimerApellido*;NumeroDocumento*;TelefonoPrincipal*",
    "Ana;Torres;1234567890101;+50255550000"
  ].join("\n");

  const req = buildImportRequest({
    tenantId: "tenant-alpha",
    permissions: ["CLIENTS_IMPORT_ANALYZE", "CLIENTS_IMPORT_PROCESS"],
    roles: ["OPS"],
    mode: "process",
    csv
  });

  const clientCatalogItemDelegate = (prisma as any).clientCatalogItem;
  const clientProfileDelegate = (prisma as any).clientProfile;

  assert.ok(clientCatalogItemDelegate?.findFirst, "clientCatalogItem.findFirst delegate missing");
  assert.ok(clientProfileDelegate?.findFirst, "clientProfile.findFirst delegate missing");

  const originalCatalogFindFirst = clientCatalogItemDelegate.findFirst;
  const originalClientProfileFindFirst = clientProfileDelegate.findFirst;

  clientCatalogItemDelegate.findFirst = async () => ({ id: "status-active" });
  clientProfileDelegate.findFirst = async (args: {
    where?: {
      dpi?: string;
      phone?: string;
      email?: string;
    };
  }) => {
    const where = args?.where || {};

    if (where.dpi === "1234567890101") {
      return {
        id: "client-existing-1",
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

    if (where.phone || where.email) {
      return null;
    }

    return null;
  };

  try {
    const res = await postImport(req);
    assert.equal(res.status, 200);

    const payload = (await res.json()) as {
      ok: boolean;
      summary: {
        created: number;
        updated: number;
        skipped: number;
        errors: number;
        duplicates: number;
      };
      duplicatesPreview: Array<{ field: string; suggestedAction: string }>;
    };

    assert.equal(payload.ok, true);
    assert.equal(payload.summary.created, 0);
    assert.equal(payload.summary.updated, 0);
    assert.equal(payload.summary.skipped, 1);
    assert.equal(payload.summary.errors, 0);
    assert.equal(payload.summary.duplicates, 1);
    assert.equal(payload.duplicatesPreview[0]?.field, "document_number");
    assert.equal(payload.duplicatesPreview[0]?.suggestedAction, "SKIP");
  } finally {
    clientCatalogItemDelegate.findFirst = originalCatalogFindFirst;
    clientProfileDelegate.findFirst = originalClientProfileFindFirst;
  }
});
