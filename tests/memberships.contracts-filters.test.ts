import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { parseContractsListQuery } from "@/app/api/subscriptions/memberships/contracts/route";

test("contracts filters: acepta q + status + planId + paymentMethod", () => {
  const req = new NextRequest(
    "http://localhost:3000/api/subscriptions/memberships/contracts?q=juan&status=ACTIVO&planId=plan_123&paymentMethod=MANUAL&page=2&take=25"
  );

  const parsed = parseContractsListQuery(req);
  assert.equal(parsed.success, true);

  if (!parsed.success) return;
  assert.equal(parsed.data.q, "juan");
  assert.equal(parsed.data.status, "ACTIVO");
  assert.equal(parsed.data.planId, "plan_123");
  assert.equal(parsed.data.paymentMethod, "MANUAL");
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.take, 25);
});

test("contracts filters: acepta alias search y lo normaliza a q", () => {
  const req = new NextRequest("http://localhost:3000/api/subscriptions/memberships/contracts?search=empresa+demo&take=10");

  const parsed = parseContractsListQuery(req);
  assert.equal(parsed.success, true);

  if (!parsed.success) return;
  assert.equal(parsed.data.search, "empresa demo");
  assert.equal(parsed.data.q, "empresa demo");
  assert.equal(parsed.data.page, 1);
  assert.equal(parsed.data.take, 10);
});

test("contracts filters: q tiene prioridad sobre search cuando ambos existen", () => {
  const req = new NextRequest("http://localhost:3000/api/subscriptions/memberships/contracts?q=nit123&search=ignorar");

  const parsed = parseContractsListQuery(req);
  assert.equal(parsed.success, true);

  if (!parsed.success) return;
  assert.equal(parsed.data.q, "nit123");
  assert.equal(parsed.data.search, "ignorar");
});
