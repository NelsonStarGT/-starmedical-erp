#!/usr/bin/env tsx

/**
 * Smoke E2E: Inventario -> Search -> Crear plan -> Afiliar (manual)
 *
 * Uso rápido:
 *   BASE_URL=http://localhost:3000 npx tsx scripts/smoke/subscriptions-e2e.ts
 *
 * Auth:
 * - Si el backend está en modo dev fallback por rol: enviar SMOKE_ROLE (default Administrador)
 * - Si requiere sesión real: enviar SMOKE_COOKIE="star-erp-session=..."
 */

type JsonRecord = Record<string, unknown>;

type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  url: string;
  json: T | null;
  text: string;
};

type InventorySearchRow = {
  type: "PRODUCT" | "SERVICE" | "COMBO";
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  active: boolean;
};

type PlanCreateResponse = {
  data?: {
    id?: string;
    slug?: string;
    name?: string;
  };
  error?: string;
};

type EnrollResponse = {
  data?: {
    contractId?: string;
    status?: string;
    draftInvoiceUrl?: string | null;
    checkoutUrl?: string | null;
  };
  error?: string;
};

const BASE_URL = String(process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15_000);
const SMOKE_ROLE = String(process.env.SMOKE_ROLE || "Administrador").trim();
const SMOKE_COOKIE = String(process.env.SMOKE_COOKIE || "").trim();
const SMOKE_PATIENT_ID = String(process.env.SMOKE_PATIENT_ID || "").trim();
const SMOKE_PLAN_ID = String(process.env.SMOKE_PLAN_ID || "").trim();

function info(message: string) {
  console.log(`[INFO] ${message}`);
}

function pass(message: string) {
  console.log(`[PASS] ${message}`);
}

function warn(message: string) {
  console.warn(`[WARN] ${message}`);
}

function fail(message: string) {
  console.error(`[FAIL] ${message}`);
}

function authHeaders(withJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (withJson) {
    headers["Content-Type"] = "application/json";
  }

  if (SMOKE_ROLE) {
    headers["x-role"] = SMOKE_ROLE;
  }

  if (SMOKE_COOKIE) {
    headers.cookie = SMOKE_COOKIE;
  }

  return headers;
}

