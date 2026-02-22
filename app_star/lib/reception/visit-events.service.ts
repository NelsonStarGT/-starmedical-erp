import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateVisitEventInput } from "@/lib/reception/types";

export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export async function createVisitEvent(
  input: CreateVisitEventInput,
  client: PrismaClientOrTx = prisma
) {
  if (!input.visitId) throw new Error("visitId es requerido para crear VisitEvent.");

  return client.visitEvent.create({
    data: {
      visitId: input.visitId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      area: input.area ?? null,
      queueId: input.queueId ?? null,
      queueItemId: input.queueItemId ?? null,
      serviceRequestId: input.serviceRequestId ?? null,
      operationalIncidentId: input.operationalIncidentId ?? null,
      note: input.reason ?? null,
      metadata: input.metadata ?? undefined,
      actorUserId: input.actorUserId ?? null
    }
  });
}
