import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as productsGet } from "@/app/api/inventario/productos/route";
import { GET as servicesGet, POST as servicesPost } from "@/app/api/inventario/servicios/route";
import { resolveInventoryAuth } from "@/lib/inventory/authz";

type EnvSnapshot = {
  INVENTORY_API_ADMIN_TOKEN?: string;
  INVENTORY_API_OPERATOR_TOKEN?: string;
  INVENTORY_API_RECEPCION_TOKEN?: string;
  INVENTORY_API_ADMIN_TENANT_ID?: string;
  INVENTORY_API_OPERATOR_TENANT_ID?: string;
  INVENTORY_API_RECEPCION_TENANT_ID?: string;
  DEFAULT_TENANT_ID?: string;
};

function snapshotInventoryAuthEnv(): EnvSnapshot {
  return {
    INVENTORY_API_ADMIN_TOKEN: process.env.INVENTORY_API_ADMIN_TOKEN,
    INVENTORY_API_OPERATOR_TOKEN: process.env.INVENTORY_API_OPERATOR_TOKEN,
    INVENTORY_API_RECEPCION_TOKEN: process.env.INVENTORY_API_RECEPCION_TOKEN,
    INVENTORY_API_ADMIN_TENANT_ID: process.env.INVENTORY_API_ADMIN_TENANT_ID,
    INVENTORY_API_OPERATOR_TENANT_ID: process.env.INVENTORY_API_OPERATOR_TENANT_ID,
    INVENTORY_API_RECEPCION_TENANT_ID: process.env.INVENTORY_API_RECEPCION_TENANT_ID,
    DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID
  };
}

function restoreInventoryAuthEnv(snapshot: EnvSnapshot) {
  const keys = Object.keys(snapshot) as Array<keyof EnvSnapshot>;
  for (const key of keys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("inventario auth: GET productos sin auth retorna 401", async () => {
  const req = new NextRequest("http://localhost/api/inventario/productos");
  const res = await productsGet(req);
  assert.ok(res);
  assert.equal(res.status, 401);
});

test("inventario auth: GET servicios sin auth retorna 401", async () => {
  const req = new NextRequest("http://localhost/api/inventario/servicios");
  const res = await servicesGet(req);
  assert.ok(res);
  assert.equal(res.status, 401);
});

test("inventario auth: POST servicios con token operador retorna 403", async () => {
  const env = snapshotInventoryAuthEnv();
  process.env.INVENTORY_API_OPERATOR_TOKEN = "test-operator-token";
  process.env.INVENTORY_API_OPERATOR_TENANT_ID = "tenant-operador";

  try {
    const req = new NextRequest("http://localhost/api/inventario/servicios", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inventory-token": "test-operator-token"
      },
      body: JSON.stringify({
        nombre: "Servicio restringido",
        categoriaId: "cat-1",
        duracionMin: 30,
        precioVenta: 150
      })
    });

    const res = await servicesPost(req);
    assert.ok(res);
    assert.equal(res.status, 403);
  } finally {
    restoreInventoryAuthEnv(env);
  }
});

test("inventario auth: token sin tenant configurado retorna 500 explícito", async () => {
  const env = snapshotInventoryAuthEnv();
  process.env.INVENTORY_API_ADMIN_TOKEN = "test-admin-token";
  delete process.env.INVENTORY_API_ADMIN_TENANT_ID;
  delete process.env.DEFAULT_TENANT_ID;

  try {
    const req = new NextRequest("http://localhost/api/inventario/productos", {
      headers: {
        "x-inventory-token": "test-admin-token"
      }
    });
    const res = await productsGet(req);
    assert.ok(res);
    assert.equal(res.status, 500);
  } finally {
    restoreInventoryAuthEnv(env);
  }
});

test("inventario auth: token no permite spoofing de tenant por headers/query", () => {
  const env = snapshotInventoryAuthEnv();
  process.env.INVENTORY_API_ADMIN_TOKEN = "test-admin-token";
  process.env.INVENTORY_API_ADMIN_TENANT_ID = "tenant-seguro";
  process.env.DEFAULT_TENANT_ID = "tenant-default";

  try {
    const req = new NextRequest("http://localhost/api/inventario/productos?tenantId=tenant-malicioso", {
      headers: {
        "x-inventory-token": "test-admin-token",
        "x-tenant-id": "tenant-header-malicioso",
        "x-branch-id": "branch-header-maliciosa"
      }
    });

    const auth = resolveInventoryAuth(req);
    assert.ok(auth);
    assert.equal(auth?.source, "token");
    assert.equal(auth?.tenantId, "tenant-seguro");
    assert.equal(auth?.branchId, null);
  } finally {
    restoreInventoryAuthEnv(env);
  }
});
