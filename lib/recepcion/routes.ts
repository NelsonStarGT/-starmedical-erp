import type { RecepcionCapability } from "@/lib/recepcion/permissions";

export type RecepcionRouteKey =
  | "dashboard"
  | "cola"
  | "citas"
  | "admisiones"
  | "caja"
  | "registros";

export type RecepcionRouteConfig = {
  key: RecepcionRouteKey;
  label: string;
  href: string;
  summary: string;
  viewCapability: RecepcionCapability;
  writeCapability?: RecepcionCapability;
};

export const RECEPCION_ROUTE_CONFIG: ReadonlyArray<RecepcionRouteConfig> = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/admin/recepcion",
    summary: "Consola operativa con KPIs del día y acciones rápidas.",
    viewCapability: "RECEPTION_VIEW"
  },
  {
    key: "cola",
    label: "Cola",
    href: "/admin/recepcion/cola",
    summary: "Sala de espera y movimiento de estados de atención.",
    viewCapability: "RECEPTION_QUEUE_VIEW",
    writeCapability: "RECEPTION_QUEUE_WRITE"
  },
  {
    key: "citas",
    label: "Citas",
    href: "/admin/recepcion/citas",
    summary: "Agenda del día con filtros y creación rápida.",
    viewCapability: "RECEPTION_APPOINTMENTS_VIEW",
    writeCapability: "RECEPTION_APPOINTMENTS_WRITE"
  },
  {
    key: "admisiones",
    label: "Admisiones",
    href: "/admin/recepcion/admisiones",
    summary: "Check-in guiado en 3 pasos para ingreso de paciente.",
    viewCapability: "RECEPTION_ADMISSIONS_VIEW",
    writeCapability: "RECEPTION_ADMISSIONS_WRITE"
  },
  {
    key: "caja",
    label: "Caja",
    href: "/admin/recepcion/caja",
    summary: "Cobro rápido v1 con ticket visual y salida a facturación.",
    viewCapability: "RECEPTION_CASHIER_VIEW",
    writeCapability: "RECEPTION_CASHIER_WRITE"
  },
  {
    key: "registros",
    label: "Registros",
    href: "/admin/recepcion/registros",
    summary: "Revisión de auto-registros y estado de aprobación.",
    viewCapability: "RECEPTION_REGISTRATIONS_VIEW",
    writeCapability: "RECEPTION_REGISTRATIONS_WRITE"
  }
] as const;

export const RECEPCION_ROUTE_PATHS = RECEPCION_ROUTE_CONFIG.map((entry) => entry.href);
