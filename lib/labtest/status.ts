import { LabTestStatus } from "@prisma/client";

export const LAB_STATUS_LABEL: Record<LabTestStatus, string> = {
  REQUESTED: "Solicitado",
  REQUIREMENTS_PENDING: "Requisitos pendientes",
  READY_FOR_COLLECTION: "Listo para toma",
  COLLECTED: "Muestra tomada",
  QUEUED: "En cola",
  IN_PROCESS: "En proceso",
  RESULT_CAPTURED: "Resultado capturado",
  TECH_VALIDATED: "Validación técnica",
  RELEASED: "Liberado",
  SENT: "Enviado",
  CANCELLED: "Cancelado"
};

export const LAB_STATUS_FLOW: Record<LabTestStatus, LabTestStatus[]> = {
  REQUESTED: ["REQUIREMENTS_PENDING", "READY_FOR_COLLECTION", "CANCELLED"],
  REQUIREMENTS_PENDING: ["READY_FOR_COLLECTION", "CANCELLED"],
  READY_FOR_COLLECTION: ["COLLECTED", "QUEUED", "CANCELLED"],
  COLLECTED: ["QUEUED", "IN_PROCESS", "CANCELLED"],
  QUEUED: ["IN_PROCESS", "CANCELLED"],
  IN_PROCESS: ["RESULT_CAPTURED", "CANCELLED"],
  RESULT_CAPTURED: ["TECH_VALIDATED", "CANCELLED"],
  TECH_VALIDATED: ["RELEASED", "CANCELLED"],
  RELEASED: ["SENT", "CANCELLED"],
  SENT: [],
  CANCELLED: []
};

type RoleKey = "LAB_TECH" | "LAB_SUPERVISOR" | "LAB_ADMIN" | "ADMIN" | "SUPER_ADMIN";

const TECH_ALLOWED: LabTestStatus[] = [
  "REQUESTED",
  "REQUIREMENTS_PENDING",
  "READY_FOR_COLLECTION",
  "COLLECTED",
  "QUEUED",
  "IN_PROCESS",
  "RESULT_CAPTURED",
  "TECH_VALIDATED"
];

const SUP_ALLOWED: LabTestStatus[] = [...TECH_ALLOWED, "RELEASED", "SENT"];

export function canTransition(current: LabTestStatus, target: LabTestStatus, role?: RoleKey) {
  const allowedTargets = LAB_STATUS_FLOW[current] || [];
  if (!allowedTargets.includes(target)) return false;

  if (!role) return false;
  const normalized = role.toUpperCase() as RoleKey;
  if (normalized === "SUPER_ADMIN" || normalized === "ADMIN" || normalized === "LAB_ADMIN") return true;
  if (normalized === "LAB_SUPERVISOR") return SUP_ALLOWED.includes(target);
  if (normalized === "LAB_TECH") return TECH_ALLOWED.includes(target);
  return false;
}
