import "server-only";

import {
  OperationalArea,
  QueueStatus,
  VisitEventType,
  VisitPriority,
  QueueItemStatus,
  VisitStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_QUEUE_ITEM_STATUSES,
  assertQueueItemTransition,
  assertVisitCanEnqueue
} from "@/lib/reception/queue-guards";
import { RECEPTION_AREA_LABELS } from "@/lib/reception/constants";
import { createVisitEvent, type PrismaClientOrTx } from "@/lib/reception/visit-events.service";
import { transitionVisitStatus } from "@/lib/reception/visit.service";
import { generateNextTicket, getTicketDateKey } from "@/lib/reception/ticketing.service";

const PLACEHOLDER_TICKET_PREFIX = "TMP-";

export type EnsureQueueInput = {
  siteId: string;
  area: OperationalArea;
};

export type EnqueueVisitInput = {
  visitId: string;
  siteId: string;
  area: OperationalArea;
  actorUserId?: string | null;
  priorityOverride?: VisitPriority | null;
  skipStatusTransition?: boolean;
};

export type CallNextInput = {
  siteId: string;
  area: OperationalArea;
  actorUserId?: string | null;
  roomId?: string | null;
  assignedToUserId?: string | null;
};

export type QueueItemActionInput = {
  queueItemId: string;
  actorUserId?: string | null;
  reason?: string | null;
};

export type TransferQueueItemInput = {
  queueItemId: string;
  siteId: string;
  toArea: OperationalArea;
  actorUserId?: string | null;
  reason: string;
};

export type ReorderQueueInput = {
  siteId: string;
  area: OperationalArea;
  orderedQueueItemIds: string[];
  actorUserId?: string | null;
};

export type ListQueueItemsInput = {
  siteId: string;
  area: OperationalArea;
};

export type ListQueuesOverviewInput = {
  siteId: string;
};

export async function ensureQueue(input: EnsureQueueInput, client: PrismaClientOrTx = prisma) {
  const existing = await client.queue.findFirst({
    where: { siteId: input.siteId, area: input.area }
  });

  if (!existing) {
    return client.queue.create({
      data: {
        siteId: input.siteId,
        area: input.area,
        status: QueueStatus.ACTIVE,
        openedAt: new Date()
      }
    });
  }

  if (existing.status !== QueueStatus.ACTIVE) {
    return client.queue.update({
      where: { id: existing.id },
      data: {
        status: QueueStatus.ACTIVE,
        openedAt: existing.openedAt ?? new Date(),
        closedAt: null
      }
    });
  }

  return existing;
}

export async function enqueueVisit(input: EnqueueVisitInput, client: PrismaClientOrTx = prisma) {
  const now = new Date();
  const dateKey = getTicketDateKey(now);

  const run = async (tx: PrismaClientOrTx) => {
    const visit = await tx.visit.findUnique({ where: { id: input.visitId } });
    if (!visit) throw new Error("Visita no encontrada.");
    if (visit.siteId !== input.siteId) {
      throw new Error("La visita no pertenece a la sede indicada.");
    }

    if (visit.status === VisitStatus.CANCELLED || visit.status === VisitStatus.CHECKED_OUT) {
      throw new Error(`No se puede encolar una visita en estado ${visit.status}.`);
    }

    assertVisitCanEnqueue(visit.status);

    const existingItem = await tx.queueItem.findFirst({
      where: {
        visitId: visit.id,
        status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) },
        queue: {
          siteId: input.siteId,
          area: input.area
        }
      }
    });

    if (existingItem) return existingItem;

    const queue = await ensureQueue({ siteId: input.siteId, area: input.area }, tx);

    let ticketCode = visit.ticketCode;
    if (!ticketCode || ticketCode.startsWith(PLACEHOLDER_TICKET_PREFIX)) {
      ticketCode = await generateNextTicket({ siteId: input.siteId, area: input.area, date: now }, tx);
      await tx.visit.update({
        where: { id: visit.id },
        data: {
          ticketCode,
          ticketArea: input.area,
          ticketDateKey: dateKey,
          updatedByUserId: input.actorUserId ?? null
        }
      });
    }

    const priority = input.priorityOverride ?? visit.priority ?? VisitPriority.NORMAL;

    const queueItem = await tx.queueItem.create({
      data: {
        queueId: queue.id,
        visitId: visit.id,
        status: QueueItemStatus.WAITING,
        priority,
        enqueuedAt: now,
        createdByUserId: input.actorUserId ?? null,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    if (!input.skipStatusTransition && visit.status !== VisitStatus.IN_QUEUE) {
      await transitionVisitStatus(
        {
          visitId: visit.id,
          toStatus: VisitStatus.IN_QUEUE,
          actorUserId: input.actorUserId ?? null,
          reason: "Encolado"
        },
        tx
      );
    }

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.ADD_TO_QUEUE,
        actorUserId: input.actorUserId ?? null,
        area: input.area,
        queueId: queue.id,
        queueItemId: queueItem.id,
        metadata: {
          ticketCode,
          priority
        }
      },
      tx
    );

    return queueItem;
  };

  if ("$transaction" in client) {
    return client.$transaction(run);
  }

  return run(client);
}

