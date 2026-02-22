import {
  billingCasesMock,
  billingPayerTypesMock,
  billingServiceAreasMock,
  billingSitesMock
} from "@/lib/billing/mock";
import {
  type BillingCase,
  type BillingCaseFilters,
  type BillingDocumentType,
  type BillingPaymentMethod,
  type BillingTrayId
} from "@/lib/billing/types";
import {
  computeBillingDashboardSummary,
  filterBillingCases,
  listBillingTrayConfigs,
  resolveBillingTrayForCase,
  sortBillingCasesByTray
} from "@/lib/billing/workflow";

export function listBillingCases() {
  return billingCasesMock;
}

export function getBillingCaseById(caseId: string) {
  return billingCasesMock.find((item) => item.id === caseId) ?? null;
}

export function listBillingCasesByTray(trayId: BillingTrayId, filters?: BillingCaseFilters) {
  const filtered = filterBillingCases(billingCasesMock, filters).filter((item) => resolveBillingTrayForCase(item) === trayId);
  return sortBillingCasesByTray(filtered, trayId);
}

export function listBillingDashboardSummary(filters?: BillingCaseFilters) {
  const filtered = filterBillingCases(billingCasesMock, filters);
  return computeBillingDashboardSummary(filtered);
}

export function listBillingStatsByTray(filters?: BillingCaseFilters) {
  const filtered = filterBillingCases(billingCasesMock, filters);
  const trays = listBillingTrayConfigs();
  return trays.map((tray) => ({
    ...tray,
    count: filtered.filter((item) => tray.statuses.includes(item.status)).length,
    balance: filtered
      .filter((item) => tray.statuses.includes(item.status))
      .reduce((sum, item) => sum + item.balanceAmount, 0)
  }));
}

export function listBillingFilterOptions() {
  return {
    sites: billingSitesMock,
    payerTypes: billingPayerTypesMock,
    serviceAreas: billingServiceAreasMock
  };
}

export type BillingQuickActionType = "COBRAR" | "ABONO" | "CREDITO" | "EMITIR_DOC";

export type BillingQuickActionInput = {
  caseId: string;
  action: BillingQuickActionType;
  amount?: number;
  paymentMethod?: BillingPaymentMethod;
  reference?: string;
  creditDueDate?: string;
  actorName: string;
};

function cloneBillingCase(item: BillingCase) {
  return JSON.parse(JSON.stringify(item)) as BillingCase;
}

function recalculatePayerPending(caseRecord: BillingCase) {
  if (!caseRecord.payers.length) return;
  const totalAssigned = caseRecord.payers.reduce((sum, payer) => sum + payer.amountAssigned, 0);
  if (totalAssigned <= 0) return;
  caseRecord.payers.forEach((payer) => {
    const ratio = payer.amountAssigned / totalAssigned;
    const shouldBePaid = Math.min(payer.amountAssigned, Math.max(0, caseRecord.paidAmount * ratio));
    payer.amountPaid = Number(shouldBePaid.toFixed(2));
    payer.amountPending = Number(Math.max(0, payer.amountAssigned - payer.amountPaid).toFixed(2));
  });
}

function appendAudit(caseRecord: BillingCase, actorName: string, action: string, details?: string) {
  caseRecord.auditTrail.unshift({
    id: `${caseRecord.id}-audit-${Date.now()}-${Math.floor(Math.random() * 9_999)}`,
    happenedAt: new Date().toISOString(),
    actorName,
    action,
    details
  });
}

function normalizeAmount(value: number) {
  return Number(Math.max(0, value).toFixed(2));
}

function ensureCaseBalanceConsistency(caseRecord: BillingCase) {
  caseRecord.totalAmount = normalizeAmount(caseRecord.totalAmount);
  caseRecord.paidAmount = normalizeAmount(Math.min(caseRecord.totalAmount, caseRecord.paidAmount));
  caseRecord.balanceAmount = normalizeAmount(Math.max(0, caseRecord.totalAmount - caseRecord.paidAmount));
}

