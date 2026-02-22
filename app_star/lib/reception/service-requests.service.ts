import "server-only";

import {
  OperationalArea,
  ServiceRequestStatus,
  VisitEventType,
  QueueItemStatus,
  VisitStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canAssignRequest,
  canCancelRequest,
  canCompleteRequest,
  canCreateRequest,
  canStartRequest,
  isDiagnosticArea
} from "@/lib/reception/service-requests.guards";
import {
  completeQueueItem,
  enqueueVisit,
  startServiceFromQueue
} from "@/lib/reception/queues.service";
import { createVisitEvent } from "@/lib/reception/visit-events.service";
import { transitionVisitStatus } from "@/lib/reception/visit.service";
import { getTicketDateKey } from "@/lib/reception/ticketing.service";
import type {
  AssignServiceRequestInput,
  CancelServiceRequestInput,
  CompleteServiceRequestInput,
  CreateServiceRequestInput,
  ListOpenServiceRequestsByAreaInput,
  ListServiceRequestsForVisitInput,
  OpenServiceRequestByAreaItem,
  ServiceRequestSummary,
  StartServiceRequestInput
} from "@/lib/reception/service-requests.types";

const OPEN_REQUEST_STATUSES: ServiceRequestStatus[] = [
  ServiceRequestStatus.REQUESTED,
  ServiceRequestStatus.IN_PROGRESS
];

const ACTIVE_QUEUE_STATUSES: QueueItemStatus[] = [
  QueueItemStatus.WAITING,
  QueueItemStatus.CALLED,
  QueueItemStatus.IN_SERVICE,
  QueueItemStatus.PAUSED
];

function asSummary(request: {
  id: string;
  visitId: string;
  area: OperationalArea;
  status: ServiceRequestStatus;
  requestedByUserId: string | null;
  assignedToUserId: string | null;
  requestedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
}): ServiceRequestSummary {
  return {
    id: request.id,
    visitId: request.visitId,
    area: request.area,
    status: request.status,
    requestedByUserId: request.requestedByUserId,
    assignedToUserId: request.assignedToUserId,
    requestedAt: request.requestedAt,
    startedAt: request.startedAt,
    completedAt: request.completedAt,
    cancelledAt: request.cancelledAt
  };
}

export async function createServiceRequest(input: CreateServiceRequestInput) {
  const enqueue = input.enqueue ?? true;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.findUnique({ where: { id: input.visitId } });
    if (!visit) throw new Error("Visita no encontrada.");
    if (visit.siteId !== input.siteId) throw new Error("La visita no pertenece a la sede indicada.");

    canCreateRequest(visit.status, input.actorUser);

    const request = await tx.serviceRequest.create({
      data: {
        visitId: input.visitId,
        area: input.area,
        status: ServiceRequestStatus.REQUESTED,
        description: input.notes ?? null,
        requestedByUserId: input.actorUserId
      }
    });

    await createVisitEvent(
      {
        visitId: input.visitId,
        eventType: VisitEventType.SERVICE_REQUEST_CREATED,
        actorUserId: input.actorUserId,
        area: input.area,
        serviceRequestId: request.id,
        metadata: { area: input.area, serviceRequestId: request.id }
      },
      tx
    );

    if (enqueue) {
      const shouldStayInService =
        isDiagnosticArea(input.area) && visit.status === VisitStatus.IN_SERVICE;
      await enqueueVisit(
        {
          visitId: input.visitId,
          siteId: input.siteId,
          area: input.area,
          actorUserId: input.actorUserId,
          priorityOverride: input.priorityOverride ?? null,
          skipStatusTransition: shouldStayInService
        },
        tx
      );

      if (shouldStayInService) {
        await transitionVisitStatus(
          {
            visitId: input.visitId,
            toStatus: VisitStatus.IN_DIAGNOSTIC,
            actorUserId: input.actorUserId,
            reason: "Envío a diagnóstico"
          },
          tx
        );
      }
    }

    return request;
  });
}

