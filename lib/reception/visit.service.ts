import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  OperationalArea,
  VisitPriority,
  VisitEventType,
  VisitSource,
  VisitStatus,
  type Prisma,
  type Visit
} from "@prisma/client";
import {
  assertCanCheckOut,
  assertTransitionAllowed,
  assertVisitMutable,
  OPEN_SERVICE_REQUEST_STATUSES
} from "@/lib/reception/visit-guards";
import { createVisitEvent, type PrismaClientOrTx } from "@/lib/reception/visit-events.service";
import type {
  CheckInVisitInput,
  CreateVisitFromAppointmentInput,
  CreateWalkInVisitInput,
  TransitionVisitStatusInput
} from "@/lib/reception/types";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPlaceholderTicketCode(): string {
  return `TMP-${randomUUID().slice(0, 8)}`;
}

function normalizeOperationalText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function inferInitialAreaFromAppointmentTypeName(typeName?: string | null): OperationalArea {
  if (!typeName) return OperationalArea.CONSULTATION;
  const name = normalizeOperationalText(typeName);

  if (name.includes("urg") || name.includes("emerg")) return OperationalArea.URGENT_CARE;
  if (name.includes("lab")) return OperationalArea.LAB;
  if (name.includes("rayos") || name.includes("rx") || name.includes("x-ray") || name.includes("x ray")) {
    return OperationalArea.XRAY;
  }
  if (name.includes("ultra") || name.includes("usg") || name.includes("sonograf")) return OperationalArea.ULTRASOUND;
  return OperationalArea.CONSULTATION;
}

function buildVisitStatusUpdate(visit: Visit, toStatus: VisitStatus, actorUserId?: string | null): Prisma.VisitUncheckedUpdateInput {
  const now = new Date();
  const data: Prisma.VisitUncheckedUpdateInput = {
    status: toStatus,
    statusChangedAt: now
  };

  if (actorUserId !== undefined) {
    data.updatedByUserId = actorUserId;
  }

  if (toStatus === VisitStatus.CHECKED_IN && !visit.checkedInAt) {
    data.checkedInAt = now;
  }
  if (toStatus === VisitStatus.CHECKED_OUT && !visit.checkedOutAt) {
    data.checkedOutAt = now;
  }
  if (toStatus === VisitStatus.CANCELLED && !visit.cancelledAt) {
    data.cancelledAt = now;
  }
  if (toStatus === VisitStatus.NO_SHOW && !visit.noShowAt) {
    data.noShowAt = now;
  }

  return data;
}

async function getPreviousStatusForOnHold(client: PrismaClientOrTx, visitId: string): Promise<VisitStatus | null> {
  const lastHoldEvent = await client.visitEvent.findFirst({
    where: { visitId, toStatus: VisitStatus.ON_HOLD },
    orderBy: { createdAt: "desc" }
  });

  return lastHoldEvent?.fromStatus ?? null;
}

function assertServiceStartAllowed(visit: Visit): void {
  if (!visit.checkedInAt) {
    throw new Error("No se puede iniciar servicio sin CHECKED_IN.");
  }
}

export async function createWalkInVisit(input: CreateWalkInVisitInput, client: PrismaClientOrTx = prisma) {
  const now = new Date();
  const ticketDateKey = toDateKey(now);

  const run = async (tx: PrismaClientOrTx) => {
    const patientExists = await tx.clientProfile.findUnique({ where: { id: input.patientId } });
    if (!patientExists) throw new Error("Paciente no encontrado para crear visita.");

    const visit = await tx.visit.create({
      data: {
        patientId: input.patientId,
        siteId: input.siteId,
        source: VisitSource.WALK_IN,
        ticketCode: buildPlaceholderTicketCode(),
        ticketDateKey,
        ticketArea: input.initialArea,
        initialArea: input.initialArea,
        currentArea: input.initialArea,
        priority: input.priority,
        status: VisitStatus.ARRIVED,
        statusChangedAt: now,
        arrivedAt: now,
        notes: input.notes ?? null,
        createdByUserId: input.createdByUserId ?? null,
        updatedByUserId: input.createdByUserId ?? null
      }
    });

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.STATE_CHANGE,
        fromStatus: null,
        toStatus: VisitStatus.ARRIVED,
        actorUserId: input.createdByUserId ?? null,
        reason: "Admisión registrada",
        area: input.initialArea,
        metadata: {
          priority: input.priority
        }
      },
      tx
    );

    return visit;
  };

  if ("$transaction" in client) {
    return client.$transaction(run);
  }

  return run(client);
}

