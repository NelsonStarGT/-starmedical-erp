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
 */

import { ClientProfileType, PrismaClient } from "@prisma/client";
import {
  assignSequentialClientCodes,
  normalizeClientCode,
  resolveClientCodePrefix
} from "../lib/clients/clientCode";

const prisma = new PrismaClient();

const CLIENT_TYPES: ClientProfileType[] = [
  ClientProfileType.PERSON,
  ClientProfileType.COMPANY,
  ClientProfileType.INSTITUTION,
  ClientProfileType.INSURER
];

async function backfillTenantType(tenantId: string, clientType: ClientProfileType) {
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
      const allocation = assignSequentialClientCodes({
        prefix: resolveClientCodePrefix(clientType),
        existingCodes,
        count: 0
      });
      await tx.clientSequenceCounter.upsert({
        where: {
          tenantId_clientType: {
            tenantId,
            clientType
          }
        },
        update: {
          prefix: resolveClientCodePrefix(clientType),
          nextNumber: allocation.nextNumber
        },
        create: {
          tenantId,
          clientType,
          prefix: resolveClientCodePrefix(clientType),
          nextNumber: allocation.nextNumber
        }
      });

      return { assigned: 0, nextNumber: allocation.nextNumber };
    }

    const allocation = assignSequentialClientCodes({
      prefix: resolveClientCodePrefix(clientType),
      existingCodes,
      count: pendingRows.length
    });

    for (let index = 0; index < pendingRows.length; index += 1) {
      const row = pendingRows[index];
      const code = allocation.codes[index];
      if (!row || !code) continue;
      await tx.clientProfile.update({
        where: { id: row.id },
        data: { clientCode: code }
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
        nextNumber: allocation.nextNumber
      },
      create: {
        tenantId,
        clientType,
        prefix: resolveClientCodePrefix(clientType),
        nextNumber: allocation.nextNumber
      }
    });

    return {
      assigned: allocation.codes.length,
      nextNumber: allocation.nextNumber
    };
  });
}

async function run() {
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

  if (!tenantIds.length) {
    console.info("[backfill-client-codes] no hay clientes para procesar");
    return;
  }

  let totalAssigned = 0;

  for (const tenantId of tenantIds) {
    for (const clientType of CLIENT_TYPES) {
      const result = await backfillTenantType(tenantId, clientType);
      totalAssigned += result.assigned;
      console.info(
        `[backfill-client-codes] tenant=${tenantId} type=${clientType} assigned=${result.assigned} next=${result.nextNumber}`
      );
    }
  }

  console.info(`[backfill-client-codes] totalAssigned=${totalAssigned}`);
}

run()
  .catch((error) => {
    console.error("[backfill-client-codes] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