async function fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store"
    });

    const text = await response.text();
    let json: T | null = null;

    if (text) {
      try {
        json = JSON.parse(text) as T;
      } catch {
        json = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      json,
      text
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isAuthStatus(status: number) {
  return status === 401 || status === 403;
}

async function inventoryCountsProbe() {
  const endpoints = [
    { key: "PRODUCT", path: "/api/inventario/productos" },
    { key: "SERVICE", path: "/api/inventario/servicios" },
    { key: "COMBO", path: "/api/inventario/combos" }
  ] as const;

  const counts: Record<string, number> = {
    PRODUCT: 0,
    SERVICE: 0,
    COMBO: 0
  };

  for (const endpoint of endpoints) {
    const res = await fetchJson<{ data?: unknown[]; error?: string }>(endpoint.path, {
      method: "GET",
      headers: authHeaders(false)
    });

    if (!res.ok) {
      if (isAuthStatus(res.status)) {
        warn(`No autorizado en ${endpoint.path} (status=${res.status}). Se continúa con validación de search.`);
        continue;
      }
      throw new Error(`Error consultando ${endpoint.path} (status=${res.status})`);
    }

    const rows = Array.isArray(res.json?.data) ? res.json?.data || [] : [];
    counts[endpoint.key] = rows.length;
    info(`${endpoint.path} -> ${rows.length} registros`);
  }

  return counts;
}

function isValidSearchRow(row: unknown): row is InventorySearchRow {
  if (!row || typeof row !== "object") return false;
  const value = row as Record<string, unknown>;
  const type = String(value.type || "");
  return (
    (type === "PRODUCT" || type === "SERVICE" || type === "COMBO") &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}

async function validateInventorySearch(inventoryCounts: Record<string, number>) {
  const types: Array<"PRODUCT" | "SERVICE" | "COMBO"> = ["PRODUCT", "SERVICE", "COMBO"];

  const allRes = await fetchJson<{ data?: unknown[]; error?: string }>("/api/inventory/search?limit=30", {
    method: "GET",
    headers: authHeaders(false)
  });

  if (!allRes.ok) {
    throw new Error(`/api/inventory/search falló (status=${allRes.status})`);
  }

  const allRowsRaw = Array.isArray(allRes.json?.data) ? allRes.json?.data || [] : [];
  const allRows = allRowsRaw.filter(isValidSearchRow);

  if (allRows.length !== allRowsRaw.length) {
    warn(`Search devolvió ${allRowsRaw.length - allRows.length} filas con shape inválido.`);
  }

  const totalInventory = inventoryCounts.PRODUCT + inventoryCounts.SERVICE + inventoryCounts.COMBO;
  if (totalInventory > 0 && allRows.length < 1) {
    throw new Error("Hay inventario en listados, pero /api/inventory/search devolvió 0 resultados.");
  }

  pass(`/api/inventory/search (ALL) ok, resultados=${allRows.length}`);

  for (const type of types) {
    const res = await fetchJson<{ data?: unknown[]; error?: string }>(`/api/inventory/search?type=${type}&limit=20`, {
      method: "GET",
      headers: authHeaders(false)
    });

    if (!res.ok) {
      throw new Error(`/api/inventory/search?type=${type} falló (status=${res.status})`);
    }

    const rowsRaw = Array.isArray(res.json?.data) ? res.json?.data || [] : [];
    const rows = rowsRaw.filter(isValidSearchRow);
    const sourceCount = inventoryCounts[type];

    if (sourceCount > 0 && rows.length < 1) {
      throw new Error(`Hay ${sourceCount} registros ${type} en listados, pero search type=${type} devolvió 0.`);
    }

    pass(`/api/inventory/search?type=${type} ok, resultados=${rows.length}`);
  }
}

async function resolveCurrency(): Promise<string> {
  const res = await fetchJson<{ data?: Array<{ code?: string; isActive?: boolean }>; error?: string }>(
    "/api/subscriptions/memberships/config/currencies",
    {
      method: "GET",
      headers: authHeaders(false)
    }
  );

  if (!res.ok) {
    warn(`No se pudo resolver monedas desde config (status=${res.status}). Se usa GTQ.`);
    return "GTQ";
  }

  const rows = Array.isArray(res.json?.data) ? res.json?.data || [] : [];
  const active = rows.find((item) => item?.isActive !== false && typeof item?.code === "string" && item.code.length >= 3);
  return active?.code ? String(active.code).toUpperCase() : "GTQ";
}

async function createPlanViaApi(): Promise<{ planId: string | null; created: boolean; note?: string }> {
  if (SMOKE_PLAN_ID) {
    info(`SMOKE_PLAN_ID detectado. Se reutiliza plan=${SMOKE_PLAN_ID}`);
    return { planId: SMOKE_PLAN_ID, created: false };
  }

  const currency = await resolveCurrency();
  const suffix = `${Date.now()}`;
  const body = {
    slug: `smoke-b2c-${suffix}`,
    name: `SMOKE B2C ${suffix}`,
    description: "Plan generado por smoke test de Suscripciones.",
    type: "INDIVIDUAL",
    segment: "B2C",
    categoryId: null,
    imageUrl: null,
    active: true,
    priceMonthly: 99,
    priceAnnual: 999,
    currency,
    maxDependents: 0,
    benefits: []
  };

  const res = await fetchJson<PlanCreateResponse>("/api/subscriptions/memberships/plans", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body)
  });

  if (res.ok && res.status === 201) {
    const planId = String(res.json?.data?.id || "").trim();
    if (!planId) {
      throw new Error("POST /plans respondió 201 pero sin data.id");
    }
    pass(`Plan creado correctamente: ${planId}`);
    return { planId, created: true };
  }

  if (res.status === 404 || res.status === 405) {
    warn("No se pudo crear plan por API (endpoint no disponible para POST). Se deja guía manual.");
    return {
      planId: null,
      created: false,
      note:
        "Crear un plan B2C manualmente en /admin/suscripciones/membresias/planes/nuevo y luego re-ejecutar con SMOKE_PLAN_ID=<planId>."
    };
  }

  if (isAuthStatus(res.status)) {
    warn(`No autorizado para crear plan (status=${res.status}). Se deja guía manual.`);
    return {
      planId: null,
      created: false,
      note:
        "Aporta SMOKE_COOKIE con sesión válida (MEMBERSHIPS:WRITE) o habilita fallback por rol en dev (CRM_DEV_ROLE_HEADER=true)."
    };
  }

  const message = (res.json as JsonRecord | null)?.error || res.text || `status=${res.status}`;
  throw new Error(`Fallo creando plan por API: ${String(message)}`);
}

async function resolvePatientId(): Promise<string | null> {
  if (SMOKE_PATIENT_ID) {
    info(`SMOKE_PATIENT_ID detectado. Se reutiliza paciente=${SMOKE_PATIENT_ID}`);
    return SMOKE_PATIENT_ID;
  }

  const contractsRes = await fetchJson<{ data?: unknown[]; error?: string }>(
    "/api/subscriptions/memberships/contracts?ownerType=PERSON&page=1&take=5",
    {
      method: "GET",
      headers: authHeaders(false)
    }
  );

  if (contractsRes.ok) {
    const rows = Array.isArray(contractsRes.json?.data) ? contractsRes.json?.data || [] : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const ownerId = String(record.ownerId || "").trim();
      if (ownerId) {
        info(`Paciente detectado desde contratos.ownerId=${ownerId}`);
        return ownerId;
      }
      const owner = (record.owner || null) as Record<string, unknown> | null;
      if (owner && typeof owner.id === "string" && owner.id.trim()) {
        info(`Paciente detectado desde contratos.owner.id=${owner.id}`);
        return owner.id.trim();
      }
    }
  }

  // fallback opcional para instalaciones con auth por cookie
  const clientsRes = await fetchJson<{ data?: unknown[]; error?: string }>(
    "/api/subscriptions/memberships/clients?q=an",
    {
      method: "GET",
      headers: authHeaders(false)
    }
  );

  if (clientsRes.ok) {
    const rows = Array.isArray(clientsRes.json?.data) ? clientsRes.json?.data || [] : [];
    const person = rows.find((row) => {
      if (!row || typeof row !== "object") return false;
      const record = row as Record<string, unknown>;
      return String(record.type || "") === "PERSON" && typeof record.id === "string";
    }) as Record<string, unknown> | undefined;

    if (person?.id && typeof person.id === "string") {
      info(`Paciente detectado desde /clients id=${person.id}`);
      return person.id;
    }
  }

  return null;
}

