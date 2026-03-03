/**
 * Backfill/re-sync PersonCompanyLink from ClientAffiliation (entityType=COMPANY).
 *
 * Usage:
 *   pnpm tsx scripts/clients/backfill-person-company-links.ts
 *   pnpm tsx scripts/clients/backfill-person-company-links.ts --dry-run
 */

import { ClientAffiliationStatus, ClientProfileType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const affiliations = await prisma.clientAffiliation.findMany({
    where: {
      entityType: ClientProfileType.COMPANY
    },
    select: {
      tenantId: true,
      personClientId: true,
      entityClientId: true,
      role: true,
      isPrimaryPayer: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  let processed = 0;
  let upserts = 0;
  let skipped = 0;

  for (const row of affiliations) {
    processed += 1;

    const [person, company] = await Promise.all([
      prisma.clientProfile.findUnique({
        where: { id: row.personClientId },
        select: { id: true, type: true, tenantId: true, deletedAt: true }
      }),
      prisma.clientProfile.findUnique({
        where: { id: row.entityClientId },
        select: { id: true, type: true, tenantId: true, deletedAt: true }
      })
    ]);

    if (!person || !company) {
      skipped += 1;
      continue;
    }
    if (person.deletedAt || company.deletedAt) {
      skipped += 1;
      continue;
    }
    if (person.type !== ClientProfileType.PERSON || company.type !== ClientProfileType.COMPANY) {
      skipped += 1;
      continue;
    }
    if (person.tenantId !== company.tenantId || person.tenantId !== row.tenantId) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      upserts += 1;
      continue;
    }

    await prisma.personCompanyLink.upsert({
      where: {
        personId_companyId: {
          personId: row.personClientId,
          companyId: row.entityClientId
        }
      },
      update: {
        relationType: row.role?.trim() || null,
        isPrimary: Boolean(row.isPrimaryPayer),
        isActive: row.status !== ClientAffiliationStatus.INACTIVE && row.deletedAt === null,
        startAt: row.createdAt,
        endAt:
          row.status === ClientAffiliationStatus.INACTIVE || row.deletedAt
            ? row.updatedAt ?? row.createdAt
            : null,
        deletedAt: row.deletedAt,
        updatedAt: new Date()
      },
      create: {
        tenantId: row.tenantId,
        personId: row.personClientId,
        companyId: row.entityClientId,
        relationType: row.role?.trim() || null,
        isPrimary: Boolean(row.isPrimaryPayer),
        isActive: row.status !== ClientAffiliationStatus.INACTIVE && row.deletedAt === null,
        startAt: row.createdAt,
        endAt:
          row.status === ClientAffiliationStatus.INACTIVE || row.deletedAt
            ? row.updatedAt ?? row.createdAt
            : null,
        deletedAt: row.deletedAt
      }
    });

    upserts += 1;
  }

  if (!dryRun) {
    const rowsWithActive = await prisma.personCompanyLink.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, personId: true, isPrimary: true, createdAt: true }
    });

    const grouped = new Map<string, Array<(typeof rowsWithActive)[number]>>();
    for (const row of rowsWithActive) {
      const list = grouped.get(row.personId) || [];
      list.push(row);
      grouped.set(row.personId, list);
    }

    for (const [, list] of grouped.entries()) {
      if (!list.length) continue;
      const sorted = [...list].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
      const hasPrimary = sorted.some((item) => item.isPrimary);
      const keepId = hasPrimary ? sorted.find((item) => item.isPrimary)?.id : sorted[0]?.id;
      if (!keepId) continue;

      await prisma.personCompanyLink.updateMany({
        where: {
          personId: sorted[0]!.personId,
          isActive: true,
          deletedAt: null,
          id: { not: keepId },
          isPrimary: true
        },
        data: { isPrimary: false, updatedAt: new Date() }
      });

      await prisma.personCompanyLink.update({
        where: { id: keepId },
        data: { isPrimary: true, updatedAt: new Date() }
      });
    }
  }

  console.info(
    `[backfill-person-company-links] dryRun=${dryRun} processed=${processed} upserts=${upserts} skipped=${skipped}`
  );
}

main()
  .catch((error) => {
    console.error("[backfill-person-company-links] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
