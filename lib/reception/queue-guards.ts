import type { QueueItemStatus, VisitPriority, VisitStatus } from "@prisma/client";

export const ACTIVE_QUEUE_ITEM_STATUSES = [
  "WAITING",
  "CALLED",
  "IN_SERVICE",
  "PAUSED"
] as const satisfies readonly QueueItemStatus[];

export const TERMINAL_QUEUE_ITEM_STATUSES = [
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
  "NO_SHOW"
] as const satisfies readonly QueueItemStatus[];

const TERMINAL_QUEUE_ITEM_STATUS_SET = new Set<QueueItemStatus>(TERMINAL_QUEUE_ITEM_STATUSES);

export const ENQUEUE_ALLOWED_VISIT_STATUSES = new Set<VisitStatus>([
  "CHECKED_IN",
  "IN_SERVICE",
  "IN_DIAGNOSTIC",
  "READY_FOR_DISCHARGE",
  "IN_QUEUE"
]);

export const QUEUE_ITEM_TRANSITIONS = {
  WAITING: ["CALLED", "SKIPPED"],
  CALLED: ["IN_SERVICE", "SKIPPED"],
  IN_SERVICE: ["PAUSED", "COMPLETED"],
  PAUSED: ["IN_SERVICE"],
  COMPLETED: [],
  SKIPPED: [],
  CANCELLED: [],
  NO_SHOW: []
} as const satisfies Record<QueueItemStatus, readonly QueueItemStatus[]>;

export const QUEUE_PRIORITY_ORDER = {
  URGENT: 1,
  COMPANY: 2,
  PREFERENTIAL: 3,
  NORMAL: 4
} as const satisfies Record<VisitPriority, number>;

export function assertVisitCanEnqueue(status: VisitStatus): void {
  if (!ENQUEUE_ALLOWED_VISIT_STATUSES.has(status)) {
    throw new Error(`La visita en estado ${status} no puede ser encolada.`);
  }
}

export function assertQueueItemTransition(current: QueueItemStatus, target: QueueItemStatus): void {
  const allowed = QUEUE_ITEM_TRANSITIONS[current] ?? [];
  if (!(allowed as readonly QueueItemStatus[]).includes(target)) {
    throw new Error(`Transición de QueueItem no permitida: ${current} -> ${target}.`);
  }
}

export function assertQueueItemMutable(status: QueueItemStatus): void {
  if (TERMINAL_QUEUE_ITEM_STATUS_SET.has(status)) {
    throw new Error(`QueueItem en estado terminal (${status}) no puede modificarse.`);
  }
}

// Guard para controladores/API: solo Supervisor/Admin deben poder reordenar.
export function assertCanReorderQueue(isSupervisorOrAdmin: boolean): void {
  if (!isSupervisorOrAdmin) {
    throw new Error("Solo Supervisor/Admin puede reordenar la cola.");
  }
}
