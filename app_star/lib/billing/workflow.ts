import {
  type BillingCase,
  type BillingCaseFilters,
  type BillingCaseStatus,
  type BillingDashboardSummary,
  type BillingTrayConfig,
  type BillingTrayId
} from "@/lib/billing/types";

export const BILLING_STATE_TRANSITIONS: Record<BillingCaseStatus, BillingCaseStatus[]> = {
  PREPARACION: ["PENDIENTE_AUTORIZACION", "PENDIENTE_COBRO", "ANULADO"],
  PENDIENTE_AUTORIZACION: ["PENDIENTE_COBRO", "CREDITO_ABIERTO", "ANULADO"],
  PENDIENTE_COBRO: ["EN_PROCESO", "CREDITO_ABIERTO", "ANULADO"],
  EN_PROCESO: ["COBRO_PARCIAL", "PAGADO_PEND_DOC", "CREDITO_ABIERTO", "PENDIENTE_COBRO"],
  COBRO_PARCIAL: ["EN_PROCESO", "PAGADO_PEND_DOC", "CREDITO_ABIERTO"],
  CREDITO_ABIERTO: ["COBRO_PARCIAL", "PAGADO_PEND_DOC", "AJUSTADO_NC"],
  PAGADO_PEND_DOC: ["CERRADO_FACTURADO", "AJUSTADO_NC"],
  CERRADO_FACTURADO: ["AJUSTADO_NC"],
  AJUSTADO_NC: [],
  ANULADO: []
};

export const BILLING_TRAYS: BillingTrayConfig[] = [
  {
    id: "PENDIENTES_COBRO",
    name: "Pendientes de cobro",
    description: "Expedientes listos para cobrar.",
    statuses: ["PENDIENTE_COBRO"],
    defaultSort: "AGE_DESC"
  },
  {
    id: "EN_PROCESO",
    name: "En proceso",
    description: "Expedientes con lock activo por usuario.",
    statuses: ["EN_PROCESO"],
    defaultSort: "LOCK_OLDEST"
  },
  {
    id: "COBRO_PARCIAL",
    name: "Cobro parcial / saldo pendiente",
    description: "Expedientes con pago aplicado y saldo abierto.",
    statuses: ["COBRO_PARCIAL"],
    defaultSort: "RISK_DESC"
  },
  {
    id: "CREDITO",
    name: "Crédito (empresas/aseguradoras)",
    description: "Expedientes enviados a crédito.",
    statuses: ["CREDITO_ABIERTO"],
    defaultSort: "DUE_SOON"
  },
  {
    id: "PENDIENTE_AUTORIZACION",
    name: "Pendiente de autorización",
    description: "Esperando aprobación de cobertura o convenio.",
    statuses: ["PENDIENTE_AUTORIZACION"],
    defaultSort: "SLA_SOON"
  },
  {
    id: "ANULACIONES_NC",
    name: "Anulaciones / notas de crédito",
    description: "Ajustes fiscales y anulaciones operativas.",
    statuses: ["AJUSTADO_NC", "ANULADO"],
    defaultSort: "REQUEST_OLDEST"
  },
  {
    id: "DOCUMENTOS_POR_EMITIR",
    name: "Documentos por emitir",
    description: "Expedientes pagados con documento pendiente.",
    statuses: ["PAGADO_PEND_DOC"],
    defaultSort: "PAID_OLDEST"
  }
];

const BILLING_STATUS_LABELS: Record<BillingCaseStatus, string> = {
  PREPARACION: "Preparación",
  PENDIENTE_AUTORIZACION: "Pendiente autorización",
  PENDIENTE_COBRO: "Pendiente cobro",
  EN_PROCESO: "En proceso",
  COBRO_PARCIAL: "Cobro parcial",
  CREDITO_ABIERTO: "Crédito abierto",
  PAGADO_PEND_DOC: "Pagado · pendiente doc",
  CERRADO_FACTURADO: "Cerrado facturado",
  AJUSTADO_NC: "Ajustado NC",
  ANULADO: "Anulado"
};

const BILLING_STATUS_CLASSNAMES: Record<BillingCaseStatus, string> = {
  PREPARACION: "bg-slate-100 text-slate-700",
  PENDIENTE_AUTORIZACION: "bg-[#4aadf5]/15 text-[#2e75ba]",
  PENDIENTE_COBRO: "bg-[#4aa59c]/15 text-[#2f7f77]",
  EN_PROCESO: "bg-[#2e75ba]/15 text-[#2e75ba]",
  COBRO_PARCIAL: "bg-amber-100 text-amber-800",
  CREDITO_ABIERTO: "bg-indigo-100 text-indigo-800",
  PAGADO_PEND_DOC: "bg-cyan-100 text-cyan-800",
  CERRADO_FACTURADO: "bg-emerald-100 text-emerald-800",
  AJUSTADO_NC: "bg-rose-100 text-rose-700",
  ANULADO: "bg-slate-200 text-slate-600"
};