function generateDocumentFolio(caseRecord: BillingCase) {
  const serial = String(Date.now()).slice(-6);
  return `${caseRecord.caseNumber.slice(-3)}${serial}`;
}

export function applyBillingQuickAction(input: BillingQuickActionInput) {
  const index = billingCasesMock.findIndex((item) => item.id === input.caseId);
  if (index < 0) {
    throw new Error("Expediente no encontrado");
  }

  const target = billingCasesMock[index];
  const before = cloneBillingCase(target);
  const now = new Date().toISOString();

  if (input.action === "COBRAR" || input.action === "ABONO") {
    const amount = normalizeAmount(input.amount ?? 0);
    if (amount <= 0) {
      throw new Error("Monto inválido");
    }
    if (amount > target.balanceAmount) {
      throw new Error("El monto excede el saldo pendiente");
    }
    const method = input.paymentMethod ?? "EFECTIVO";

    target.payments.unshift({
      id: `${target.id}-payment-${Date.now()}`,
      appliedAt: now,
      method,
      reference: input.reference?.trim() || undefined,
      cashierUserName: input.actorName,
      amount
    });
    target.paidAmount = normalizeAmount(target.paidAmount + amount);
    ensureCaseBalanceConsistency(target);
    recalculatePayerPending(target);
    target.lastPaymentAt = now;
    target.updatedAt = now;

    if (target.balanceAmount <= 0) {
      target.status = "PAGADO_PEND_DOC";
      target.statusChangedAt = now;
      appendAudit(target, input.actorName, "Cobro aplicado", `Saldo liquidado por ${amount.toFixed(2)}`);
    } else {
      target.status = "COBRO_PARCIAL";
      target.statusChangedAt = now;
      appendAudit(target, input.actorName, "Abono aplicado", `Monto ${amount.toFixed(2)}; saldo ${target.balanceAmount.toFixed(2)}`);
    }
  } else if (input.action === "CREDITO") {
    const dueDate = input.creditDueDate ? new Date(input.creditDueDate).toISOString() : undefined;
    target.status = "CREDITO_ABIERTO";
    target.creditAmount = normalizeAmount(target.balanceAmount);
    target.updatedAt = now;
    target.statusChangedAt = now;
    if (dueDate) {
      target.payers = target.payers.map((payer) => {
        if (payer.payerType === "EMPRESA" || payer.payerType === "ASEGURADORA") {
          return { ...payer, creditDueDate: dueDate };
        }
        return payer;
      });
    }
    appendAudit(target, input.actorName, "Crédito asignado", dueDate ? `Vence ${dueDate}` : "Crédito sin fecha explícita");
  } else if (input.action === "EMITIR_DOC") {
    if (target.balanceAmount > 0) {
      throw new Error("No se puede emitir documento con saldo pendiente");
    }

    const existingPendingInvoice = target.documents.find((doc) => doc.type === "FACTURA" && doc.status === "PENDIENTE");
    if (existingPendingInvoice) {
      existingPendingInvoice.status = "EMITIDO";
      existingPendingInvoice.issuedAt = now;
      existingPendingInvoice.folio = existingPendingInvoice.folio || generateDocumentFolio(target);
      existingPendingInvoice.series = existingPendingInvoice.series || "A";
    } else {
      const docType: BillingDocumentType = "FACTURA";
      target.documents.unshift({
        id: `${target.id}-doc-${Date.now()}`,
        type: docType,
        status: "EMITIDO",
        series: "A",
        folio: generateDocumentFolio(target),
        issuedAt: now,
        amount: target.totalAmount
      });
    }

    target.status = "CERRADO_FACTURADO";
    target.updatedAt = now;
    target.statusChangedAt = now;
    appendAudit(target, input.actorName, "Documento emitido", "Factura emitida y expediente cerrado");
  }

  return {
    before,
    after: cloneBillingCase(target)
  };
}
