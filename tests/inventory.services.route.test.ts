import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET as servicesGet, POST as servicesPost } from "@/app/api/inventario/servicios/route";

type ServiceRow = {
  id: string;
  name: string;
  code: string | null;
  categoryId: string;
  subcategoryId: string | null;
  price: number;
  durationMin: number;
  status: string;
  marginPct: number | null;
  updatedAt: Date;
  category: { id: string; name: string; area: string };
  subcategory: { id: string; name: string } | null;
};

test("inventario servicios: POST crear -> GET listar incluye el servicio creado", async () => {
  const prismaAny = prisma as any;
  const originalServiceDelegate = prismaAny.service;
  const previousAdminToken = process.env.INVENTORY_API_ADMIN_TOKEN;
  const previousAdminTenant = process.env.INVENTORY_API_ADMIN_TENANT_ID;
  const rows: ServiceRow[] = [];

  process.env.INVENTORY_API_ADMIN_TOKEN = "test-admin-token";
  process.env.INVENTORY_API_ADMIN_TENANT_ID = "tenant-alpha";

  prismaAny.service = {
    create: async (args: any) => {
      const data = args?.data || {};
      const row: ServiceRow = {
        id: `srv-test-${rows.length + 1}`,
        name: String(data.name),
        code: data.code ? String(data.code) : null,
        categoryId: String(data.categoryId),
        subcategoryId: data.subcategoryId ? String(data.subcategoryId) : null,
        price: Number(data.price || 0),
        durationMin: Number(data.durationMin || 0),
        status: String(data.status || "Activo"),
        marginPct: data.marginPct === null || data.marginPct === undefined ? null : Number(data.marginPct),
        updatedAt: new Date(),
        category: {
          id: String(data.categoryId),
          name: "Categoria test",
          area: "SERVICIOS"
        },
        subcategory: data.subcategoryId
          ? {
              id: String(data.subcategoryId),
              name: "Subcategoria test"
            }
          : null
      };
      rows.push(row);
      return row;
    },
    findMany: async (args: any) => {
      const status = args?.where?.status;
      if (typeof status === "string") {
        return rows.filter((row) => row.status === status);
      }
      if (Array.isArray(status?.in)) {
        const allowed = new Set(status.in.map((value: unknown) => String(value)));
        return rows.filter((row) => allowed.has(row.status));
      }
      return rows;
    }
  };

  try {
    const createReq = new NextRequest("http://localhost/api/inventario/servicios", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inventory-token": "test-admin-token",
        "x-tenant-id": "tenant-alpha",
        "x-branch-id": "branch-main",
        "x-user-id": "user-admin"
      },
      body: JSON.stringify({
        nombre: "Consulta cardiológica",
        categoriaId: "cat-servicios",
        subcategoriaId: "sub-servicios",
        codigoServicio: "SRV-100",
        duracionMin: 45,
        precioVenta: 250,
        estado: "Activo"
      })
    });

    const createRes = await servicesPost(createReq);
    assert.ok(createRes);
    assert.equal(createRes.status, 201);
    const createdPayload = (await createRes.json()) as { data?: { id?: string; nombre?: string } };
    assert.ok(createdPayload.data?.id);
    assert.equal(createdPayload.data?.nombre, "Consulta cardiológica");

    const listReq = new NextRequest("http://localhost/api/inventario/servicios?deletedAt=null", {
      headers: {
        "x-inventory-token": "test-admin-token",
        "x-tenant-id": "tenant-alpha",
        "x-branch-id": "branch-main"
      }
    });
    const listRes = await servicesGet(listReq);
    assert.ok(listRes);
    assert.equal(listRes.status, 200);
    const listPayload = (await listRes.json()) as {
      data?: Array<{ id: string; nombre: string }>;
      meta?: { scope?: { tenantId?: string | null; branchId?: string | null } };
    };

    assert.equal(listPayload.meta?.scope?.tenantId, "tenant-alpha");
    assert.equal(listPayload.meta?.scope?.branchId, null);
    assert.ok(Array.isArray(listPayload.data));
    assert.ok(listPayload.data?.some((item) => item.id === createdPayload.data?.id));
  } finally {
    prismaAny.service = originalServiceDelegate;
    if (previousAdminToken === undefined) delete process.env.INVENTORY_API_ADMIN_TOKEN;
    else process.env.INVENTORY_API_ADMIN_TOKEN = previousAdminToken;
    if (previousAdminTenant === undefined) delete process.env.INVENTORY_API_ADMIN_TENANT_ID;
    else process.env.INVENTORY_API_ADMIN_TENANT_ID = previousAdminTenant;
  }
});
