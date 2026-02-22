import type { OperationalArea, ServiceRequestStatus, VisitPriority } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";

export type CreateServiceRequestInput = {
  visitId: string;
  siteId: string;
  area: OperationalArea;
  actorUserId: string;
  actorUser?: SessionUser | null;
  priorityOverride?: VisitPriority | null;
  notes?: string | null;
  enqueue?: boolean;
};

export type AssignServiceRequestInput = {
  serviceRequestId: string;
  assignedToUserId: string;
  actorUserId: string;
  actorUser?: SessionUser | null;
};

export type StartServiceRequestInput = {
  serviceRequestId: string;
  actorUserId: string;
  actorUser?: SessionUser | null;
  queueItemId?: string | null;
  roomId?: string | null;
};

export type CompleteServiceRequestInput = {
  serviceRequestId: string;
  actorUserId: string;
  actorUser?: SessionUser | null;
  queueItemId?: string | null;
  notes?: string | null;
};

export type CancelServiceRequestInput = {
  serviceRequestId: string;
  actorUserId: string;
  actorUser?: SessionUser | null;
  reason?: string | null;
};

export type ListServiceRequestsForVisitInput = {
  visitId: string;
};

export type ListOpenServiceRequestsByAreaInput = {
  siteId: string;
  area: OperationalArea;
};

export type ServiceRequestSummary = {
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
};

export type OpenServiceRequestByAreaItem = ServiceRequestSummary & {
  ticketCode: string | null;
  priority: VisitPriority;
};
