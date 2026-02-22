import { type BillingCase, type BillingCaseStatus, type BillingOriginModule, type BillingPayerType } from "@/lib/billing/types";

type BuildCaseParams = {
  id: string;
  caseNumber: string;
  status: BillingCaseStatus;
  siteId: string;
  siteName: string;
  serviceArea: BillingOriginModule;
  patientName: string;
  patientCode: string;
  responsibleType: "PACIENTE" | "EMPRESA" | "ASEGURADORA";
  responsibleName: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  creditAmount?: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  lastPaymentAt?: string;
  lock?: BillingCase["lock"];
  payerSplits?: Array<{
    payerType: BillingPayerType;
    payerName: string;
    responsibilityPct: number;
    amountAssigned: number;
    amountPaid: number;
    amountPending: number;
    creditDueDate?: string;
  }>;
  authorizations?: Array<{
    payerName: string;
    requestedAt: string;
    dueAt: string;
    status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
    code?: string;
  }>;
  documents?: Array<{
    type: "FACTURA" | "RECIBO" | "NOTA_CREDITO";
    status: "PENDIENTE" | "EMITIDO" | "ANULADO";
    amount: number;
    series?: string;
    folio?: string;
    issuedAt?: string;
  }>;
  tags?: string[];
};

function buildCase(params: BuildCaseParams): BillingCase {
  const payers =
    params.payerSplits?.map((split, index) => ({
      id: `${params.id}-payer-${index + 1}`,
      payerType: split.payerType,
      payerName: split.payerName,
      responsibilityPct: split.responsibilityPct,
      amountAssigned: split.amountAssigned,
      amountPaid: split.amountPaid,
      amountPending: split.amountPending,
      creditDueDate: split.creditDueDate
    })) ?? [
      {
        id: `${params.id}-payer-1`,
        payerType: "PACIENTE" as const,
        payerName: params.patientName,
        responsibilityPct: 100,
        amountAssigned: params.totalAmount,
        amountPaid: params.paidAmount,
        amountPending: params.balanceAmount
      }
    ];

  return {
    id: params.id,
    caseNumber: params.caseNumber,
    status: params.status,
    siteId: params.siteId,
    siteName: params.siteName,
    serviceArea: params.serviceArea,
    patientName: params.patientName,
    patientCode: params.patientCode,
    responsibleEntity: {
      id: `${params.id}-responsable`,
      type: params.responsibleType,
      name: params.responsibleName
    },
    episode: {
      id: `${params.id}-episode`,
      visitCode: `VIS-${params.caseNumber.slice(-4)}`,
      occurredAt: params.createdAt,
      origin: params.serviceArea,
      branchId: params.siteId,
      branchName: params.siteName
    },
    totalAmount: params.totalAmount,
    paidAmount: params.paidAmount,
    balanceAmount: params.balanceAmount,
    creditAmount: params.creditAmount ?? 0,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
    statusChangedAt: params.statusChangedAt,
    lastPaymentAt: params.lastPaymentAt,
    lock: params.lock,
    items: [
      {
        id: `${params.id}-item-1`,
        code: `SRV-${params.caseNumber.slice(-3)}`,
        description: `Servicio ${params.serviceArea.toLowerCase()} principal`,
        kind: "SERVICIO",
        quantity: 1,
        unitPrice: Math.max(0, params.totalAmount - 80),
        discountAmount: 0,
        taxAmount: 40,
        totalAmount: Math.max(0, params.totalAmount - 40),
        origin: params.serviceArea
      },
      {
        id: `${params.id}-item-2`,
        code: `INS-${params.caseNumber.slice(-3)}`,
        description: "Insumos y administración",
        kind: "PRODUCTO",
        quantity: 1,
        unitPrice: 40,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 40,
        origin: params.serviceArea
      }
    ],
    payers,
    payments: params.paidAmount
      ? [
          {
            id: `${params.id}-payment-1`,
            appliedAt: params.lastPaymentAt ?? params.updatedAt,
            method: params.status === "CREDITO_ABIERTO" ? "CREDITO" : "TARJETA",
            reference: `REF-${params.caseNumber.slice(-4)}`,
            cashierUserName: "Caja central",
            amount: params.paidAmount
          }
        ]
      : [],
    authorizations:
      params.authorizations?.map((auth, index) => ({
        id: `${params.id}-auth-${index + 1}`,
        payerName: auth.payerName,
        requestedAt: auth.requestedAt,
        dueAt: auth.dueAt,
        status: auth.status,
        code: auth.code
      })) ?? [],
    documents:
      params.documents?.map((doc, index) => ({
        id: `${params.id}-doc-${index + 1}`,
        type: doc.type,
        status: doc.status,
        amount: doc.amount,
        series: doc.series,
        folio: doc.folio,
        issuedAt: doc.issuedAt
      })) ?? [],
    auditTrail: [
      {
        id: `${params.id}-audit-1`,
        happenedAt: params.createdAt,
        actorName: "Sistema",
        action: "Expediente creado",
        details: `Origen: ${params.serviceArea}`
      },
      {
        id: `${params.id}-audit-2`,
        happenedAt: params.statusChangedAt,
        actorName: params.lock?.userName ?? "Caja central",
        action: `Estado ${params.status}`,
        details: "Actualización operativa"
      }
    ],
    tags: params.tags
  };
}