// Alias semántico para Recepción v2 (deuda técnica: renombrar `createWalkInVisit` en una ventana segura).
export const createReceptionVisit = createWalkInVisit;

export async function createVisitFromAppointment(
  input: CreateVisitFromAppointmentInput,
  client: PrismaClientOrTx = prisma
) {
  const now = new Date();

  const run = async (tx: PrismaClientOrTx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      select: {
        id: true,
        branchId: true,
        patientId: true,
        date: true,
        notes: true,
        type: { select: { name: true } }
      }
    });

    if (!appointment) throw new Error("Cita no encontrada.");
    if (appointment.branchId !== input.siteId) {
      throw new Error("La cita no pertenece a la sede indicada.");
    }

    const existingVisit = await tx.visit.findFirst({
      where: { appointmentId: input.appointmentId }
    });

    if (existingVisit) {
      throw new Error("Ya existe una visita asociada a esta cita.");
    }

    const ticketDateKey = toDateKey(appointment.date ?? now);
    const initialArea = inferInitialAreaFromAppointmentTypeName(appointment.type?.name ?? null);

    const visit = await tx.visit.create({
      data: {
        patientId: appointment.patientId,
        appointmentId: input.appointmentId,
        siteId: input.siteId,
        source: VisitSource.APPOINTMENT,
        ticketCode: buildPlaceholderTicketCode(),
        ticketDateKey,
        ticketArea: initialArea,
        initialArea,
        currentArea: initialArea,
        priority: VisitPriority.NORMAL,
        status: VisitStatus.ARRIVED,
        statusChangedAt: now,
        arrivedAt: now,
        // Nota administrativa capturada en Recepción (solo lectura en clínica).
        notes: appointment.notes ?? null,
        createdByUserId: input.createdByUserId ?? null,
        updatedByUserId: input.createdByUserId ?? null
      }
    });

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.STATE_CHANGE,
        fromStatus: null,
        toStatus: VisitStatus.ARRIVED,
        actorUserId: input.createdByUserId ?? null,
        reason: "Ingreso desde cita",
        area: initialArea
      },
      tx
    );

    return visit;
  };

  if ("$transaction" in client) {
    return client.$transaction(run);
  }

  return run(client);
}

export async function checkInVisit(input: CheckInVisitInput) {
  return transitionVisitStatus({
    visitId: input.visitId,
    toStatus: VisitStatus.CHECKED_IN,
    actorUserId: input.actorUserId
  });
}

export async function transitionVisitStatus(
  input: TransitionVisitStatusInput,
  client: PrismaClientOrTx = prisma
) {
  const run = async (tx: PrismaClientOrTx) => {
    const visit = await tx.visit.findUnique({ where: { id: input.visitId } });
    if (!visit) throw new Error("Visita no encontrada.");

    assertVisitMutable(visit.status);

    const previousStatus = visit.status === VisitStatus.ON_HOLD
      ? await getPreviousStatusForOnHold(tx, visit.id)
      : null;

    assertTransitionAllowed({
      currentStatus: visit.status,
      targetStatus: input.toStatus,
      previousStatus: previousStatus ?? undefined
    });

    if (input.toStatus === VisitStatus.IN_SERVICE) {
      assertServiceStartAllowed(visit);
    }

    if (input.toStatus === VisitStatus.CHECKED_OUT) {
      const openRequests = await tx.serviceRequest.count({
        where: {
          visitId: visit.id,
          status: { in: Array.from(OPEN_SERVICE_REQUEST_STATUSES) }
        }
      });
      assertCanCheckOut(openRequests > 0);
    }

    const updated = await tx.visit.update({
      where: { id: visit.id },
      data: buildVisitStatusUpdate(visit, input.toStatus, input.actorUserId)
    });

    await createVisitEvent(
      {
        visitId: visit.id,
        eventType: VisitEventType.STATE_CHANGE,
        fromStatus: visit.status,
        toStatus: input.toStatus,
        actorUserId: input.actorUserId ?? null,
        reason: input.reason ?? null,
        metadata: input.toStatus === VisitStatus.ON_HOLD ? { previousStatus: visit.status } : undefined
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
