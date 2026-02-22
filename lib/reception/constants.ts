import type { OperationalArea, VisitPriority, QueueItemStatus, VisitStatus } from "@prisma/client";

export const RECEPTION_AREAS = [
  "CONSULTATION",
  "LAB",
  "XRAY",
  "ULTRASOUND",
  "URGENT_CARE"
] as const satisfies readonly OperationalArea[];

export type ReceptionArea = OperationalArea;

export const RECEPTION_AREA_LABELS: Record<ReceptionArea, string> = {
  CONSULTATION: "Consulta",
  LAB: "Laboratorio",
  XRAY: "Rayos X",
  ULTRASOUND: "Ultrasonido",
  URGENT_CARE: "Urgencias"
};

export const VISIT_PRIORITIES = ["URGENT", "COMPANY", "PREFERENTIAL", "NORMAL"] as const satisfies readonly VisitPriority[];
export type ReceptionPriority = VisitPriority;

export const PRIORITY_LABELS: Record<ReceptionPriority, string> = {
  URGENT: "Urgente",
  COMPANY: "Empresa",
  PREFERENTIAL: "Preferencial",
  NORMAL: "Normal"
};

export const VISIT_STATUSES = [
  "ARRIVED",
  "CHECKED_IN",
  "IN_QUEUE",
  "CALLED",
  "IN_SERVICE",
  "IN_DIAGNOSTIC",
  "READY_FOR_DISCHARGE",
  "ON_HOLD",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW"
] as const satisfies readonly VisitStatus[];

export type ReceptionVisitStatus = VisitStatus;

export const VISIT_STATUS_LABELS: Record<ReceptionVisitStatus, string> = {
  ARRIVED: "Llegó",
  CHECKED_IN: "Admitido",
  IN_QUEUE: "En cola",
  CALLED: "Llamado",
  IN_SERVICE: "En atención",
  IN_DIAGNOSTIC: "En diagnóstico",
  READY_FOR_DISCHARGE: "Listo salida",
  ON_HOLD: "En espera",
  CHECKED_OUT: "Salida",
  CANCELLED: "Cancelado",
  NO_SHOW: "No llegó"
};

export const QUEUE_ITEM_STATUSES = [
  "WAITING",
  "CALLED",
  "IN_SERVICE",
  "PAUSED",
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
  "NO_SHOW"
] as const satisfies readonly QueueItemStatus[];

export type ReceptionQueueStatus = QueueItemStatus;

export const QUEUE_STATUS_LABELS: Record<ReceptionQueueStatus, string> = {
  WAITING: "En espera",
  CALLED: "Llamado",
  IN_SERVICE: "En atención",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
  SKIPPED: "Saltado",
  CANCELLED: "Cancelado",
  NO_SHOW: "No se presentó"
};