export function getBillingTrayConfig(id: BillingTrayId) {
  return BILLING_TRAYS.find((tray) => tray.id === id) ?? null;
}

export function listBillingTrayConfigs() {
  return BILLING_TRAYS;
}

export function getBillingStatusMeta(status: BillingCaseStatus) {
  return {
    label: BILLING_STATUS_LABELS[status],
    className: BILLING_STATUS_CLASSNAMES[status]
  };
}

export function canTransitionBillingCase(from: BillingCaseStatus, to: BillingCaseStatus) {
  return BILLING_STATE_TRANSITIONS[from].includes(to);
}

export function getAllowedBillingTransitions(status: BillingCaseStatus) {
  return BILLING_STATE_TRANSITIONS[status];
}

export function resolveBillingTrayForCase(expediente: BillingCase): BillingTrayId | null {
  const tray = BILLING_TRAYS.find((item) => item.statuses.includes(expediente.status));
  return tray?.id ?? null;
}

export function filterBillingCases(cases: BillingCase[], filters?: BillingCaseFilters) {
  if (!filters) return cases;
  const normalizedQuery = filters.query?.trim().toLowerCase() ?? "";

  return cases.filter((item) => {
    if (filters.siteId && item.siteId !== filters.siteId) return false;
    if (filters.payerType && filters.payerType !== "ALL" && !item.payers.some((payer) => payer.payerType === filters.payerType)) {
      return false;
    }
    if (filters.serviceArea && filters.serviceArea !== "ALL" && item.serviceArea !== filters.serviceArea) return false;
    if (filters.onlyLocked && !item.lock) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      item.caseNumber,
      item.patientName,
      item.patientCode,
      item.responsibleEntity.name,
      item.episode.visitCode
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function parseDate(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function getCreditDueAt(expediente: BillingCase) {
  const dueDates = expediente.payers
    .map((payer) => payer.creditDueDate)
    .filter((value): value is string => Boolean(value))
    .map((value) => parseDate(value));
  return dueDates.length ? Math.min(...dueDates) : Number.POSITIVE_INFINITY;
}

function getAuthorizationDueAt(expediente: BillingCase) {
  const dueDates = expediente.authorizations
    .filter((auth) => auth.status === "PENDIENTE")
    .map((auth) => parseDate(auth.dueAt));
  return dueDates.length ? Math.min(...dueDates) : Number.POSITIVE_INFINITY;
}

function getRiskScore(expediente: BillingCase) {
  const now = Date.now();
  const ageInDays = Math.max(0, Math.floor((now - parseDate(expediente.createdAt)) / (1000 * 60 * 60 * 24)));
  return expediente.balanceAmount + ageInDays * 7;
}

export function sortBillingCasesByTray(cases: BillingCase[], trayId: BillingTrayId) {
  const tray = getBillingTrayConfig(trayId);
  if (!tray) return cases;

  return [...cases].sort((a, b) => {
    if (tray.defaultSort === "LOCK_OLDEST") {
      return parseDate(a.lock?.lockedAt) - parseDate(b.lock?.lockedAt);
    }
    if (tray.defaultSort === "RISK_DESC") {
      return getRiskScore(b) - getRiskScore(a);
    }
    if (tray.defaultSort === "DUE_SOON") {
      return getCreditDueAt(a) - getCreditDueAt(b);
    }
    if (tray.defaultSort === "SLA_SOON") {
      return getAuthorizationDueAt(a) - getAuthorizationDueAt(b);
    }
    if (tray.defaultSort === "REQUEST_OLDEST") {
      return parseDate(a.updatedAt) - parseDate(b.updatedAt);
    }
    if (tray.defaultSort === "PAID_OLDEST") {
      return parseDate(a.lastPaymentAt) - parseDate(b.lastPaymentAt);
    }
    return parseDate(a.createdAt) - parseDate(b.createdAt);
  });
}

export function computeBillingDashboardSummary(cases: BillingCase[]): BillingDashboardSummary {
  const openStatuses = new Set<BillingCaseStatus>([
    "PENDIENTE_AUTORIZACION",
    "PENDIENTE_COBRO",
    "EN_PROCESO",
    "COBRO_PARCIAL",
    "CREDITO_ABIERTO",
    "PAGADO_PEND_DOC"
  ]);

  const openCases = cases.filter((item) => openStatuses.has(item.status));

  return {
    totalOpenCases: openCases.length,
    totalOpenBalance: openCases.reduce((sum, item) => sum + item.balanceAmount, 0),
    pendingAuthorization: cases.filter((item) => item.status === "PENDIENTE_AUTORIZACION").length,
    lockedByUsers: new Set(cases.filter((item) => item.lock).map((item) => item.lock!.userId)).size,
    pendingDocuments: cases.filter((item) => item.status === "PAGADO_PEND_DOC").length,
    creditOpenAmount: cases
      .filter((item) => item.status === "CREDITO_ABIERTO")
      .reduce((sum, item) => sum + item.balanceAmount, 0),
    partialCollectionCount: cases.filter((item) => item.status === "COBRO_PARCIAL").length
  };
}
