import { CrmStage, getSlaDeadlineAt } from "@/lib/crmConfig";

export function formatCurrency(amount?: number | null) {
  const safe = Number(amount || 0);
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 2 }).format(safe);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

export function formatShortDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("es-GT", { dateStyle: "medium" });
}

export function formatSlaRemaining(stage: CrmStage, stageEnteredAt: string | Date) {
  const entered = stageEnteredAt instanceof Date ? stageEnteredAt : new Date(stageEnteredAt);
  const deadline = getSlaDeadlineAt(stage, entered);
  if (!deadline) return "-";
  const diffMs = deadline.getTime() - Date.now();
  if (diffMs <= 0) return "Vencido";
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}
