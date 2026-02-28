import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ClientAffiliationStatus, ClientProfileType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveAffiliationEffectiveStatus } from "@/lib/clients/affiliations";

type TenantAccumulator = {
  clientsTotal: number;
  missingPrimaryLocation: number;
  primaryLocationMissingCountry: number;
  peopleMissingDoc: number;
  orgsMissingNit: number;
  missingPrimaryPhone: number;
  missingPrimaryEmail: number;
  pendingVerifyAffiliations: number;
};

type DuplicateSummary = {
  buckets: number;
  impactedClients: number;
};

function normalizeText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : null;
}

function normalizeDigits(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  return digits.length ? digits : null;
}

function addDupValue(
  map: Map<string, Set<string>>,
  tenantId: string,
  rawValue: string | null | undefined,
  clientId: string,
  normalize: (value: string | null | undefined) => string | null = normalizeText
) {
  const value = normalize(rawValue);
  if (!value) return;
  const key = `${tenantId}::${value}`;
  const current = map.get(key);
  if (current) {
    current.add(clientId);
    return;
  }
  map.set(key, new Set([clientId]));
}

function summarizeDuplicateMap(map: Map<string, Set<string>>): DuplicateSummary {
  let buckets = 0;
  let impactedClients = 0;
  for (const clientIds of map.values()) {
    if (clientIds.size <= 1) continue;
    buckets += 1;
    impactedClients += clientIds.size;
  }
  return { buckets, impactedClients };
}

function increment(acc: Map<string, TenantAccumulator>, tenantId: string, key: keyof TenantAccumulator, delta = 1) {
  const current = acc.get(tenantId) ?? {
    clientsTotal: 0,
    missingPrimaryLocation: 0,
    primaryLocationMissingCountry: 0,
    peopleMissingDoc: 0,
    orgsMissingNit: 0,
    missingPrimaryPhone: 0,
    missingPrimaryEmail: 0,
    pendingVerifyAffiliations: 0
  };
  current[key] += delta;
  acc.set(tenantId, current);
}

