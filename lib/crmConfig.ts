import { CrmPreferredChannel } from "@prisma/client";
import { formatNextAction } from "./datetime";

export const CRM_PIPELINE_TYPES = {
  b2b: { value: "B2B", label: "Empresas (SSO)" },
  b2c: { value: "B2C", label: "Pacientes (B2C)" }
} as const;

export const CRM_STAGE_ORDER = [
  "NUEVO",
  "CONTACTADO",
  "DIAGNOSTICO",
  "COTIZACION",
  "NEGOCIACION",
  "GANADO",
  "PERDIDO"
] as const;

export type CrmStage = (typeof CRM_STAGE_ORDER)[number];

export const CRM_STAGE_LABELS: Record<CrmStage, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  DIAGNOSTICO: "Diagnostico",
  COTIZACION: "Cotizacion",
  NEGOCIACION: "Negociacion",
  GANADO: "Ganado",
  PERDIDO: "Perdido"
};

export const CRM_SLA_HOURS: Record<CrmStage, number> = {
  NUEVO: 2,
  CONTACTADO: 24,
  DIAGNOSTICO: 24,
  COTIZACION: 48,
  NEGOCIACION: 120,
  GANADO: 0,
  PERDIDO: 0
};

export const CRM_SLA_WARNING_RATIO = 0.25;

export type CrmSlaStatus = "GREEN" | "YELLOW" | "RED";

export function getSlaDeadlineAt(stage: CrmStage, stageEnteredAt: Date) {
  const hours = CRM_SLA_HOURS[stage] || 0;
  if (hours <= 0) return null;
  const deadline = new Date(stageEnteredAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

export function computeSlaStatus(stage: CrmStage, stageEnteredAt: Date): CrmSlaStatus {
  const hours = CRM_SLA_HOURS[stage] || 0;
  if (hours <= 0) return "GREEN";
  const deadline = getSlaDeadlineAt(stage, stageEnteredAt);
  if (!deadline) return "GREEN";
  const diffMs = deadline.getTime() - Date.now();
  if (diffMs <= 0) return "RED";
  const warningHours = Math.max(1, Math.ceil(hours * CRM_SLA_WARNING_RATIO));
  const warningMs = warningHours * 60 * 60 * 1000;
  return diffMs <= warningMs ? "YELLOW" : "GREEN";
}

export const CRM_COMMUNICATION_OPTIONS = [
  { value: "CALL", label: "Llamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "VISIT", label: "Visita" },
  { value: "VIDEO", label: "Videollamada" }
] satisfies { value: CrmPreferredChannel; label: string }[];

export type CrmCommunicationType = (typeof CRM_COMMUNICATION_OPTIONS)[number]["value"];
export type CrmNextActionType = CrmPreferredChannel;

export const CRM_COMMUNICATION_VALUES: CrmPreferredChannel[] = CRM_COMMUNICATION_OPTIONS.map((action) => action.value);

export function parseNextAction(raw?: string | null) {
  if (!raw) return { type: null as CrmNextActionType | null, notes: "" };
  const [head, ...rest] = raw.split(" - ");
  const normalized = head.trim().toUpperCase();
  if (CRM_COMMUNICATION_VALUES.includes(normalized as CrmPreferredChannel)) {
    return { type: normalized as CrmNextActionType, notes: rest.join(" - ").trim() };
  }
  return { type: null, notes: raw };
}

export function nextActionLabel(type?: string | null) {
  const normalized = type ? type.trim().toUpperCase() : "";
  const match = CRM_COMMUNICATION_OPTIONS.find((action) => action.value === normalized);
  return match?.label || (normalized ? normalized.toLowerCase() : "Sin accion");
}

export { formatNextAction };

export const CRM_LOST_REASONS = [
  "Precio",
  "Competencia",
  "Sin respuesta",
  "Sin presupuesto",
  "Sin tiempo",
  "Otro"
] as const;

export const CRM_QUOTE_FOLLOWUP_DAYS = 3;

export const CRM_SERVICE_OPTIONS = {
  B2B: [
    { value: "BOTIQUINES", label: "Botiquines" },
    { value: "EXTINTORES", label: "Extintores" },
    { value: "CAPACITACIONES", label: "Capacitaciones" },
    { value: "CLINICAS_EMPRESARIALES", label: "Clinicas empresariales" },
    { value: "SSO", label: "Salud y seguridad ocupacional" },
    { value: "SERVICIOS_MEDICOS", label: "Servicios medicos" },
    { value: "OTROS", label: "Otros" }
  ],
  B2C: [
    { value: "CONSULTAS", label: "Consultas" },
    { value: "LABORATORIO", label: "Laboratorio" },
    { value: "RAYOS_X", label: "Rayos X" },
    { value: "ULTRASONIDO", label: "Ultrasonido" },
    { value: "MEMBRESIAS", label: "Membresias" },
    { value: "OTROS", label: "Otros" }
  ]
} as const;
