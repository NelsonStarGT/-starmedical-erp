export type ReceptionRole = "RECEPTION_OPERATOR" | "RECEPTION_SUPERVISOR" | "RECEPTION_ADMIN";

export type ReceptionCapability =
  | "VISIT_CREATE"
  | "VISIT_CHECKIN"
  | "VISIT_TRANSITION_BASIC"
  | "VISIT_CANCEL"
  | "VISIT_NO_SHOW"
  | "VISIT_CHECKOUT_OVERRIDE"
  | "QUEUE_ENQUEUE"
  | "QUEUE_CALL_NEXT"
  | "QUEUE_START"
  | "QUEUE_COMPLETE"
  | "QUEUE_PAUSE_RESUME"
  | "QUEUE_SKIP"
  | "QUEUE_TRANSFER"
  | "QUEUE_REORDER"
  | "SETTINGS_EDIT";

export const CAPABILITIES_BY_ROLE: Record<ReceptionRole, ReceptionCapability[]> = {
  RECEPTION_OPERATOR: [
    "VISIT_CREATE",
    "VISIT_CHECKIN",
    "VISIT_TRANSITION_BASIC",
    "QUEUE_ENQUEUE",
    "QUEUE_CALL_NEXT",
    "QUEUE_START",
    "QUEUE_COMPLETE",
    "QUEUE_PAUSE_RESUME"
  ],
  RECEPTION_SUPERVISOR: [
    "VISIT_CREATE",
    "VISIT_CHECKIN",
    "VISIT_TRANSITION_BASIC",
    "VISIT_CANCEL",
    "VISIT_NO_SHOW",
    "VISIT_CHECKOUT_OVERRIDE",
    "QUEUE_ENQUEUE",
    "QUEUE_CALL_NEXT",
    "QUEUE_START",
    "QUEUE_COMPLETE",
    "QUEUE_PAUSE_RESUME",
    "QUEUE_SKIP",
    "QUEUE_TRANSFER",
    "QUEUE_REORDER",
    "SETTINGS_EDIT"
  ],
  RECEPTION_ADMIN: [
    "VISIT_CREATE",
    "VISIT_CHECKIN",
    "VISIT_TRANSITION_BASIC",
    "VISIT_CANCEL",
    "VISIT_NO_SHOW",
    "VISIT_CHECKOUT_OVERRIDE",
    "QUEUE_ENQUEUE",
    "QUEUE_CALL_NEXT",
    "QUEUE_START",
    "QUEUE_COMPLETE",
    "QUEUE_PAUSE_RESUME",
    "QUEUE_SKIP",
    "QUEUE_TRANSFER",
    "QUEUE_REORDER",
    "SETTINGS_EDIT"
  ]
};

export const RECEPTION_ROLE_LABELS: Record<ReceptionRole, string> = {
  RECEPTION_OPERATOR: "Operador",
  RECEPTION_SUPERVISOR: "Supervisor",
  RECEPTION_ADMIN: "Admin"
};

export const CAPABILITY_LABELS: Record<ReceptionCapability, string> = {
  VISIT_CREATE: "crear visitas",
  VISIT_CHECKIN: "registrar admisión",
  VISIT_TRANSITION_BASIC: "cambiar el estado de una visita",
  VISIT_CANCEL: "cancelar visitas",
  VISIT_NO_SHOW: "marcar no-show",
  VISIT_CHECKOUT_OVERRIDE: "cerrar visitas con excepciones",
  QUEUE_ENQUEUE: "encolar visitas",
  QUEUE_CALL_NEXT: "llamar siguientes turnos",
  QUEUE_START: "iniciar atención desde cola",
  QUEUE_COMPLETE: "completar atención en cola",
  QUEUE_PAUSE_RESUME: "pausar o reanudar turnos",
  QUEUE_SKIP: "saltar turnos",
  QUEUE_TRANSFER: "transferir turnos",
  QUEUE_REORDER: "reordenar colas",
  SETTINGS_EDIT: "editar configuración"
};

export function hasCapability(role: ReceptionRole, capability: ReceptionCapability): boolean {
  return CAPABILITIES_BY_ROLE[role]?.includes(capability) ?? false;
}