async function enrollManual(planId: string, patientId: string) {
  const body = {
    idempotencyKey: `smoke-enroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerType: "PERSON",
    patientId,
    productId: planId,
    paymentMethod: "MANUAL",
    note: "Smoke test E2E Suscripciones"
  };

  const res = await fetchJson<EnrollResponse>("/api/subscriptions/memberships/enroll", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const message = (res.json as JsonRecord | null)?.error || res.text || `status=${res.status}`;
    throw new Error(`Fallo enroll manual: ${String(message)}`);
  }

  if (res.status !== 201) {
    throw new Error(`Enroll respondió status inesperado ${res.status} (esperado 201)`);
  }

  const contractId = String(res.json?.data?.contractId || "").trim();
  const draftInvoiceUrl = String(res.json?.data?.draftInvoiceUrl || "").trim();

  if (!contractId) {
    throw new Error("Enroll manual no devolvió contractId");
  }

  if (!draftInvoiceUrl) {
    throw new Error("Enroll manual no devolvió draftInvoiceUrl");
  }

  pass(`Afiliación manual creada: contractId=${contractId}`);
  pass(`Draft de facturación: ${draftInvoiceUrl}`);

  return { contractId, draftInvoiceUrl };
}

async function main() {
  info(`BASE_URL=${BASE_URL}`);
  info(`Auth headers: x-role=${SMOKE_ROLE || "(none)"} cookie=${SMOKE_COOKIE ? "present" : "absent"}`);

  const manualSteps: string[] = [];

  try {
    const counts = await inventoryCountsProbe();
    await validateInventorySearch(counts);

    const plan = await createPlanViaApi();
    if (!plan.planId) {
      if (plan.note) manualSteps.push(plan.note);
      warn("Smoke en modo parcial: inventario/search OK, plan no creado automáticamente.");
    }

    const patientId = await resolvePatientId();
    if (!patientId) {
      manualSteps.push(
        "No se pudo resolver patientId automáticamente. Provee SMOKE_PATIENT_ID=<clientProfileId PERSON> y re-ejecuta el smoke."
      );
    }

    if (plan.planId && patientId) {
      await enrollManual(plan.planId, patientId);
      pass("Smoke E2E completo: Inventario -> Search -> Crear plan -> Afiliar manual.");
    } else {
      warn("Smoke parcial: faltó planId y/o patientId para completar enroll manual.");
    }

    if (manualSteps.length > 0) {
      console.log("\n[MANUAL STEPS]");
      for (const step of manualSteps) {
        console.log(`- ${step}`);
      }
    }
  } catch (error: any) {
    fail(error?.message || "Fallo en smoke E2E");
    process.exit(1);
  }
}

main();