export async function callNext(input: CallNextInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const queue = await ensureQueue({ siteId: input.siteId, area: input.area }, tx);

    const nextItem = await tx.queueItem.findFirst({
      where: {
        queueId: queue.id,
        status: QueueItemStatus.WAITING
      },
      orderBy: [
        // El orden del enum VisitPriority define la prioridad (URGENT primero).
        { priority: "asc" },
        { sequence: "asc" },
        { enqueuedAt: "asc" }
      ],
      include: {
        visit: true
      }
    });

    if (!nextItem) throw new Error("No hay turnos en espera para esta cola.");

    const updateResult = await tx.queueItem.updateMany({
      where: { id: nextItem.id, status: QueueItemStatus.WAITING },
      data: {
        status: QueueItemStatus.CALLED,
        calledAt: now,
        assignedToUserId: input.assignedToUserId ?? null,
        roomId: input.roomId ?? null,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    if (updateResult.count === 0) {
      throw new Error("El turno ya fue tomado por otro operador. Intenta nuevamente.");
    }

    const updated = await tx.queueItem.findUnique({ where: { id: nextItem.id } });
    if (!updated) throw new Error("No se pudo actualizar el turno.");

    await transitionVisitStatus(
      {
        visitId: nextItem.visitId,
        toStatus: VisitStatus.CALLED,
        actorUserId: input.actorUserId ?? null,
        reason: `Paciente llamado a ${RECEPTION_AREA_LABELS[input.area] ?? input.area}`
      },
      tx
    );

    await createVisitEvent(
      {
        visitId: nextItem.visitId,
        eventType: VisitEventType.CALL_NEXT,
        actorUserId: input.actorUserId ?? null,
        area: input.area,
        queueId: queue.id,
        queueItemId: nextItem.id,
        reason: `Paciente llamado a ${RECEPTION_AREA_LABELS[input.area] ?? input.area}`,
        metadata: {
          roomId: input.roomId ?? null,
          assignedToUserId: input.assignedToUserId ?? null,
          ticketCode: nextItem.visit?.ticketCode ?? null
        }
      },
      tx
    );

    return updated;
  });
}

export async function startServiceFromQueue(
  input: QueueItemActionInput,
  client: PrismaClientOrTx = prisma
) {
  const now = new Date();

  const run = async (tx: PrismaClientOrTx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    assertQueueItemTransition(queueItem.status, QueueItemStatus.IN_SERVICE);

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        status: QueueItemStatus.IN_SERVICE,
        startedAt: now,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    await transitionVisitStatus(
      {
        visitId: queueItem.visitId,
        toStatus: VisitStatus.IN_SERVICE,
        actorUserId: input.actorUserId ?? null,
        reason: "Atención iniciada"
      },
      tx
    );

    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.START_SERVICE,
        actorUserId: input.actorUserId ?? null,
        area: queueItem.queue.area,
        queueId: queueItem.queueId,
        queueItemId: queueItem.id,
        reason: "Atención iniciada"
      },
      tx
    );

    return updated;
  };

  if ("$transaction" in client) {
    return client.$transaction(run);
  }

  return run(client);
}

export async function completeQueueItem(
  input: QueueItemActionInput,
  client: PrismaClientOrTx = prisma
) {
  const now = new Date();

  const run = async (tx: PrismaClientOrTx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    assertQueueItemTransition(queueItem.status, QueueItemStatus.COMPLETED);

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        status: QueueItemStatus.COMPLETED,
        completedAt: now,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.QUEUE_ITEM_DONE,
        actorUserId: input.actorUserId ?? null,
        area: queueItem.queue.area,
        queueId: queueItem.queueId,
        queueItemId: queueItem.id,
        reason: input.reason?.trim()
          ? `Atención finalizada (nota: ${input.reason.trim()})`
          : "Atención finalizada"
      },
      tx
    );

    return updated;
  };

  if ("$transaction" in client) {
    return client.$transaction(run);
  }

  return run(client);
}