export async function assignServiceRequest(input: AssignServiceRequestInput) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: input.serviceRequestId }
    });
    if (!request) throw new Error("ServiceRequest no encontrado.");

    canAssignRequest(input.actorUser);

    const updated = await tx.serviceRequest.update({
      where: { id: input.serviceRequestId },
      data: {
        assignedToUserId: input.assignedToUserId
      }
    });

    await createVisitEvent(
      {
        visitId: updated.visitId,
        eventType: VisitEventType.SERVICE_REQUEST_ASSIGNED,
        actorUserId: input.actorUserId,
        area: updated.area,
        serviceRequestId: updated.id,
        metadata: {
          assignedToUserId: input.assignedToUserId
        }
      },
      tx
    );

    return updated;
  });
}

export async function startServiceRequest(input: StartServiceRequestInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: input.serviceRequestId }
    });

    if (!request) throw new Error("ServiceRequest no encontrado.");

    canStartRequest(input.actorUser, request);

    const updatedRequest = await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: ServiceRequestStatus.IN_PROGRESS,
        startedAt: request.startedAt ?? now,
        assignedToUserId: request.assignedToUserId ?? input.actorUserId
      }
    });

    let queueItemId = input.queueItemId ?? null;

    if (queueItemId) {
      const queueItem = await tx.queueItem.findUnique({
        where: { id: queueItemId },
        include: { queue: true }
      });

      if (!queueItem) throw new Error("QueueItem no encontrado.");
      if (queueItem.visitId !== updatedRequest.visitId) {
        throw new Error("QueueItem no corresponde a la visita.");
      }
      if (queueItem.queue.area !== updatedRequest.area) {
        throw new Error("QueueItem no corresponde al área de la solicitud.");
      }

      if (!ACTIVE_QUEUE_STATUSES.includes(queueItem.status)) {
        throw new Error("QueueItem no está en un estado válido para iniciar servicio.");
      }

      if (queueItem.status === QueueItemStatus.PAUSED) {
        throw new Error("QueueItem en pausa. Reanuda antes de iniciar servicio.");
      }

      let nextStatus = queueItem.status;

      if (queueItem.status === QueueItemStatus.WAITING) {
        await tx.queueItem.update({
          where: { id: queueItem.id },
          data: {
            status: QueueItemStatus.CALLED,
            calledAt: now,
            roomId: input.roomId ?? queueItem.roomId,
            updatedByUserId: input.actorUserId
          }
        });
        nextStatus = QueueItemStatus.CALLED;
        await createVisitEvent(
          {
            visitId: queueItem.visitId,
            eventType: VisitEventType.CALL_NEXT,
            actorUserId: input.actorUserId,
            area: updatedRequest.area,
            queueId: queueItem.queueId,
            queueItemId: queueItem.id,
            metadata: { roomId: input.roomId ?? null }
          },
          tx
        );

        await transitionVisitStatus(
          {
            visitId: queueItem.visitId,
            toStatus: VisitStatus.CALLED,
            actorUserId: input.actorUserId,
            reason: "Llamado desde ServiceRequest"
          },
          tx
        );
      }

      if (input.roomId) {
        await tx.queueItem.update({
          where: { id: queueItem.id },
          data: { roomId: input.roomId }
        });
      }

      if (nextStatus === QueueItemStatus.CALLED) {
        await startServiceFromQueue(
          {
            queueItemId: queueItem.id,
            actorUserId: input.actorUserId
          },
          tx
        );
      }
    }

    if (isDiagnosticArea(updatedRequest.area)) {
      const visit = await tx.visit.findUnique({ where: { id: updatedRequest.visitId } });
      if (visit?.status === VisitStatus.IN_SERVICE) {
        await transitionVisitStatus(
          {
            visitId: updatedRequest.visitId,
            toStatus: VisitStatus.IN_DIAGNOSTIC,
            actorUserId: input.actorUserId,
            reason: "Inicio de diagnóstico"
          },
          tx
        );
      }
    }

    await createVisitEvent(
      {
        visitId: updatedRequest.visitId,
        eventType: VisitEventType.SERVICE_REQUEST_STARTED,
        actorUserId: input.actorUserId,
        area: updatedRequest.area,
        serviceRequestId: updatedRequest.id,
        metadata: {
          queueItemId: queueItemId ?? null,
          roomId: input.roomId ?? null
        }
      },
      tx
    );

    return updatedRequest;
  });
}