async function main() {
  const now = new Date();
  const generatedAt = now.toISOString();
  const activeClients = await prisma.clientProfile.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      type: true,
      dpi: true,
      nit: true,
      phone: true,
      email: true
    }
  });

  const [primaryLocationRows, primaryPhoneRows, primaryEmailRows, identifierRows, affiliations] = await Promise.all([
    prisma.clientLocation.findMany({
      where: {
        isActive: true,
        isPrimary: true,
        client: { deletedAt: null }
      },
      select: {
        clientId: true,
        geoCountryId: true
      }
    }),
    prisma.clientPhone.findMany({
      where: {
        isActive: true,
        isPrimary: true,
        client: { deletedAt: null }
      },
      select: {
        clientId: true,
        e164: true,
        number: true,
        client: {
          select: {
            tenantId: true
          }
        }
      }
    }),
    prisma.clientEmail.findMany({
      where: {
        isActive: true,
        isPrimary: true,
        client: { deletedAt: null }
      },
      select: {
        clientId: true,
        valueNormalized: true,
        valueRaw: true,
        client: {
          select: {
            tenantId: true
          }
        }
      }
    }),
    prisma.clientIdentifier.findMany({
      where: {
        isActive: true,
        client: { deletedAt: null }
      },
      select: {
        clientId: true
      }
    }),
    prisma.clientAffiliation.findMany({
      where: {
        deletedAt: null,
        status: { not: ClientAffiliationStatus.INACTIVE }
      },
      select: {
        tenantId: true,
        status: true,
        lastVerifiedAt: true
      }
    })
  ]);

  const tenantAcc = new Map<string, TenantAccumulator>();
  const clientById = new Map(activeClients.map((client) => [client.id, client]));
  const primaryLocationByClient = new Map(primaryLocationRows.map((row) => [row.clientId, row]));
  const hasPrimaryPhone = new Set(primaryPhoneRows.map((row) => row.clientId));
  const hasPrimaryEmail = new Set(primaryEmailRows.map((row) => row.clientId));
  const hasIdentifier = new Set(identifierRows.map((row) => row.clientId));

  for (const client of activeClients) {
    increment(tenantAcc, client.tenantId, "clientsTotal");

    const primaryLocation = primaryLocationByClient.get(client.id);
    if (!primaryLocation) {
      increment(tenantAcc, client.tenantId, "missingPrimaryLocation");
    } else if (!normalizeText(primaryLocation.geoCountryId)) {
      increment(tenantAcc, client.tenantId, "primaryLocationMissingCountry");
    }

    const hasPhoneProfile = Boolean(normalizeText(client.phone));
    if (!hasPrimaryPhone.has(client.id) && !hasPhoneProfile) {
      increment(tenantAcc, client.tenantId, "missingPrimaryPhone");
    }

    const hasEmailProfile = Boolean(normalizeText(client.email));
    if (!hasPrimaryEmail.has(client.id) && !hasEmailProfile) {
      increment(tenantAcc, client.tenantId, "missingPrimaryEmail");
    }

    if (client.type === ClientProfileType.PERSON) {
      const hasDpi = Boolean(normalizeText(client.dpi));
      if (!hasDpi && !hasIdentifier.has(client.id)) {
        increment(tenantAcc, client.tenantId, "peopleMissingDoc");
      }
    } else {
      const hasNit = Boolean(normalizeText(client.nit));
      if (!hasNit) {
        increment(tenantAcc, client.tenantId, "orgsMissingNit");
      }
    }
  }

  for (const affiliation of affiliations) {
    const effectiveStatus = resolveAffiliationEffectiveStatus({
      status: affiliation.status,
      lastVerifiedAt: affiliation.lastVerifiedAt,
      now
    });
    if (effectiveStatus === ClientAffiliationStatus.PENDING_VERIFY) {
      increment(tenantAcc, affiliation.tenantId, "pendingVerifyAffiliations");
    }
  }

  const dpiDupMap = new Map<string, Set<string>>();
  const nitDupMap = new Map<string, Set<string>>();
  const phoneDupMap = new Map<string, Set<string>>();
  const emailDupMap = new Map<string, Set<string>>();

  for (const client of activeClients) {
    addDupValue(dpiDupMap, client.tenantId, client.type === ClientProfileType.PERSON ? client.dpi : null, client.id);
    addDupValue(
      nitDupMap,
      client.tenantId,
      client.type === ClientProfileType.COMPANY
      || client.type === ClientProfileType.INSTITUTION
      || client.type === ClientProfileType.INSURER
        ? client.nit
        : null,
      client.id
    );
    addDupValue(phoneDupMap, client.tenantId, client.phone, client.id, normalizeDigits);
    addDupValue(emailDupMap, client.tenantId, client.email, client.id, (value) => normalizeText(value)?.toLowerCase() ?? null);
  }

  for (const row of primaryPhoneRows) {
    const tenantId = row.client.tenantId;
    const candidate = normalizeDigits(row.e164) ?? normalizeDigits(row.number);
    addDupValue(phoneDupMap, tenantId, candidate, row.clientId, normalizeDigits);
  }

  for (const row of primaryEmailRows) {
    const tenantId = row.client.tenantId;
    const candidate = normalizeText(row.valueNormalized) ?? normalizeText(row.valueRaw);
    addDupValue(emailDupMap, tenantId, candidate, row.clientId, (value) => normalizeText(value)?.toLowerCase() ?? null);
  }

  const totals = Array.from(tenantAcc.values()).reduce(
    (acc, row) => ({
      clientsTotal: acc.clientsTotal + row.clientsTotal,
      missingPrimaryLocation: acc.missingPrimaryLocation + row.missingPrimaryLocation,
      primaryLocationMissingCountry: acc.primaryLocationMissingCountry + row.primaryLocationMissingCountry,
      peopleMissingDoc: acc.peopleMissingDoc + row.peopleMissingDoc,
      orgsMissingNit: acc.orgsMissingNit + row.orgsMissingNit,
      missingPrimaryPhone: acc.missingPrimaryPhone + row.missingPrimaryPhone,
      missingPrimaryEmail: acc.missingPrimaryEmail + row.missingPrimaryEmail,
      pendingVerifyAffiliations: acc.pendingVerifyAffiliations + row.pendingVerifyAffiliations
    }),
    {
      clientsTotal: 0,
      missingPrimaryLocation: 0,
      primaryLocationMissingCountry: 0,
      peopleMissingDoc: 0,
      orgsMissingNit: 0,
      missingPrimaryPhone: 0,
      missingPrimaryEmail: 0,
      pendingVerifyAffiliations: 0
    }
  );

  const duplicateSummary = {
    dpi: summarizeDuplicateMap(dpiDupMap),
    nit: summarizeDuplicateMap(nitDupMap),
    phone: summarizeDuplicateMap(phoneDupMap),
    email: summarizeDuplicateMap(emailDupMap)
  };

  const tenantRows = Array.from(tenantAcc.entries())
    .map(([tenantId, row]) => ({ tenantId, ...row }))
    .sort((left, right) => {
      const leftIssues =
        left.missingPrimaryLocation
        + left.primaryLocationMissingCountry
        + left.peopleMissingDoc
        + left.orgsMissingNit
        + left.missingPrimaryPhone
        + left.missingPrimaryEmail
        + left.pendingVerifyAffiliations;
      const rightIssues =
        right.missingPrimaryLocation
        + right.primaryLocationMissingCountry
        + right.peopleMissingDoc
        + right.orgsMissingNit
        + right.missingPrimaryPhone
        + right.missingPrimaryEmail
        + right.pendingVerifyAffiliations;
      return rightIssues - leftIssues;
    });

  const lines: string[] = [
    "# CLIENTS DATA INTEGRITY REPORT",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "## Global counts",
    "",
    `- Clientes activos: ${totals.clientsTotal}`,
    `- Clientes sin ubicación principal: ${totals.missingPrimaryLocation}`,
    `- Ubicación principal sin geoCountryId: ${totals.primaryLocationMissingCountry}`,
    `- Personas sin DPI/identificador activo: ${totals.peopleMissingDoc}`,
    `- Empresas/Instituciones/Aseguradoras sin NIT: ${totals.orgsMissingNit}`,
    `- Clientes sin teléfono principal: ${totals.missingPrimaryPhone}`,
    `- Clientes sin email principal: ${totals.missingPrimaryEmail}`,
    `- Afiliaciones en PENDING_VERIFY efectivo: ${totals.pendingVerifyAffiliations}`,
    "",
    "## Potential duplicates",
    "",
    `- DPI: ${duplicateSummary.dpi.buckets} buckets / ${duplicateSummary.dpi.impactedClients} clientes`,
    `- NIT: ${duplicateSummary.nit.buckets} buckets / ${duplicateSummary.nit.impactedClients} clientes`,
    `- Teléfono: ${duplicateSummary.phone.buckets} buckets / ${duplicateSummary.phone.impactedClients} clientes`,
    `- Email: ${duplicateSummary.email.buckets} buckets / ${duplicateSummary.email.impactedClients} clientes`,
    "",
    "## By tenant (issue counts)",
    "",
    "| Tenant | Clientes | Sin ubicación principal | Ubicación sin país | Personas sin doc | Orgs sin NIT | Sin teléfono principal | Sin email principal | Afiliaciones pending verify |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|"
  ];

  for (const row of tenantRows) {
    lines.push(
      `| ${row.tenantId} | ${row.clientsTotal} | ${row.missingPrimaryLocation} | ${row.primaryLocationMissingCountry} | ${row.peopleMissingDoc} | ${row.orgsMissingNit} | ${row.missingPrimaryPhone} | ${row.missingPrimaryEmail} | ${row.pendingVerifyAffiliations} |`
    );
  }

  lines.push("", "## Notes", "", "- Scope: clientes activos (`deletedAt IS NULL`).");
  lines.push("- Duplicados potenciales se calculan por tenant.");
  lines.push("- Teléfono se normaliza por dígitos; email se normaliza en minúsculas.");
  lines.push("- PENDING_VERIFY efectivo usa regla actual de `resolveAffiliationEffectiveStatus`.");

  const outputPath = path.join(process.cwd(), "docs", "CLIENTS_DATA_INTEGRITY_REPORT.md");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");

  console.log("[clients:audit:data] Report generated:", outputPath);
  console.log(
    JSON.stringify(
      {
        totals,
        duplicates: duplicateSummary,
        tenants: tenantRows.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[clients:audit:data] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