export async function skipQueueItem(input: QueueItemActionInput) {
  const motive = input.reason?.trim();
  if (!motive) {
    throw new Error("Motivo requerido para saltar un turno.");
  }
  return prisma.$transaction(async (tx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    assertQueueItemTransition(queueItem.status, QueueItemStatus.SKIPPED);

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        status: QueueItemStatus.SKIPPED,
        cancelledAt: new Date(),
        updatedByUserId: input.actorUserId ?? null
      }
    });

    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.SKIP_QUEUE_ITEM,
        actorUserId: input.actorUserId ?? null,
        area: queueItem.queue.area,
        queueId: queueItem.queueId,
        queueItemId: queueItem.id,
        reason: `Turno omitido (motivo: ${motive})`
      },
      tx
    );

    return updated;
  });
}

export async function pauseQueueItem(input: QueueItemActionInput) {
  const motive = input.reason?.trim();
  if (!motive) {
    throw new Error("Motivo requerido para pausar un turno.");
  }
  return prisma.$transaction(async (tx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    assertQueueItemTransition(queueItem.status, QueueItemStatus.PAUSED);

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        status: QueueItemStatus.PAUSED,
        pausedAt: new Date(),
        updatedByUserId: input.actorUserId ?? null
      }
    });

    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.QUEUE_ITEM_PAUSED,
        actorUserId: input.actorUserId ?? null,
        area: queueItem.queue.area,
        queueId: queueItem.queueId,
        queueItemId: queueItem.id,
        reason: `Atención pausada (motivo: ${motive})`
      },
      tx
    );

    return updated;
  });
}

export async function resumeQueueItem(input: QueueItemActionInput) {
  return prisma.$transaction(async (tx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    assertQueueItemTransition(queueItem.status, QueueItemStatus.IN_SERVICE);
    const now = new Date();

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        status: QueueItemStatus.IN_SERVICE,
        startedAt: queueItem.startedAt ?? now,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    const note = input.reason?.trim()
      ? `Atención reanudada (nota: ${input.reason.trim()})`
      : "Atención reanudada";
    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.QUEUE_ITEM_RESUMED,
        actorUserId: input.actorUserId ?? null,
        area: queueItem.queue.area,
        queueId: queueItem.queueId,
        queueItemId: queueItem.id,
        reason: note
      },
      tx
    );

    return updated;
  });
}