export const billingCasesMock: BillingCase[] = [
  buildCase({
    id: "bc-001",
    caseNumber: "EXP-FA-0001",
    status: "PENDIENTE_COBRO",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "CONSULTA",
    patientName: "Marina Castillo",
    patientCode: "PAC-0012",
    responsibleType: "PACIENTE",
    responsibleName: "Marina Castillo",
    totalAmount: 520,
    paidAmount: 0,
    balanceAmount: 520,
    createdAt: "2026-02-06T08:15:00.000Z",
    updatedAt: "2026-02-07T06:20:00.000Z",
    statusChangedAt: "2026-02-07T06:20:00.000Z",
    tags: ["Consulta externa"]
  }),
  buildCase({
    id: "bc-002",
    caseNumber: "EXP-FA-0002",
    status: "EN_PROCESO",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "LAB",
    patientName: "Oscar Mérida",
    patientCode: "PAC-0034",
    responsibleType: "PACIENTE",
    responsibleName: "Oscar Mérida",
    totalAmount: 1380,
    paidAmount: 400,
    balanceAmount: 980,
    createdAt: "2026-02-06T09:00:00.000Z",
    updatedAt: "2026-02-07T07:45:00.000Z",
    statusChangedAt: "2026-02-07T07:45:00.000Z",
    lastPaymentAt: "2026-02-07T07:30:00.000Z",
    lock: {
      userId: "usr-caja-03",
      userName: "Andrea Morales",
      lockedAt: "2026-02-07T07:40:00.000Z",
      lockExpiresAt: "2026-02-07T08:10:00.000Z"
    },
    tags: ["Panel hematología"]
  }),
  buildCase({
    id: "bc-003",
    caseNumber: "EXP-FA-0003",
    status: "COBRO_PARCIAL",
    siteId: "sede-z14",
    siteName: "Sede Zona 14",
    serviceArea: "RX",
    patientName: "Jorge Juárez",
    patientCode: "PAC-0102",
    responsibleType: "PACIENTE",
    responsibleName: "Jorge Juárez",
    totalAmount: 890,
    paidAmount: 300,
    balanceAmount: 590,
    createdAt: "2026-02-05T11:10:00.000Z",
    updatedAt: "2026-02-06T15:10:00.000Z",
    statusChangedAt: "2026-02-06T15:10:00.000Z",
    lastPaymentAt: "2026-02-06T15:00:00.000Z"
  }),
  buildCase({
    id: "bc-004",
    caseNumber: "EXP-FA-0004",
    status: "CREDITO_ABIERTO",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "HOSPITALIZACION",
    patientName: "Karla Ponce",
    patientCode: "PAC-0201",
    responsibleType: "EMPRESA",
    responsibleName: "Industrial Norte S.A.",
    totalAmount: 7200,
    paidAmount: 0,
    balanceAmount: 7200,
    creditAmount: 7200,
    createdAt: "2026-02-01T12:10:00.000Z",
    updatedAt: "2026-02-06T19:45:00.000Z",
    statusChangedAt: "2026-02-06T19:45:00.000Z",
    payerSplits: [
      {
        payerType: "EMPRESA",
        payerName: "Industrial Norte S.A.",
        responsibilityPct: 80,
        amountAssigned: 5760,
        amountPaid: 0,
        amountPending: 5760,
        creditDueDate: "2026-02-12T00:00:00.000Z"
      },
      {
        payerType: "PACIENTE",
        payerName: "Karla Ponce",
        responsibilityPct: 20,
        amountAssigned: 1440,
        amountPaid: 0,
        amountPending: 1440
      }
    ],
    tags: ["Empresa convenio"]
  }),
  buildCase({
    id: "bc-005",
    caseNumber: "EXP-FA-0005",
    status: "PENDIENTE_AUTORIZACION",
    siteId: "sede-z14",
    siteName: "Sede Zona 14",
    serviceArea: "US",
    patientName: "Ana de León",
    patientCode: "PAC-0007",
    responsibleType: "ASEGURADORA",
    responsibleName: "Aseguradora Central",
    totalAmount: 1640,
    paidAmount: 0,
    balanceAmount: 1640,
    createdAt: "2026-02-07T05:20:00.000Z",
    updatedAt: "2026-02-07T07:10:00.000Z",
    statusChangedAt: "2026-02-07T07:10:00.000Z",
    authorizations: [
      {
        payerName: "Aseguradora Central",
        requestedAt: "2026-02-07T05:25:00.000Z",
        dueAt: "2026-02-07T11:30:00.000Z",
        status: "PENDIENTE"
      }
    ]
  }),
  buildCase({
    id: "bc-006",
    caseNumber: "EXP-FA-0006",
    status: "PAGADO_PEND_DOC",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "FARMACIA",
    patientName: "Elías Vargas",
    patientCode: "PAC-0431",
    responsibleType: "PACIENTE",
    responsibleName: "Elías Vargas",
    totalAmount: 430,
    paidAmount: 430,
    balanceAmount: 0,
    createdAt: "2026-02-07T06:40:00.000Z",
    updatedAt: "2026-02-07T07:15:00.000Z",
    statusChangedAt: "2026-02-07T07:15:00.000Z",
    lastPaymentAt: "2026-02-07T07:10:00.000Z",
    documents: [{ type: "FACTURA", status: "PENDIENTE", amount: 430, series: "A" }]
  }),
  buildCase({
    id: "bc-007",
    caseNumber: "EXP-FA-0007",
    status: "AJUSTADO_NC",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "LAB",
    patientName: "Silvia Mena",
    patientCode: "PAC-0066",
    responsibleType: "PACIENTE",
    responsibleName: "Silvia Mena",
    totalAmount: 980,
    paidAmount: 980,
    balanceAmount: 0,
    createdAt: "2026-02-03T10:00:00.000Z",
    updatedAt: "2026-02-07T06:55:00.000Z",
    statusChangedAt: "2026-02-07T06:55:00.000Z",
    lastPaymentAt: "2026-02-03T10:20:00.000Z",
    documents: [
      { type: "FACTURA", status: "EMITIDO", amount: 980, series: "B", folio: "000123", issuedAt: "2026-02-03T10:25:00.000Z" },
      { type: "NOTA_CREDITO", status: "EMITIDO", amount: 120, series: "NC", folio: "000033", issuedAt: "2026-02-07T06:50:00.000Z" }
    ]
  }),
  buildCase({
    id: "bc-008",
    caseNumber: "EXP-FA-0008",
    status: "PENDIENTE_COBRO",
    siteId: "sede-z14",
    siteName: "Sede Zona 14",
    serviceArea: "URGENCIAS",
    patientName: "Noé Gálvez",
    patientCode: "PAC-0781",
    responsibleType: "PACIENTE",
    responsibleName: "Noé Gálvez",
    totalAmount: 2120,
    paidAmount: 0,
    balanceAmount: 2120,
    createdAt: "2026-02-07T03:00:00.000Z",
    updatedAt: "2026-02-07T06:00:00.000Z",
    statusChangedAt: "2026-02-07T06:00:00.000Z",
    tags: ["Urgencia"]
  }),
  buildCase({
    id: "bc-009",
    caseNumber: "EXP-FA-0009",
    status: "EN_PROCESO",
    siteId: "sede-coban",
    siteName: "Sede Cobán",
    serviceArea: "CONSULTA",
    patientName: "Tania Monroy",
    patientCode: "PAC-0051",
    responsibleType: "PACIENTE",
    responsibleName: "Tania Monroy",
    totalAmount: 650,
    paidAmount: 0,
    balanceAmount: 650,
    createdAt: "2026-02-07T05:00:00.000Z",
    updatedAt: "2026-02-07T07:50:00.000Z",
    statusChangedAt: "2026-02-07T07:50:00.000Z",
    lock: {
      userId: "usr-caja-08",
      userName: "Luis Morales",
      lockedAt: "2026-02-07T07:42:00.000Z",
      lockExpiresAt: "2026-02-07T08:12:00.000Z"
    }
  }),
  buildCase({
    id: "bc-010",
    caseNumber: "EXP-FA-0010",
    status: "COBRO_PARCIAL",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "DOMICILIARIA",
    patientName: "Carmen Ríos",
    patientCode: "PAC-0319",
    responsibleType: "PACIENTE",
    responsibleName: "Carmen Ríos",
    totalAmount: 1500,
    paidAmount: 300,
    balanceAmount: 1200,
    createdAt: "2026-02-04T11:00:00.000Z",
    updatedAt: "2026-02-06T13:20:00.000Z",
    statusChangedAt: "2026-02-06T13:20:00.000Z",
    lastPaymentAt: "2026-02-06T13:15:00.000Z"
  }),
  buildCase({
    id: "bc-011",
    caseNumber: "EXP-FA-0011",
    status: "CREDITO_ABIERTO",
    siteId: "sede-z14",
    siteName: "Sede Zona 14",
    serviceArea: "LAB",
    patientName: "Mario Cortés",
    patientCode: "PAC-0190",
    responsibleType: "ASEGURADORA",
    responsibleName: "Seguros Vida Plus",
    totalAmount: 4980,
    paidAmount: 0,
    balanceAmount: 4980,
    creditAmount: 4980,
    createdAt: "2026-02-02T15:00:00.000Z",
    updatedAt: "2026-02-06T18:20:00.000Z",
    statusChangedAt: "2026-02-06T18:20:00.000Z",
    payerSplits: [
      {
        payerType: "ASEGURADORA",
        payerName: "Seguros Vida Plus",
        responsibilityPct: 90,
        amountAssigned: 4482,
        amountPaid: 0,
        amountPending: 4482,
        creditDueDate: "2026-02-10T00:00:00.000Z"
      },
      {
        payerType: "PACIENTE",
        payerName: "Mario Cortés",
        responsibilityPct: 10,
        amountAssigned: 498,
        amountPaid: 0,
        amountPending: 498
      }
    ]
  }),
  buildCase({
    id: "bc-012",
    caseNumber: "EXP-FA-0012",
    status: "PENDIENTE_AUTORIZACION",
    siteId: "sede-coban",
    siteName: "Sede Cobán",
    serviceArea: "HOSPITALIZACION",
    patientName: "Marcos Caal",
    patientCode: "PAC-0810",
    responsibleType: "EMPRESA",
    responsibleName: "Textiles Alta Verapaz",
    totalAmount: 8900,
    paidAmount: 0,
    balanceAmount: 8900,
    createdAt: "2026-02-06T12:30:00.000Z",
    updatedAt: "2026-02-07T04:30:00.000Z",
    statusChangedAt: "2026-02-07T04:30:00.000Z",
    authorizations: [
      {
        payerName: "Textiles Alta Verapaz",
        requestedAt: "2026-02-06T12:40:00.000Z",
        dueAt: "2026-02-07T09:00:00.000Z",
        status: "PENDIENTE"
      }
    ],
    tags: ["Internamiento"]
  }),
  buildCase({
    id: "bc-013",
    caseNumber: "EXP-FA-0013",
    status: "PAGADO_PEND_DOC",
    siteId: "sede-z14",
    siteName: "Sede Zona 14",
    serviceArea: "MEMBRESIAS",
    patientName: "Rosa Valdez",
    patientCode: "PAC-0981",
    responsibleType: "PACIENTE",
    responsibleName: "Rosa Valdez",
    totalAmount: 780,
    paidAmount: 780,
    balanceAmount: 0,
    createdAt: "2026-02-07T02:05:00.000Z",
    updatedAt: "2026-02-07T06:02:00.000Z",
    statusChangedAt: "2026-02-07T06:02:00.000Z",
    lastPaymentAt: "2026-02-07T05:55:00.000Z",
    documents: [{ type: "FACTURA", status: "PENDIENTE", amount: 780, series: "M" }]
  }),
  buildCase({
    id: "bc-014",
    caseNumber: "EXP-FA-0014",
    status: "ANULADO",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "RX",
    patientName: "Javier Meneses",
    patientCode: "PAC-0115",
    responsibleType: "PACIENTE",
    responsibleName: "Javier Meneses",
    totalAmount: 430,
    paidAmount: 0,
    balanceAmount: 0,
    createdAt: "2026-02-01T10:20:00.000Z",
    updatedAt: "2026-02-06T09:20:00.000Z",
    statusChangedAt: "2026-02-06T09:20:00.000Z",
    documents: [{ type: "FACTURA", status: "ANULADO", amount: 430, series: "A", folio: "000982" }]
  }),
  buildCase({
    id: "bc-015",
    caseNumber: "EXP-FA-0015",
    status: "CERRADO_FACTURADO",
    siteId: "sede-z10",
    siteName: "Sede Zona 10",
    serviceArea: "CONSULTA",
    patientName: "Mónica Santos",
    patientCode: "PAC-0733",
    responsibleType: "PACIENTE",
    responsibleName: "Mónica Santos",
    totalAmount: 560,
    paidAmount: 560,
    balanceAmount: 0,
    createdAt: "2026-02-05T09:10:00.000Z",
    updatedAt: "2026-02-05T09:42:00.000Z",
    statusChangedAt: "2026-02-05T09:42:00.000Z",
    lastPaymentAt: "2026-02-05T09:40:00.000Z",
    documents: [{ type: "FACTURA", status: "EMITIDO", amount: 560, series: "A", folio: "001032", issuedAt: "2026-02-05T09:42:00.000Z" }]
  }),
  buildCase({
    id: "bc-016",
    caseNumber: "EXP-FA-0016",
    status: "PREPARACION",
    siteId: "sede-coban",
    siteName: "Sede Cobán",
    serviceArea: "FARMACIA",
    patientName: "Luisa Coy",
    patientCode: "PAC-0678",
    responsibleType: "PACIENTE",
    responsibleName: "Luisa Coy",
    totalAmount: 320,
    paidAmount: 0,
    balanceAmount: 320,
    createdAt: "2026-02-07T07:10:00.000Z",
    updatedAt: "2026-02-07T07:12:00.000Z",
    statusChangedAt: "2026-02-07T07:12:00.000Z"
  })
];

