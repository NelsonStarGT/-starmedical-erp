import "server-only";

import type { OperationalArea, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import {
  RECEPTION_SLA_RECOMMENDED,
  buildAreaThresholdMap,
  buildBaseThresholds,
  sanitizeSlaAreaDraft,
  sanitizeSlaSimpleDraft,
  type ReceptionSlaAreaDraft,
  type ReceptionSlaPolicy,
  type ReceptionSlaSimpleDraft
} from "@/lib/reception/sla-config";

const RECEPTION_SLA_ENTITY_TYPE = "RECEPTION_SLA_CONFIG";

type SlaConfigWithAreas = Prisma.ReceptionSlaConfigGetPayload<{
  include: { areaConfigs: true };
}>;

function defaultPolicy(branchId: string): ReceptionSlaPolicy {
  const thresholds = buildBaseThresholds(RECEPTION_SLA_RECOMMENDED);
  return {
    branchId,
    applyToAllAreas: RECEPTION_SLA_RECOMMENDED.applyToAllAreas,
    thresholds,
    areaThresholds: buildAreaThresholdMap({
      applyToAllAreas: RECEPTION_SLA_RECOMMENDED.applyToAllAreas,
      base: thresholds,
      areaOverrides: []
    }),
    updatedAt: null
  };
}

function toAreaDrafts(config: SlaConfigWithAreas | null): ReceptionSlaAreaDraft[] {
  if (!config) return [];
  return config.areaConfigs
    .filter((row) => row.priority === null)
    .map((row) => ({
      area: row.area,
      waitingWarningMin: row.waitingWarningMin,
      waitingCriticalMin: row.waitingCriticalMin,
      inServiceMaxMin: row.inServiceMaxMin
    }));
}

function toPolicy(branchId: string, config: SlaConfigWithAreas | null): ReceptionSlaPolicy {
  if (!config) return defaultPolicy(branchId);

  const thresholds = buildBaseThresholds({
    waitingWarningMin: config.waitingWarningMin,
    waitingCriticalMin: config.waitingCriticalMin,
    inServiceMaxMin: config.inServiceMaxMin,
    calledWarningMin: config.calledWarningMin,
    pausedWarningMin: config.pausedWarningMin
  });

  const areaOverrides = toAreaDrafts(config);

  return {
    branchId,
    applyToAllAreas: config.applyToAllAreas,
    thresholds,
    areaThresholds: buildAreaThresholdMap({
      applyToAllAreas: config.applyToAllAreas,
      base: thresholds,
      areaOverrides
    }),
    updatedAt: config.updatedAt.toISOString()
  };
}

export async function getReceptionSlaPolicy(branchId: string): Promise<ReceptionSlaPolicy> {
  try {
    const config = await prisma.receptionSlaConfig.findUnique({
      where: { branchId },
      include: { areaConfigs: true }
    });
    return toPolicy(branchId, config);
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaMissingTableError(error)) {
      warnDevMissingTable("Reception.getReceptionSlaPolicy", error);
      return defaultPolicy(branchId);
    }
    throw error;
  }
}

export async function saveReceptionSlaSimpleConfig(input: {
  branchId: string;
  userId: string;
  draft: ReceptionSlaSimpleDraft;
}) {
  const draft = sanitizeSlaSimpleDraft(input.draft);

  const beforePolicy = await getReceptionSlaPolicy(input.branchId);

  const config = await prisma.receptionSlaConfig.upsert({
    where: { branchId: input.branchId },
    update: {
      applyToAllAreas: draft.applyToAllAreas,
      waitingWarningMin: draft.waitingWarningMin,
      waitingCriticalMin: draft.waitingCriticalMin,
      inServiceMaxMin: draft.inServiceMaxMin,
      updatedByUserId: input.userId
    },
    create: {
      branchId: input.branchId,
      applyToAllAreas: draft.applyToAllAreas,
      waitingWarningMin: draft.waitingWarningMin,
      waitingCriticalMin: draft.waitingCriticalMin,
      inServiceMaxMin: draft.inServiceMaxMin,
      calledWarningMin: RECEPTION_SLA_RECOMMENDED.calledWarningMin,
      pausedWarningMin: RECEPTION_SLA_RECOMMENDED.pausedWarningMin,
      updatedByUserId: input.userId
    },
    include: { areaConfigs: true }
  });

  return {
    entityType: RECEPTION_SLA_ENTITY_TYPE,
    before: beforePolicy,
    after: toPolicy(input.branchId, config)
  };
}

