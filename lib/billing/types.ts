export const BILLING_CASE_STATUSES = [
  "PREPARACION",
  "PENDIENTE_AUTORIZACION",
  "PENDIENTE_COBRO",
  "EN_PROCESO",
  "COBRO_PARCIAL",
  "CREDITO_ABIERTO",
  "PAGADO_PEND_DOC",
  "CERRADO_FACTURADO",
  "AJUSTADO_NC",
  "ANULADO"
] as const;

export type BillingCaseStatus = (typeof BILLING_CASE_STATUSES)[number];

export const BILLING_TRAY_IDS = [
  "PENDIENTES_COBRO",
  "EN_PROCESO",
  "COBRO_PARCIAL",
  "CREDITO",
  "PENDIENTE_AUTORIZACION",
  "ANULACIONES_NC",
  "DOCUMENTOS_POR_EMITIR"
] as const;

export type BillingTrayId = (typeof BILLING_TRAY_IDS)[number];

export type BillingPayerType = "PACIENTE" | "EMPRESA" | "ASEGURADORA" | "MEMBRESIA";

export type BillingOriginModule =
  | "CONSULTA"
  | "URGENCIAS"
  | "LAB"
  | "RX"
  | "US"
  | "FARMACIA"
  | "MEMBRESIAS"
  | "HOSPITALIZACION"
  | "DOMICILIARIA";

export type BillingPaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "ANTICIPO" | "CREDITO";

export type BillingDocumentType = "FACTURA" | "RECIBO" | "NOTA_CREDITO";

export type BillingDocumentStatus = "PENDIENTE" | "EMITIDO" | "ANULADO";

export type BillingAuthorizationStatus = "PENDIENTE" | "APROBADA" | "RECHAZADA";

export type BillingCaseLock = {
  userId: string;
  userName: string;
  lockedAt: string;
  lockExpiresAt: string;
};

export type BillingCaseParty = {
  id: string;
  type: "PACIENTE" | "EMPRESA" | "ASEGURADORA";
  name: string;
  taxId?: string;
};

export type BillingEpisodeRef = {
  id: string;
  visitCode: string;
  occurredAt: string;
  origin: BillingOriginModule;
  branchId: string;
  branchName: string;
};

export type BillingCaseItem = {
  id: string;
  code: string;
  description: string;
  kind: "SERVICIO" | "PRODUCTO" | "PAQUETE";
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  origin: BillingOriginModule;
};

export type BillingCasePayerSplit = {
  id: string;
  payerType: BillingPayerType;
  payerId?: string;
  payerName: string;
  responsibilityPct: number;
  amountAssigned: number;
  amountPaid: number;
  amountPending: number;
  creditDueDate?: string;
};

export type BillingCasePayment = {
  id: string;
  appliedAt: string;
  method: BillingPaymentMethod;
  reference?: string;
  cashierUserName: string;
  amount: number;
};

export type BillingCaseAuthorization = {
  id: string;
  payerName: string;
  requestedAt: string;
  dueAt: string;
  status: BillingAuthorizationStatus;
  code?: string;
};

export type BillingCaseDocument = {
  id: string;
  type: BillingDocumentType;
  status: BillingDocumentStatus;
  series?: string;
  folio?: string;
  issuedAt?: string;
  amount: number;
};

export type BillingCaseAuditEvent = {
  id: string;
  happenedAt: string;
  actorName: string;
  action: string;
  details?: string;
};

export type BillingCase = {
  id: string;
  caseNumber: string;
  status: BillingCaseStatus;
  siteId: string;
  siteName: string;
  serviceArea: BillingOriginModule;
  patientName: string;
  patientCode: string;
  responsibleEntity: BillingCaseParty;
  episode: BillingEpisodeRef;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  creditAmount: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  lastPaymentAt?: string;
  lock?: BillingCaseLock;
  items: BillingCaseItem[];
  payers: BillingCasePayerSplit[];
  payments: BillingCasePayment[];
  authorizations: BillingCaseAuthorization[];
  documents: BillingCaseDocument[];
  auditTrail: BillingCaseAuditEvent[];
  tags?: string[];
};

export type BillingTrayConfig = {
  id: BillingTrayId;
  name: string;
  description: string;
  statuses: BillingCaseStatus[];
  defaultSort:
    | "AGE_DESC"
    | "LOCK_OLDEST"
    | "RISK_DESC"
    | "DUE_SOON"
    | "SLA_SOON"
    | "REQUEST_OLDEST"
    | "PAID_OLDEST";
};

export type BillingCaseFilters = {
  query?: string;
  siteId?: string;
  payerType?: BillingPayerType | "ALL";
  serviceArea?: BillingOriginModule | "ALL";
  onlyLocked?: boolean;
};

export type BillingDashboardSummary = {
  totalOpenCases: number;
  totalOpenBalance: number;
  pendingAuthorization: number;
  lockedByUsers: number;
  pendingDocuments: number;
  creditOpenAmount: number;
  partialCollectionCount: number;
};
