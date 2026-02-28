import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as canonicalPlansGet } from "@/app/api/memberships/plans/route";
import { GET as legacyPlansGet } from "@/app/api/membresias/planes/route";
import { GET as canonicalContractsGet } from "@/app/api/memberships/contracts/route";
import { GET as legacyContractsGet } from "@/app/api/membresias/contratos/route";
import { GET as canonicalConfigGet } from "@/app/api/memberships/config/route";
import { GET as legacyConfigGet } from "@/app/api/membresias/config/route";
import { GET as canonicalCategoriesGet } from "@/app/api/memberships/plan-categories/route";
import { GET as legacyCategoriesGet } from "@/app/api/membresias/catalogos/tipos-plan/route";
import { GET as canonicalClientsGet } from "@/app/api/memberships/clients/route";
import { GET as legacyClientsGet } from "@/app/api/membresias/clientes/route";
import { POST as canonicalPaymentPost } from "@/app/api/memberships/contracts/[id]/payment/route";
import { POST as legacyPaymentPost } from "@/app/api/membresias/contratos/[id]/pago/route";
import { GET as canonicalGatewayGet } from "@/app/api/memberships/config/gateway/route";
import { GET as legacyGatewayGet } from "@/app/api/membresias/config/pasarela/route";
import { POST as canonicalRenewPost } from "@/app/api/memberships/contracts/[id]/renew/route";
import { POST as legacyRenewPost } from "@/app/api/membresias/contratos/[id]/renovar/route";
import { POST as canonicalRecurrentCheckoutPost } from "@/app/api/memberships/contracts/[id]/recurrente/checkout/route";
import { POST as legacyRecurrentCheckoutPost } from "@/app/api/membresias/contratos/[id]/recurrente/checkout/route";

test("legacy/canónico parity: planes (sin sesión)", async () => {
  const canonical = await canonicalPlansGet(new NextRequest("http://localhost:3000/api/memberships/plans"));
  const legacy = await legacyPlansGet(new NextRequest("http://localhost:3000/api/membresias/planes"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: contratos (sin sesión)", async () => {
  const canonical = await canonicalContractsGet(new NextRequest("http://localhost:3000/api/memberships/contracts"));
  const legacy = await legacyContractsGet(new NextRequest("http://localhost:3000/api/membresias/contratos"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: config (sin sesión)", async () => {
  const canonical = await canonicalConfigGet(new NextRequest("http://localhost:3000/api/memberships/config"));
  const legacy = await legacyConfigGet(new NextRequest("http://localhost:3000/api/membresias/config"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: categorías (sin sesión)", async () => {
  const canonical = await canonicalCategoriesGet(new NextRequest("http://localhost:3000/api/memberships/plan-categories"));
  const legacy = await legacyCategoriesGet(new NextRequest("http://localhost:3000/api/membresias/catalogos/tipos-plan"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: clientes (sin sesión)", async () => {
  const canonical = await canonicalClientsGet(new NextRequest("http://localhost:3000/api/memberships/clients?q=jo"));
  const legacy = await legacyClientsGet(new NextRequest("http://localhost:3000/api/membresias/clientes?q=jo"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: pago alias /pago (sin sesión)", async () => {
  const context = { params: Promise.resolve({ id: "contract-id" }) };
  const payload = {
    amount: 1,
    method: "CASH",
    kind: "RENEWAL",
    status: "PAID"
  };

  const canonical = await canonicalPaymentPost(
    new NextRequest("http://localhost:3000/api/memberships/contracts/contract-id/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }),
    context
  );
  const legacy = await legacyPaymentPost(
    new NextRequest("http://localhost:3000/api/membresias/contratos/contract-id/pago", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }),
    context
  );

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: pasarela GET (sin sesión)", async () => {
  const canonical = await canonicalGatewayGet(new NextRequest("http://localhost:3000/api/memberships/config/gateway"));
  const legacy = await legacyGatewayGet(new NextRequest("http://localhost:3000/api/membresias/config/pasarela"));

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: renovar (sin sesión)", async () => {
  const context = { params: Promise.resolve({ id: "contract-id" }) };
  const payload = { markAsPaid: false };

  const canonical = await canonicalRenewPost(
    new NextRequest("http://localhost:3000/api/memberships/contracts/contract-id/renew", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }),
    context
  );
  const legacy = await legacyRenewPost(
    new NextRequest("http://localhost:3000/api/membresias/contratos/contract-id/renovar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }),
    context
  );

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});

test("legacy/canónico parity: recurrente checkout (sin sesión)", async () => {
  const context = { params: Promise.resolve({ id: "contract-id" }) };

  const canonical = await canonicalRecurrentCheckoutPost(
    new NextRequest("http://localhost:3000/api/memberships/contracts/contract-id/recurrente/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    }),
    context
  );
  const legacy = await legacyRecurrentCheckoutPost(
    new NextRequest("http://localhost:3000/api/membresias/contratos/contract-id/recurrente/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    }),
    context
  );

  assert.equal(legacy.status, canonical.status);
  const canonicalJson = await canonical.json();
  const legacyJson = await legacy.json();
  assert.deepEqual(legacyJson, canonicalJson);
});
