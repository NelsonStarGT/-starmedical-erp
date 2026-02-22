import assert from "node:assert/strict";
import test from "node:test";
import { billingCasesMock } from "@/lib/billing/mock";
import { getBillingPriority, getBillingQuickActionsAvailability } from "@/lib/billing/operational";
import { parseBillingFilters } from "@/lib/billing/query";
import { listBillingCasesByTray } from "@/lib/billing/service";
import { canTransitionBillingCase, getAllowedBillingTransitions } from "@/lib/billing/workflow";

test("billing transitions allow valid move and reject invalid move", () => {
  assert.equal(canTransitionBillingCase("PENDIENTE_COBRO", "EN_PROCESO"), true);
  assert.equal(canTransitionBillingCase("PENDIENTE_COBRO", "CERRADO_FACTURADO"), false);

  const allowed = getAllowedBillingTransitions("PAGADO_PEND_DOC");
  assert.deepEqual(allowed, ["CERRADO_FACTURADO", "AJUSTADO_NC"]);
});

test("listBillingCasesByTray returns only matching statuses", () => {
  const pendingAuth = listBillingCasesByTray("PENDIENTE_AUTORIZACION");
  assert.ok(pendingAuth.length > 0);
  assert.ok(pendingAuth.every((item) => item.status === "PENDIENTE_AUTORIZACION"));

  const docsPending = listBillingCasesByTray("DOCUMENTOS_POR_EMITIR");
  assert.ok(docsPending.every((item) => item.status === "PAGADO_PEND_DOC"));
});

test("pending authorization tray is sorted by SLA due date ascending", () => {
  const pendingAuth = listBillingCasesByTray("PENDIENTE_AUTORIZACION");
  assert.ok(pendingAuth.length >= 2);

  const firstDue = Date.parse(pendingAuth[0].authorizations[0]?.dueAt ?? "");
  const secondDue = Date.parse(pendingAuth[1].authorizations[0]?.dueAt ?? "");
  assert.ok(firstDue <= secondDue);
});

test("parseBillingFilters normalizes ALL values and lock checkbox", () => {
  const parsed = parseBillingFilters({
    q: "  marina  ",
    siteId: "ALL",
    payerType: "PACIENTE",
    serviceArea: "ALL",
    onlyLocked: "on"
  });

  assert.equal(parsed.query, "marina");
  assert.equal(parsed.siteId, undefined);
  assert.equal(parsed.payerType, "PACIENTE");
  assert.equal(parsed.serviceArea, "ALL");
  assert.equal(parsed.onlyLocked, true);
});

test("priority marks high-risk urgent collection cases as ALTA", () => {
  const urgentCase = billingCasesMock.find((item) => item.id === "bc-008");
  assert.ok(urgentCase);

  const priority = getBillingPriority(urgentCase);
  assert.equal(priority.level, "ALTA");
});

test("quick actions enforce document emission only when saldo is zero", () => {
  const withBalance = billingCasesMock.find((item) => item.id === "bc-001");
  const paidPendingDoc = billingCasesMock.find((item) => item.id === "bc-006");
  assert.ok(withBalance);
  assert.ok(paidPendingDoc);

  const openActions = getBillingQuickActionsAvailability(withBalance);
  const paidActions = getBillingQuickActionsAvailability(paidPendingDoc);

  assert.equal(openActions.canEmitDocument, false);
  assert.equal(paidActions.canEmitDocument, true);
});
