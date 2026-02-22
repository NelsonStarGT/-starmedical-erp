import type { OperationalArea, VisitEventType, VisitPriority, VisitSource, VisitStatus, Prisma } from "@prisma/client";

export type VisitArea = OperationalArea;
export type VisitType = VisitSource;

export type CreateWalkInVisitInput = {
  patientId: string;
  siteId: string;
  initialArea: VisitArea;
  priority: VisitPriority;
  createdByUserId?: string | null;
  notes?: string | null;
};

export type CreateVisitFromAppointmentInput = {
  appointmentId: string;
  siteId: string;
  createdByUserId?: string | null;
};

export type CheckInVisitInput = {
  visitId: string;
  actorUserId?: string | null;
};

export type TransitionVisitStatusInput = {
  visitId: string;
  toStatus: VisitStatus;
  actorUserId?: string | null;
  reason?: string | null;
};

export type CreateVisitEventInput = {
  visitId: string;
  eventType: VisitEventType;
  fromStatus?: VisitStatus | null;
  toStatus?: VisitStatus | null;
  actorUserId?: string | null;
  reason?: string | null;
  area?: OperationalArea | null;
  queueId?: string | null;
  queueItemId?: string | null;
  serviceRequestId?: string | null;
  operationalIncidentId?: string | null;
  metadata?: Prisma.InputJsonValue;
};
