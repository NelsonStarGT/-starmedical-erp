import "server-only";

import { OperationalArea, QueueStatus, QueueItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTicketDateKey } from "@/lib/reception/ticketing.service";
import type {
  GetPublicTurnosInput,
  PublicTurnoItem,
  PublicTurnosArea,
  PublicTurnosResponse
} from "@/lib/reception/public-turnos.types";

const ACTIVE_QUEUE_STATES: QueueItemStatus[] = [
  QueueItemStatus.WAITING,
  QueueItemStatus.CALLED,
  QueueItemStatus.IN_SERVICE,
  QueueItemStatus.PAUSED
];

const ALL_AREAS: OperationalArea[] = [
  OperationalArea.CONSULTATION,
  OperationalArea.LAB,
  OperationalArea.XRAY,
  OperationalArea.ULTRASOUND,
  OperationalArea.URGENT_CARE
];

type QueueItemRow = {
  status: QueueItemStatus;
  enqueuedAt: Date;
  calledAt: Date | null;
  startedAt: Date | null;
  queue: { area: OperationalArea };
  visit: { ticketCode: string | null };
  room: { name: string | null } | null;
};

function buildItem(row: QueueItemRow): PublicTurnoItem | null {
  if (!row.visit.ticketCode) return null;
  return {
    ticketCode: row.visit.ticketCode,
    state: row.status,
    calledAt: row.calledAt ? row.calledAt.toISOString() : null,
    roomLabel: row.room?.name ?? null
  };
}

export async function getPublicTurnos(input: GetPublicTurnosInput): Promise<PublicTurnosResponse> {
  const now = new Date();
  const dateKey = getTicketDateKey(now);
  const limit = input.limit && input.limit > 0 ? input.limit : 20;
  const areas = input.area ? [input.area] : ALL_AREAS;

  const queues = await prisma.queue.findMany({
    where: {
      siteId: input.siteId,
      area: { in: areas },
      status: QueueStatus.ACTIVE
    },
    select: {
      id: true,
      area: true
    }
  });

  const queueIds = queues.map((queue) => queue.id);

  const items = queueIds.length
    ? await prisma.queueItem.findMany({
        where: {
          queueId: { in: queueIds },
          status: { in: ACTIVE_QUEUE_STATES },
          visit: { ticketDateKey: dateKey }
        },
        select: {
          status: true,
          enqueuedAt: true,
          calledAt: true,
          startedAt: true,
          queue: { select: { area: true } },
          visit: { select: { ticketCode: true } },
          room: { select: { name: true } }
        },
        orderBy: { enqueuedAt: "asc" }
      })
    : [];

  const grouped = new Map<OperationalArea, PublicTurnosArea>();
  for (const area of areas) {
    grouped.set(area, {
      area,
      nowServing: [],
      calling: [],
      waiting: []
    });
  }

  const callingBuffer = new Map<OperationalArea, QueueItemRow[]>();
  const servingBuffer = new Map<OperationalArea, QueueItemRow[]>();
  const waitingBuffer = new Map<OperationalArea, QueueItemRow[]>();

  for (const row of items) {
    const area = row.queue.area;
    if (!grouped.has(area)) continue;

    if (row.status === QueueItemStatus.CALLED) {
      const bucket = callingBuffer.get(area) ?? [];
      bucket.push(row);
      callingBuffer.set(area, bucket);
      continue;
    }

    if (row.status === QueueItemStatus.IN_SERVICE) {
      const bucket = servingBuffer.get(area) ?? [];
      bucket.push(row);
      servingBuffer.set(area, bucket);
      continue;
    }

    const bucket = waitingBuffer.get(area) ?? [];
    bucket.push(row);
    waitingBuffer.set(area, bucket);
  }

  for (const area of areas) {
    const areaData = grouped.get(area);
    if (!areaData) continue;

    const calling = (callingBuffer.get(area) ?? [])
      .sort((a, b) => (b.calledAt?.getTime() ?? 0) - (a.calledAt?.getTime() ?? 0))
      .map(buildItem)
      .filter(Boolean) as PublicTurnoItem[];

    const serving = (servingBuffer.get(area) ?? [])
      .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))
      .map(buildItem)
      .filter(Boolean) as PublicTurnoItem[];

    const waiting = (waitingBuffer.get(area) ?? [])
      .sort((a, b) => a.enqueuedAt.getTime() - b.enqueuedAt.getTime())
      .map(buildItem)
      .filter(Boolean) as PublicTurnoItem[];

    areaData.calling = calling.slice(0, limit);
    areaData.nowServing = serving.slice(0, limit);
    areaData.waiting = waiting.slice(0, limit);
  }

  return {
    siteId: input.siteId,
    generatedAt: now.toISOString(),
    areas: areas.map((area) => grouped.get(area)!)
  };
}