export const billingSitesMock = [
  { id: "ALL", label: "Todas las sedes" },
  { id: "sede-z10", label: "Sede Zona 10" },
  { id: "sede-z14", label: "Sede Zona 14" },
  { id: "sede-coban", label: "Sede Cobán" }
];

export const billingServiceAreasMock: Array<{ id: BillingOriginModule | "ALL"; label: string }> = [
  { id: "ALL", label: "Todas las áreas" },
  { id: "CONSULTA", label: "Consulta" },
  { id: "URGENCIAS", label: "Urgencias" },
  { id: "LAB", label: "Laboratorio" },
  { id: "RX", label: "Rayos X" },
  { id: "US", label: "Ultrasonido" },
  { id: "FARMACIA", label: "Farmacia" },
  { id: "MEMBRESIAS", label: "Membresías" },
  { id: "HOSPITALIZACION", label: "Hospitalización" },
  { id: "DOMICILIARIA", label: "Domiciliaria" }
];

export const billingPayerTypesMock: Array<{ id: BillingPayerType | "ALL"; label: string }> = [
  { id: "ALL", label: "Todos los pagadores" },
  { id: "PACIENTE", label: "Paciente" },
  { id: "EMPRESA", label: "Empresa" },
  { id: "ASEGURADORA", label: "Aseguradora" },
  { id: "MEMBRESIA", label: "Membresía" }
];
