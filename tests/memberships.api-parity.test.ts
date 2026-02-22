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
