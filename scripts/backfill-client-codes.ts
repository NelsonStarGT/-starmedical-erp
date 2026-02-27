#!/usr/bin/env tsx
/**
 * Backfill de correlativos para clientes existentes.
 *
 * Asigna clientCode por tenant + tipo usando prefijos:
 * - PERSON: C
 * - COMPANY: E
 * - INSTITUTION: I
 * - INSURER: A
 *
 * Uso:
 *   pnpm tsx scripts/backfill-client-codes.ts
 *   pnpm tsx scripts/backfill-client-codes.ts --dry-run
 *   pnpm tsx scripts/backfill-client-codes.ts --tenant tenant-demo
 *   pnpm tsx scripts/backfill-client-codes.ts --type PERSON
 */

import { ClientProfileType, PrismaClient } from "@prisma/client";
import {
  CLIENT_CODE_PADDING,
  normalizeClientCode,
  resolveClientCodePrefix
} from "../lib/clients/clientCode";
import { buildClientCodeBackfillPlan } from "../lib/clients/clientCodeBackfill";

const prisma = new PrismaClient();

const CLIENT_TYPES: ClientProfileType[] = [
  ClientProfileType.PERSON,
  ClientProfileType.COMPANY,
  ClientProfileType.INSTITUTION,
  ClientProfileType.INSURER
];

type CliOptions = {
  dryRun: boolean;
  tenantId: string | null;
  clientType: ClientProfileType | null;
};

function normalizeClientType(raw: string | null | undefined): ClientProfileType | null {
  if (!raw) return null;
  const candidate = raw.trim().toUpperCase();
  if (candidate === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (candidate === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (candidate === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (candidate === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    tenantId: null,
    clientType: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;

    if (token === "--dry-run" || token === "-n") {
      options.dryRun = true;
      continue;
    }

    if (token === "--tenant" || token === "-t") {
      options.tenantId = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (token.startsWith("--tenant=")) {
      options.tenantId = token.slice("--tenant=".length).trim() || null;
      continue;
    }

    if (token === "--type") {
      options.clientType = normalizeClientType(argv[index + 1] ?? null);
      index += 1;
      continue;
    }

    if (token.startsWith("--type=")) {
      options.clientType = normalizeClientType(token.slice("--type=".length));
      continue;
    }
  }

  return options;
}

async function backfillTenantType(
  tenantId: string,
  clientType: ClientProfileType,
  options: { dryRun: boolean }
) {
  return prisma.$transaction(async (tx) => {
    const existingRows = await tx.clientProfile.findMany({
      where: {
        tenantId,
        type: clientType,
        clientCode: { not: null }
      },
      select: {
        clientCode: true
      }
    });

    const existingCodes = existingRows
      .map((row) => normalizeClientCode(row.clientCode))
      .filter((value): value is string => Boolean(value));

    const pendingRows = await tx.clientProfile.findMany({
      where: {
        tenantId,
        type: clientType,
        OR: [{ clientCode: null }, { clientCode: "" }]
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true
      }
    });

    if (!pendingRows.length) {
      const plan = buildClientCodeBackfillPlan({
        clientType,
        existingCodes,
        pendingClientIds: [],
        minDigits: CLIENT_CODE_PADDING
      });
      if (!options.dryRun) {
        await tx.clientSequenceCounter.upsert({
          where: {
            tenantId_clientType: {
              tenantId,
              clientType
            }
          },
          update: {
            prefix: resolveClientCodePrefix(clientType),
            nextNumber: plan.nextNumber
          },
          create: {
            tenantId,
            clientType,
            prefix: resolveClientCodePrefix(clientType),
            nextNumber: plan.nextNumber
          }
        });
      }

      return { assigned: 0, nextNumber: plan.nextNumber, planned: 0 };
    }

    const plan = buildClientCodeBackfillPlan({
      clientType,
      existingCodes,
      pendingClientIds: pendingRows.map((row) => row.id),
      minDigits: CLIENT_CODE_PADDING
    });

    if (!options.dryRun) {
      for (const update of plan.updates) {
        await tx.clientProfile.update({
          where: { id: update.clientId },
          data: { clientCode: update.clientCode }
        });
      }

      await tx.clientSequenceCounter.upsert({
        where: {
          tenantId_clientType: {
            tenantId,
            clientType
          }
        },
        update: {
          prefix: resolveClientCodePrefix(clientType),
          nextNumber: plan.nextNumber
        },
        create: {
          tenantId,
          clientType,
          prefix: resolveClientCodePrefix(clientType),
          nextNumber: plan.nextNumber
        }
      });
    }

    return {
      assigned: options.dryRun ? 0 : plan.updates.length,
      planned: plan.updates.length,
      nextNumber: plan.nextNumber
    };
  });
}

async function run() {
  const options = parseCliOptions(process.argv.slice(2));
  const targetTypes = options.clientType ? [options.clientType] : CLIENT_TYPES;

  const tenants = await prisma.clientProfile.findMany({
    select: { tenantId: true },
    distinct: ["tenantId"]
  });

  const tenantIds = Array.from(
    new Set(
      tenants
        .map((row) => (row.tenantId || "").trim())
        .filter(Boolean)
    )
  );

  const targetTenantIds = options.tenantId ? tenantIds.filter((tenantId) => tenantId === options.tenantId) : tenantIds;

  if (!targetTenantIds.length) {
    console.info("[backfill-client-codes] no hay clientes para procesar");
    return;
  }

  let totalAssigned = 0;
  let totalPlanned = 0;

  if (options.dryRun) {
    console.info("[backfill-client-codes] modo dry-run activo: no se escribirán cambios.");
  }

  for (const tenantId of targetTenantIds) {
    for (const clientType of targetTypes) {
      const result = await backfillTenantType(tenantId, clientType, { dryRun: options.dryRun });
      totalAssigned += result.assigned;
      totalPlanned += result.planned;
      console.info(
        `[backfill-client-codes] tenant=${tenantId} type=${clientType} planned=${result.planned} assigned=${result.assigned} next=${result.nextNumber}`
      );
    }
  }

  console.info(
    `[backfill-client-codes] completed dryRun=${options.dryRun ? "true" : "false"} totalPlanned=${totalPlanned} totalAssigned=${totalAssigned}`
  );
}

run()
  .catch((error) => {
    console.error("[backfill-client-codes] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
