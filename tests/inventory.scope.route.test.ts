import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as productsGet } from "@/app/api/inventario/productos/route";
import { GET as movementsGet } from "@/app/api/inventario/movimientos/route";

type EnvSnapshot = {
  INVENTORY_API_ADMIN_TOKEN?: string;
  INVENTORY_API_ADMIN_TENANT_ID?: string;
  DEFAULT_TENANT_ID?: string;
};

function snapshotEnv(): EnvSnapshot {
  return {
    INVENTORY_API_ADMIN_TOKEN: process.env.INVENTORY_API_ADMIN_TOKEN,
    INVENTORY_API_ADMIN_TENANT_ID: process.env.INVENTORY_API_ADMIN_TENANT_ID,
    DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID
  };
}

function restoreEnv(snapshot: EnvSnapshot) {
  const keys = Object.keys(snapshot) as Array<keyof EnvSnapshot>;
  for (const key of keys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("inventario scope: tenant A no ve tenant B y excluye deletedAt en productos", async () => {
  const env = snapshotEnv();
  const prismaAny = prisma as any;
  const originalProductDelegate = prismaAny.product;

  process.env.INVENTORY_API_ADMIN_TOKEN = "scope-admin-token";
  process.env.INVENTORY_API_ADMIN_TENANT_ID = "tenant-a";

  const rows = [
    {
      id: "prod-a-visible",
      tenantId: "tenant-a",
      deletedAt: null,
      name: "Producto visible",
      code: "A-001",
      categoryId: "cat-a",
      subcategoryId: null,
      inventoryAreaId: null,
      unit: "u",
      cost: 10,
      price: 20,
      avgCost: 10,
      baseSalePrice: 20,
      status: "Activo",
      category: { name: "Cat A" },
      subcategory: null,
      inventoryArea: null,
      stocks: [{ branchId: "b1", stock: 5, minStock: 1 }],
      updatedAt: new Date()
    },
    {
      id: "prod-b-other-tenant",
      tenantId: "tenant-b",
      deletedAt: null,
      name: "Producto tenant B",
      code: "B-001",
      categoryId: "cat-b",
      subcategoryId: null,
      inventoryAreaId: null,
      unit: "u",
      cost: 10,
      price: 20,
      avgCost: 10,
      baseSalePrice: 20,
      status: "Activo",
      category: { name: "Cat B" },
      subcategory: null,
      inventoryArea: null,
      stocks: [{ branchId: "b1", stock: 5, minStock: 1 }],
      updatedAt: new Date()
    },
    {
      id: "prod-a-deleted",
      tenantId: "tenant-a",
      deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      name: "Producto borrado",
      code: "A-002",
      categoryId: "cat-a",
      subcategoryId: null,
      inventoryAreaId: null,
      unit: "u",
      cost: 10,
      price: 20,
      avgCost: 10,
      baseSalePrice: 20,
      status: "Activo",
      category: { name: "Cat A" },
      subcategory: null,
      inventoryArea: null,
      stocks: [{ branchId: "b1", stock: 5, minStock: 1 }],
      updatedAt: new Date()
    }
  ];

  prismaAny.product = {
    findMany: async (args: any) => {
      assert.equal(args?.where?.tenantId, "tenant-a");
      assert.equal(args?.where?.deletedAt, null);
      return rows.filter((row) => row.tenantId === "tenant-a" && row.deletedAt === null);
    }
  };

  try {
    const req = new NextRequest("http://localhost/api/inventario/productos", {
      headers: { "x-inventory-token": "scope-admin-token" }
    });
    const res = await productsGet(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as { data?: Array<{ id: string }> };
    const ids = new Set((payload.data || []).map((item) => item.id));

    assert.equal(ids.has("prod-a-visible"), true);
    assert.equal(ids.has("prod-b-other-tenant"), false);
    assert.equal(ids.has("prod-a-deleted"), false);
  } finally {
    prismaAny.product = originalProductDelegate;
    restoreEnv(env);
  }
});

test("inventario scope: tenant A no ve tenant B y excluye deletedAt en movimientos", async () => {
  const env = snapshotEnv();
  const prismaAny = prisma as any;
  const originalInventoryMovementDelegate = prismaAny.inventoryMovement;

  process.env.INVENTORY_API_ADMIN_TOKEN = "scope-admin-token";
  process.env.INVENTORY_API_ADMIN_TENANT_ID = "tenant-a";

  const movements = [
    {
      id: "mov-a-visible",
      tenantId: "tenant-a",
      deletedAt: null,
      productId: "prod-a",
      branchId: "b1",
      type: "ENTRY",
      quantity: 5,
      unitCost: null,
      salePrice: null,
      reference: "ref-a",
      reason: "ok",
      createdById: "u1",
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      product: { name: "Prod A", code: "A-001" }
    },
    {
      id: "mov-b-other-tenant",
      tenantId: "tenant-b",
      deletedAt: null,
      productId: "prod-b",
      branchId: "b1",
      type: "ENTRY",
      quantity: 7,
      unitCost: null,
      salePrice: null,
      reference: "ref-b",
      reason: "other",
      createdById: "u2",
      createdAt: new Date("2026-03-01T11:00:00.000Z"),
      product: { name: "Prod B", code: "B-001" }
    },
    {
      id: "mov-a-deleted",
      tenantId: "tenant-a",
      deletedAt: new Date("2026-03-02T00:00:00.000Z"),
      productId: "prod-a",
      branchId: "b1",
      type: "EXIT",
      quantity: 1,
      unitCost: null,
      salePrice: null,
      reference: "ref-del",
      reason: "deleted",
      createdById: "u1",
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      product: { name: "Prod A", code: "A-001" }
    }
  ];

  const scopedRows = () => movements.filter((row) => row.tenantId === "tenant-a" && row.deletedAt === null);

  prismaAny.inventoryMovement = {
    count: async (args: any) => {
      assert.equal(args?.where?.tenantId, "tenant-a");
      assert.equal(args?.where?.deletedAt, null);
      return scopedRows().length;
    },
    findMany: async (args: any) => {
      assert.equal(args?.where?.tenantId, "tenant-a");
      assert.equal(args?.where?.deletedAt, null);
      return scopedRows();
    }
  };

  try {
    const req = new NextRequest("http://localhost/api/inventario/movimientos?page=1&pageSize=20", {
      headers: { "x-inventory-token": "scope-admin-token" }
    });
    const res = await movementsGet(req);
    assert.ok(res);
    assert.equal(res.status, 200);
    const payload = (await res.json()) as { data?: Array<{ id: string }> };
    const ids = new Set((payload.data || []).map((item) => item.id));

    assert.equal(ids.has("mov-a-visible"), true);
    assert.equal(ids.has("mov-b-other-tenant"), false);
    assert.equal(ids.has("mov-a-deleted"), false);
  } finally {
    prismaAny.inventoryMovement = originalInventoryMovementDelegate;
    restoreEnv(env);
  }
});