export async function transferQueueItem(input: TransferQueueItemInput) {
  const motive = input.reason?.trim();
  if (!motive) {
    throw new Error("Motivo requerido para transferir un turno.");
  }

  return prisma.$transaction(async (tx) => {
    const queueItem = await tx.queueItem.findUnique({
      where: { id: input.queueItemId },
      include: { queue: true, visit: true }
    });

    if (!queueItem) throw new Error("QueueItem no encontrado.");
    if (queueItem.queue.siteId !== input.siteId) {
      throw new Error("El turno no pertenece a la sede activa.");
    }

    const transferableStatuses: QueueItemStatus[] = [QueueItemStatus.WAITING, QueueItemStatus.CALLED, QueueItemStatus.PAUSED];
    if (!transferableStatuses.includes(queueItem.status)) {
      throw new Error("Solo se puede transferir un turno en espera, llamado o en pausa.");
    }

    if (queueItem.queue.area === input.toArea) {
      throw new Error("El turno ya está en esa área.");
    }

    const existingInTarget = await tx.queueItem.findFirst({
      where: {
        id: { not: queueItem.id },
        visitId: queueItem.visitId,
        status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) },
        queue: { siteId: input.siteId, area: input.toArea }
      },
      select: { id: true }
    });
    if (existingInTarget) {
      throw new Error("La visita ya tiene un turno activo en el área destino.");
    }

    const destinationQueue = await ensureQueue({ siteId: input.siteId, area: input.toArea }, tx);
    const now = new Date();

    const updated = await tx.queueItem.update({
      where: { id: queueItem.id },
      data: {
        queueId: destinationQueue.id,
        status: QueueItemStatus.WAITING,
        sequence: null,
        enqueuedAt: now,
        calledAt: null,
        startedAt: null,
        pausedAt: null,
        roomId: null,
        assignedToUserId: null,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    await tx.visit.update({
      where: { id: queueItem.visitId },
      data: {
        currentArea: input.toArea,
        updatedByUserId: input.actorUserId ?? null
      }
    });

    if (queueItem.visit.status !== VisitStatus.IN_QUEUE) {
      await transitionVisitStatus(
        {
          visitId: queueItem.visitId,
          toStatus: VisitStatus.IN_QUEUE,
          actorUserId: input.actorUserId ?? null,
          reason: `Transferido a ${RECEPTION_AREA_LABELS[input.toArea] ?? input.toArea}`
        },
        tx
      );
    }

    await createVisitEvent(
      {
        visitId: queueItem.visitId,
        eventType: VisitEventType.QUEUE_ITEM_TRANSFERRED,
        actorUserId: input.actorUserId ?? null,
        area: input.toArea,
        queueId: destinationQueue.id,
        queueItemId: queueItem.id,
        reason: `Transferido a ${RECEPTION_AREA_LABELS[input.toArea] ?? input.toArea} (motivo: ${motive})`,
        metadata: {
          fromQueueId: queueItem.queueId,
          toQueueId: destinationQueue.id,
          fromArea: queueItem.queue.area,
          toArea: input.toArea,
          fromStatus: queueItem.status
        }
      },
      tx
    );

    return updated;
  });
}

export async function reorderQueue(input: ReorderQueueInput) {
  if (!input.orderedQueueItemIds.length) {
    throw new Error("orderedQueueItemIds no puede estar vacío.");
  }

  return prisma.$transaction(async (tx) => {
    const queue = await ensureQueue({ siteId: input.siteId, area: input.area }, tx);

    const items = await tx.queueItem.findMany({
      where: {
        id: { in: input.orderedQueueItemIds },
        queueId: queue.id
      }
    });

    if (items.length !== input.orderedQueueItemIds.length) {
      throw new Error("Algunos QueueItem no pertenecen a la cola indicada.");
    }

    const invalid = items.find((item) => item.status !== QueueItemStatus.WAITING);
    if (invalid) {
      throw new Error("Solo se pueden reordenar ítems en estado WAITING.");
    }

    const updates = input.orderedQueueItemIds.map((id, index) =>
      tx.queueItem.update({
        where: { id },
        data: { sequence: index + 1, updatedByUserId: input.actorUserId ?? null }
      })
    );

    await Promise.all(updates);

    for (const id of input.orderedQueueItemIds) {
      const item = items.find((row) => row.id === id);
      if (!item) continue;
      await createVisitEvent(
        {
          visitId: item.visitId,
          eventType: VisitEventType.REORDER_QUEUE,
          actorUserId: input.actorUserId ?? null,
          area: input.area,
          queueId: queue.id,
          queueItemId: item.id,
          metadata: {
            sequence: input.orderedQueueItemIds.indexOf(id) + 1
          }
        },
        tx
      );
    }

    return tx.queueItem.findMany({
      where: { queueId: queue.id },
      orderBy: [
        { priority: "asc" },
        { sequence: "asc" },
        { enqueuedAt: "asc" }
      ]
    });
  });
}

export async function listActiveQueueItems(input: ListQueueItemsInput) {
  const queue = await prisma.queue.findFirst({
    where: { siteId: input.siteId, area: input.area }
  });

  if (!queue) return [];

  return prisma.queueItem.findMany({
    where: {
      queueId: queue.id,
      status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) }
    },
    orderBy: [
      { priority: "asc" },
      { sequence: "asc" },
      { enqueuedAt: "asc" }
    ]
  });
}

export async function listQueuesOverview(input: ListQueuesOverviewInput) {
  const queues = await prisma.queue.findMany({
    where: { siteId: input.siteId }
  });

  if (!queues.length) return [];

  const queueIds = queues.map((queue) => queue.id);
  const counts = await prisma.queueItem.groupBy({
    by: ["queueId", "status"],
    where: { queueId: { in: queueIds } },
    _count: { _all: true }
  });

  const activeItems = await prisma.queueItem.findMany({
    where: {
      queueId: { in: queueIds },
      status: { in: Array.from(ACTIVE_QUEUE_ITEM_STATUSES) }
    },
    select: {
      queueId: true,
      status: true,
      enqueuedAt: true,
      calledAt: true
    }
  });

  const now = Date.now();

  return queues.map((queue) => {
    const statusCounts: Record<string, number> = {};
    for (const row of counts.filter((c) => c.queueId === queue.id)) {
      statusCounts[row.status] = row._count._all;
    }

    const waitingItems = activeItems.filter(
      (item) => item.queueId === queue.id && item.status === QueueItemStatus.WAITING
    );
    const calledItems = activeItems.filter(
      (item) => item.queueId === queue.id && item.calledAt && item.enqueuedAt
    );

    const avgWaitMinutes = waitingItems.length
      ? Math.round(
          waitingItems.reduce((sum, item) => sum + (now - item.enqueuedAt.getTime()), 0) /
            waitingItems.length /
            60000
        )
      : null;

    const avgCallDelayMinutes = calledItems.length
      ? Math.round(
          calledItems.reduce(
            (sum, item) => sum + (item.calledAt!.getTime() - item.enqueuedAt.getTime()),
            0
          ) /
            calledItems.length /
            60000
        )
      : null;

    return {
      queueId: queue.id,
      area: queue.area,
      status: queue.status,
      counts: statusCounts,
      avgWaitMinutes,
      avgCallDelayMinutes
    };
  });
}
