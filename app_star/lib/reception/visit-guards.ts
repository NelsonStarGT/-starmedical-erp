import type { ServiceRequestStatus, VisitStatus } from "@prisma/client";

export const OPEN_SERVICE_REQUEST_STATUSES = [
  "REQUESTED",
  "IN_PROGRESS"
] as const satisfies readonly ServiceRequestStatus[];

export const VISIT_STATUS_TRANSITIONS = {
  ARRIVED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_QUEUE", "ON_HOLD", "CANCELLED"],
  IN_QUEUE: ["CALLED", "ON_HOLD"],
  CALLED: ["IN_SERVICE", "IN_QUEUE"],
  IN_SERVICE: ["IN_DIAGNOSTIC", "READY_FOR_DISCHARGE", "IN_QUEUE"],
  IN_DIAGNOSTIC: ["READY_FOR_DISCHARGE", "IN_QUEUE"],
  READY_FOR_DISCHARGE: ["CHECKED_OUT", "IN_QUEUE"],
  CHECKED_OUT: [],
  ON_HOLD: [],
  CANCELLED: [],
  NO_SHOW: []
} as const satisfies Record<VisitStatus, readonly VisitStatus[]>;

export const TERMINAL_VISIT_STATUSES = new Set<VisitStatus>([
  "CANCELLED",
  "CHECKED_OUT",
  "NO_SHOW"
]);

export type TransitionGuardInput = {
  currentStatus: VisitStatus;
  targetStatus: VisitStatus;
  previousStatus?: VisitStatus;
};

export function getAllowedTransitions(currentStatus: VisitStatus, previousStatus?: VisitStatus): readonly VisitStatus[] {
  if (currentStatus === "ON_HOLD") {
    return previousStatus ? [previousStatus] : [];
  }
  return VISIT_STATUS_TRANSITIONS[currentStatus] ?? [];
}

export function assertVisitMutable(currentStatus: VisitStatus): void {
  if (TERMINAL_VISIT_STATUSES.has(currentStatus)) {
    throw new Error(`La visita está en estado terminal (${currentStatus}) y no puede modificarse.`);
  }
}

export function assertTransitionAllowed({ currentStatus, targetStatus, previousStatus }: TransitionGuardInput): void {
  if (currentStatus === "ON_HOLD") {
    if (!previousStatus) {
      throw new Error("No se encontró el estado previo para reanudar una visita en ON_HOLD.");
    }
    if (targetStatus !== previousStatus) {
      throw new Error(`Desde ON_HOLD solo se puede regresar a ${previousStatus}.`);
    }
    return;
  }

  const allowedTargets = (VISIT_STATUS_TRANSITIONS[currentStatus] ?? []) as readonly VisitStatus[];
  if (!allowedTargets.includes(targetStatus)) {
    throw new Error(`Transición no permitida: ${currentStatus} -> ${targetStatus}.`);
  }
}

export function assertCanCheckOut(hasOpenServiceRequests: boolean): void {
  if (hasOpenServiceRequests) {
    throw new Error("No se puede CHECKED_OUT con ServiceRequests abiertas (REQUESTED o IN_PROGRESS).");
  }
}
