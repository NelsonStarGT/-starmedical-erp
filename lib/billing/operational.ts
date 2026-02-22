import { type BillingCase, type BillingCaseLock, type BillingPaymentMethod } from "@/lib/billing/types";

export type BillingPriorityLevel = "ALTA" | "MEDIA" | "BAJA";

type PriorityResult = {
  level: BillingPriorityLevel;
  reason: string;
  score: number;
};

function parseTimestamp(value?: string | null) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function minutesFromNow(value?: string | null) {
  const ts = parseTimestamp(value);
  if (!Number.isFinite(ts)) return Number.POSITIVE_INFINITY;
  return Math.round((ts - Date.now()) / (1000 * 60));
}

export function getBillingStatusAgeMinutes(expediente: BillingCase) {
  const ts = parseTimestamp(expediente.statusChangedAt || expediente.updatedAt || expediente.createdAt);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / (1000 * 60)));
}

export function formatBillingAgeCompact(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${restMinutes}m`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return `${days}d ${restHours}h`;
}

export function getBillingLockAgeCompact(lock?: BillingCaseLock) {
  if (!lock) return "0m";
  const lockedAt = parseTimestamp(lock.lockedAt);
  if (!Number.isFinite(lockedAt)) return "0m";
  const ageMinutes = Math.max(0, Math.round((Date.now() - lockedAt) / (1000 * 60)));
  return formatBillingAgeCompact(ageMinutes);
}

export function getBillingPrimaryPayer(expediente: BillingCase) {
  if (!expediente.payers.length) return null;
  return [...expediente.payers].sort((a, b) => b.amountAssigned - a.amountAssigned)[0];
}

export function getBillingPriority(expediente: BillingCase): PriorityResult {
  let score = 0;
  const reasons: string[] = [];

  const statusAge = getBillingStatusAgeMinutes(expediente);
  const authDueInMinutes = expediente.authorizations
    .filter((item) => item.status === "PENDIENTE")
    .map((item) => minutesFromNow(item.dueAt))
    .sort((a, b) => a - b)[0];

  if (expediente.serviceArea === "URGENCIAS") {
    score += 45;
    reasons.push("Origen urgencias");
  }

  if (expediente.status === "PENDIENTE_AUTORIZACION") {
    score += 30;
    reasons.push("Autorización pendiente");
    if (Number.isFinite(authDueInMinutes)) {
      if (authDueInMinutes <= 120) {
        score += 45;
        reasons.push("SLA vence en <= 2h");
      } else if (authDueInMinutes <= 360) {
        score += 25;
        reasons.push("SLA vence hoy");
      }
    }
  }

  if (expediente.status === "PENDIENTE_COBRO") {
    score += 32;
    reasons.push("Listo para cobro");
  }

  if (expediente.status === "COBRO_PARCIAL") {
    score += 26;
    reasons.push("Cobro parcial abierto");
  }

  if (expediente.status === "EN_PROCESO") {
    score += 18;
    reasons.push("En proceso");
  }

  if (expediente.balanceAmount >= 5000) {
    score += 28;
    reasons.push("Saldo alto");
  } else if (expediente.balanceAmount >= 2000) {
    score += 18;
    reasons.push("Saldo relevante");
  }

  if (statusAge >= 360) {
    score += 24;
    reasons.push("Antigüedad > 6h");
  } else if (statusAge >= 120) {
    score += 10;
    reasons.push("Antigüedad > 2h");
  }

  if (expediente.lock) {
    const lockAge = Math.max(0, Math.round((Date.now() - parseTimestamp(expediente.lock.lockedAt)) / (1000 * 60)));
    if (lockAge >= 25) {
      score += 12;
      reasons.push("Lock prolongado");
    }
  }

  const level: BillingPriorityLevel = score >= 80 ? "ALTA" : score >= 45 ? "MEDIA" : "BAJA";
  const reason = reasons[0] ?? "Operación estándar";

  return { level, reason, score };
}

export function getBillingPriorityMeta(level: BillingPriorityLevel) {
  if (level === "ALTA") {
    return {
      label: "Alta",
      className: "bg-rose-100 text-rose-700 border-rose-200"
    };
  }
  if (level === "MEDIA") {
    return {
      label: "Media",
      className: "bg-amber-100 text-amber-800 border-amber-200"
    };
  }
  return {
    label: "Baja",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200"
  };
}

export function getBillingQuickActionsAvailability(expediente: BillingCase) {
  const canCollect = ["PENDIENTE_COBRO", "EN_PROCESO", "COBRO_PARCIAL"].includes(expediente.status) && expediente.balanceAmount > 0;
  const canPartial = ["PENDIENTE_COBRO", "EN_PROCESO", "COBRO_PARCIAL"].includes(expediente.status) && expediente.balanceAmount > 0;
  const canCredit = ["PENDIENTE_COBRO", "EN_PROCESO", "COBRO_PARCIAL", "PENDIENTE_AUTORIZACION"].includes(expediente.status);
  const canEmitDocument = expediente.status === "PAGADO_PEND_DOC" || (expediente.balanceAmount <= 0 && expediente.status !== "ANULADO");
  const requiresSupervisor = expediente.status === "AJUSTADO_NC" || expediente.status === "ANULADO";

  return {
    canCollect,
    canPartial,
    canCredit,
    canEmitDocument,
    requiresSupervisor
  };
}

export function buildBillingControlSnapshot(cases: BillingCase[]) {
  const priorities = cases.map((item) => getBillingPriority(item));

  return {
    readyToCollect: cases.filter((item) => item.status === "PENDIENTE_COBRO").length,
    urgent: priorities.filter((priority) => priority.level === "ALTA").length,
    locked: cases.filter((item) => item.lock).length,
    partial: cases.filter((item) => item.status === "COBRO_PARCIAL").length,
    docsPending: cases.filter((item) => item.status === "PAGADO_PEND_DOC").length
  };
}

export function getBillingCollectionProgress(expediente: BillingCase) {
  const total = Math.max(0, expediente.totalAmount);
  if (total === 0) {
    return { ratio: 1, percent: 100 };
  }
  const ratio = Math.max(0, Math.min(1, expediente.paidAmount / total));
  return {
    ratio,
    percent: Math.round(ratio * 100)
  };
}

export function getPaymentMethodLabel(method: BillingPaymentMethod) {
  if (method === "EFECTIVO") return "Efectivo";
  if (method === "TARJETA") return "Tarjeta";
  if (method === "TRANSFERENCIA") return "Transferencia";
  if (method === "ANTICIPO") return "Anticipo";
  return "Crédito";
}