export async function saveReceptionSlaAdvancedConfig(input: {
  branchId: string;
  userId: string;
  applyToAllAreas: boolean;
  base: ReceptionSlaSimpleDraft;
  areaRows: ReceptionSlaAreaDraft[];
}) {
  const base = sanitizeSlaSimpleDraft({
    applyToAllAreas: input.applyToAllAreas,
    waitingWarningMin: input.base.waitingWarningMin,
    waitingCriticalMin: input.base.waitingCriticalMin,
    inServiceMaxMin: input.base.inServiceMaxMin
  });

  const sanitizedRows = input.areaRows.map((row) => sanitizeSlaAreaDraft(row));

  const beforePolicy = await getReceptionSlaPolicy(input.branchId);

  const config = await prisma.$transaction(async (tx) => {
    const upserted = await tx.receptionSlaConfig.upsert({
      where: { branchId: input.branchId },
      update: {
        applyToAllAreas: base.applyToAllAreas,
        waitingWarningMin: base.waitingWarningMin,
        waitingCriticalMin: base.waitingCriticalMin,
        inServiceMaxMin: base.inServiceMaxMin,
        updatedByUserId: input.userId
      },
      create: {
        branchId: input.branchId,
        applyToAllAreas: base.applyToAllAreas,
        waitingWarningMin: base.waitingWarningMin,
        waitingCriticalMin: base.waitingCriticalMin,
        inServiceMaxMin: base.inServiceMaxMin,
        calledWarningMin: RECEPTION_SLA_RECOMMENDED.calledWarningMin,
        pausedWarningMin: RECEPTION_SLA_RECOMMENDED.pausedWarningMin,
        updatedByUserId: input.userId
      },
      select: { id: true }
    });

    await tx.receptionSlaAreaConfig.deleteMany({
      where: { slaConfigId: upserted.id, priority: null }
    });

    if (sanitizedRows.length > 0) {
      await tx.receptionSlaAreaConfig.createMany({
        data: sanitizedRows.map((row) => ({
          slaConfigId: upserted.id,
          area: row.area,
          priority: null,
          waitingWarningMin: row.waitingWarningMin,
          waitingCriticalMin: row.waitingCriticalMin,
          inServiceMaxMin: row.inServiceMaxMin,
          calledWarningMin: null,
          pausedWarningMin: null
        }))
      });
    }

    return tx.receptionSlaConfig.findUnique({
      where: { id: upserted.id },
      include: { areaConfigs: true }
    });
  });

  return {
    entityType: RECEPTION_SLA_ENTITY_TYPE,
    before: beforePolicy,
    after: toPolicy(input.branchId, config)
  };
}

export async function restoreReceptionSlaRecommended(input: { branchId: string; userId: string }) {
  return saveReceptionSlaSimpleConfig({
    branchId: input.branchId,
    userId: input.userId,
    draft: {
      applyToAllAreas: RECEPTION_SLA_RECOMMENDED.applyToAllAreas,
      waitingWarningMin: RECEPTION_SLA_RECOMMENDED.waitingWarningMin,
      waitingCriticalMin: RECEPTION_SLA_RECOMMENDED.waitingCriticalMin,
      inServiceMaxMin: RECEPTION_SLA_RECOMMENDED.inServiceMaxMin
    }
  });
}

export const RECEPTION_SLA_AUDIT_ENTITY_TYPE = RECEPTION_SLA_ENTITY_TYPE;