export async function completeServiceRequest(input: CompleteServiceRequestInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: input.serviceRequestId }
    });

    if (!request) throw new Error("ServiceRequest no encontrado.");

    canCompleteRequest(input.actorUser, request);

    const updatedRequest = await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: ServiceRequestStatus.DONE,
        completedAt: request.completedAt ?? now
      }
    });

    if (input.queueItemId) {
      await completeQueueItem(
        {
          queueItemId: input.queueItemId,
          actorUserId: input.actorUserId,
          reason: input.notes ?? null
        },
        tx
      );
    }

    await createVisitEvent(
      {
        visitId: updatedRequest.visitId,
        eventType: VisitEventType.SERVICE_REQUEST_COMPLETED,
        actorUserId: input.actorUserId,
        area: updatedRequest.area,
        serviceRequestId: updatedRequest.id,
        reason: input.notes ?? null,
        metadata: { queueItemId: input.queueItemId ?? null }
      },
      tx
    );

    const openRequests = await tx.serviceRequest.count({
      where: {
        visitId: updatedRequest.visitId,
        status: { in: OPEN_REQUEST_STATUSES }
      }
    });

    const activeQueueItems = await tx.queueItem.count({
      where: {
        visitId: updatedRequest.visitId,
        status: { in: ACTIVE_QUEUE_STATUSES }
      }
    });

    if (openRequests === 0 && activeQueueItems === 0) {
      const visit = await tx.visit.findUnique({ where: { id: updatedRequest.visitId } });
      if (visit && ([VisitStatus.IN_SERVICE, VisitStatus.IN_DIAGNOSTIC] as VisitStatus[]).includes(visit.status)) {
        await transitionVisitStatus(
          {
            visitId: visit.id,
            toStatus: VisitStatus.READY_FOR_DISCHARGE,
            actorUserId: input.actorUserId,
            reason: "Todas las solicitudes completadas"
          },
          tx
        );
      }
    }

    return updatedRequest;
  });
}

export async function cancelServiceRequest(input: CancelServiceRequestInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.findUnique({
      where: { id: input.serviceRequestId }
    });

    if (!request) throw new Error("ServiceRequest no encontrado.");

    canCancelRequest(input.actorUser, request);

    const updated = await tx.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: ServiceRequestStatus.CANCELLED,
        cancelledAt: request.cancelledAt ?? now
      }
    });

    await createVisitEvent(
      {
        visitId: updated.visitId,
        eventType: VisitEventType.SERVICE_REQUEST_CANCELLED,
        actorUserId: input.actorUserId,
        area: updated.area,
        serviceRequestId: updated.id,
        reason: input.reason ?? null
      },
      tx
    );

    return updated;
  });
}

export async function listServiceRequestsForVisit(
  input: ListServiceRequestsForVisitInput
): Promise<ServiceRequestSummary[]> {
  const requests = await prisma.serviceRequest.findMany({
    where: { visitId: input.visitId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      visitId: true,
      area: true,
      status: true,
      requestedByUserId: true,
      assignedToUserId: true,
      requestedAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true
    }
  });

  return requests.map(asSummary);
}

export async function listOpenServiceRequestsByArea(
  input: ListOpenServiceRequestsByAreaInput
): Promise<OpenServiceRequestByAreaItem[]> {
  const dateKey = getTicketDateKey();

  const requests = await prisma.serviceRequest.findMany({
    where: {
      area: input.area,
      status: { in: OPEN_REQUEST_STATUSES },
      visit: {
        siteId: input.siteId,
        ticketDateKey: dateKey
      }
    },
    orderBy: [{ visit: { priority: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      visitId: true,
      area: true,
      status: true,
      requestedByUserId: true,
      assignedToUserId: true,
      requestedAt: true,
      startedAt: true,
      completedAt: true,
      cancelledAt: true,
      visit: {
        select: { ticketCode: true, priority: true }
      }
    }
  });

  return requests.map((request) => ({
    ...asSummary(request),
    ticketCode: request.visit.ticketCode ?? null,
    priority: request.visit.priority
  }));
}
