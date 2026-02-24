import { MovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerInventoryMovement } from "./movements";
import { proveedoresMock, unidadesMock, sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import { exportExcelViaProcessingService, importExcelViaProcessingService } from "@/lib/processing-service/excel";

export type ImportKind = "productos" | "stock" | "precios" | "costos" | "servicios" | "combos";

type ImportResult = {
  created: number;
  updated: number;
  movements: number;
  errors: { row: number; message: string }[];
  errorsCsv?: string;
};

type ImportOptions = {
  preview?: boolean;
  branchId?: string;
  userId: string;
};

export async function buildTemplate(kind: ImportKind) {
  const columns = templateColumns[kind];
  if (!columns) throw new Error("Plantilla no soportada");
  const headers = columns.map((column) => column.header);
  const sampleRow = columns.map((column) => column.example ?? "");
  const { buffer } = await exportExcelViaProcessingService({
    context: {
      tenantId: process.env.DEFAULT_TENANT_ID || "global",
      actorId: "inventory-template"
    },
    fileName: `${kind}.xlsx`,
    sheets: [
      {
        name: getWorksheetName(kind),
        headers,
        rows: [sampleRow]
      }
    ],
    limits: {
      maxFileMb: 8,
      maxRows: 5_000,
      maxCols: 120,
      timeoutMs: 20_000
    }
  });
  return buffer;
}

export async function processImport(kind: ImportKind, file: Buffer, opts: ImportOptions): Promise<ImportResult> {
  const imported = await importExcelViaProcessingService({
    context: {
      tenantId: process.env.DEFAULT_TENANT_ID || "global",
      actorId: opts.userId || "inventory-import"
    },
    fileBuffer: Buffer.isBuffer(file) ? file : Buffer.from(file),
    template: "generic",
    limits: {
      maxFileMb: 8,
      maxRows: 30_000,
      maxCols: 200,
      timeoutMs: 25_000
    }
  });
  const parsed = ((imported.artifactJson || {}) as { rows?: Record<string, unknown>[]; columns?: unknown[] }) || {};
  const columns = Array.isArray(parsed.columns) ? parsed.columns.map((value) => String(value || "").trim()) : [];
  const rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  const rows = rawRows.map((row) => [null, ...columns.map((column) => row[column] ?? "")]);
  const result: ImportResult = { created: 0, updated: 0, movements: 0, errors: [] };
  const branchId = opts.branchId || "s1";
  const allowedBranches = sucursalesInvMock.map((s) => s.id);
  const allowedUnits = unidadesMock.map((u) => u.id);
  const allowedProviders = proveedoresMock.map((p) => p.id);
  const active = (status?: string | null) => !status || String(status).toLowerCase() === "activo" || String(status).toLowerCase() === "active";

  if (kind === "productos") {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] as any[];
      if (!row) continue;
      const [codigo, nombre, catSlug, subSlug, areaSlug, proveedor, unidad, presentacion, minStock, basePrice, avgCost, estado] =
        row.slice(1, 13);
      if (!codigo || !nombre || !catSlug) continue;
      try {
        const category = await prisma.productCategory.findUnique({ where: { slug: String(catSlug) } });
        if (!category) throw new Error("Categoría no encontrada");
        if (!active((category as any).status)) throw new Error("Categoría inactiva");
        const subcategory = subSlug ? await prisma.productSubcategory.findUnique({ where: { slug: String(subSlug) } }) : null;
        if (subSlug && !subcategory) throw new Error("Subcategoría no encontrada");
        if (subcategory && subcategory.categoryId !== category.id) throw new Error("Subcategoría no pertenece a la categoría");
        if (subcategory && !active((subcategory as any).status)) throw new Error("Subcategoría inactiva");
        const area = areaSlug ? await prisma.inventoryArea.findUnique({ where: { slug: String(areaSlug) } }) : null;
        if (proveedor && !allowedProviders.includes(String(proveedor))) throw new Error("Proveedor no válido");
        if (unidad && !allowedUnits.includes(String(unidad))) throw new Error("Unidad no válida");
        const existing = await prisma.product.findUnique({ where: { code: String(codigo) } });
        const data: Prisma.ProductCreateInput = {
          code: String(codigo),
          name: String(nombre),
          category: { connect: { id: category.id } },
          subcategory: subcategory ? { connect: { id: subcategory.id } } : undefined,
          inventoryArea: area ? { connect: { id: area.id } } : undefined,
          unit: unidad ? String(unidad) : null,
          cost: Number(avgCost ?? 0),
          price: Number(basePrice ?? 0),
          baseSalePrice: Number(basePrice ?? 0),
          avgCost: Number(avgCost ?? 0),
          status: (estado as string) || "Activo",
          createdAt: new Date(),
          updatedAt: new Date()
        };
        if (presentacion) (data as any).presentation = String(presentacion);
        if (existing) {
          if (!opts.preview) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                ...data,
                category: undefined,
                subcategory: undefined,
                inventoryArea: undefined,
                categoryId: category.id,
                subcategoryId: subcategory?.id,
                inventoryAreaId: area?.id
              }
            });
          }
          result.updated += 1;
        } else {
          if (!opts.preview) await prisma.product.create({ data });
          result.created += 1;
        }
      } catch (err: any) {
        result.errors.push({ row: idx + 2, message: err?.message || "Error inesperado" });
      }
    }
  }

  if (kind === "stock") {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] as any[];
      if (!row) continue;
      const [codigo, sucursal, stock, minStock] = row.slice(1, 5);
      if (!codigo) continue;
      try {
        const product = await prisma.product.findUnique({ where: { code: String(codigo) } });
        if (!product) throw new Error("Producto no encontrado");
        const branch = String(sucursal || branchId);
        if (!allowedBranches.includes(branch)) throw new Error("Sucursal no válida");
        const desired = Number(stock ?? 0);
        const min = Number(minStock ?? 0);
        const current = await prisma.productStock.upsert({
          where: { productId_branchId: { productId: product.id, branchId: branch } },
          create: { productId: product.id, branchId: branch, stock: 0, minStock: min },
          update: {}
        });
        const delta = desired - current.stock;
        if (!opts.preview) {
          await prisma.productStock.update({ where: { productId_branchId: { productId: product.id, branchId: branch } }, data: { stock: desired, minStock: min } });
          await registerInventoryMovement({
            productId: product.id,
            branchId: branch,
            type: MovementType.ADJUSTMENT,
            quantity: desired,
            reference: "Carga masiva stock",
            reason: "import_stock",
            createdById: opts.userId
          });
        }
        if (delta !== 0) result.movements += 1;
        delta === 0 ? (result.updated += 1) : (result.created += 1);
      } catch (err: any) {
        result.errors.push({ row: idx + 2, message: err?.message || "Error inesperado" });
      }
    }
  }

  if (kind === "precios") {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] as any[];
      if (!row) continue;
      const [codigo, precio] = row.slice(1, 3);
      if (!codigo || precio === undefined || precio === null) continue;
      try {
        const product = await prisma.product.findUnique({ where: { code: String(codigo) } });
        if (!product) throw new Error("Producto no encontrado");
        if (!opts.preview) {
          await registerInventoryMovement({
            productId: product.id,
            branchId: branchId,
            type: MovementType.PRICE_UPDATE,
            salePrice: Number(precio),
            reference: "Carga masiva precios",
            createdById: opts.userId
          });
        }
        result.updated += 1;
        result.movements += 1;
      } catch (err: any) {
        result.errors.push({ row: idx + 2, message: err?.message || "Error inesperado" });
      }
    }
  }

  if (kind === "costos") {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] as any[];
      if (!row) continue;
      const [codigo, costo, cantidad, sucursal] = row.slice(1, 5);
      if (!codigo || costo === undefined || costo === null) continue;
      try {
        const product = await prisma.product.findUnique({ where: { code: String(codigo) } });
        if (!product) throw new Error("Producto no encontrado");
        const branch = String(sucursal || branchId);
        if (!allowedBranches.includes(branch)) throw new Error("Sucursal no válida");
        const qty = cantidad ? Number(cantidad) : null;
        if (!opts.preview) {
          await registerInventoryMovement({
            productId: product.id,
            branchId: branch,
            type: qty && qty > 0 ? MovementType.ENTRY : MovementType.COST_UPDATE,
            quantity: qty || undefined,
            unitCost: Number(costo),
            reference: "Carga masiva costos",
            createdById: opts.userId
          });
        }
        result.updated += 1;
        result.movements += 1;
      } catch (err: any) {
        result.errors.push({ row: idx + 2, message: err?.message || "Error inesperado" });
      }
    }
  }

  if (kind === "servicios") {
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx] as any[];
      if (!row) continue;
      const [codigo, nombre, catSlug, subSlug, precio, duracionMin, estado] = row.slice(1, 8);
      if (!codigo || !nombre || !catSlug) continue;
      try {
        const category = await prisma.serviceCategory.findUnique({ where: { slug: String(catSlug) } });
        if (!category) throw new Error("Categoría no encontrada");
        if (!active((category as any).status)) throw new Error("Categoría inactiva");
        const subcategory = subSlug ? await prisma.serviceSubcategory.findUnique({ where: { slug: String(subSlug) } }) : null;
        if (subSlug && !subcategory) throw new Error("Subcategoría no encontrada");
        if (subcategory && subcategory.categoryId !== category.id) throw new Error("Subcategoría no pertenece a la categoría");
        if (subcategory && !active((subcategory as any).status)) throw new Error("Subcategoría inactiva");
        const existing = await prisma.service.findUnique({ where: { code: String(codigo) } });
        const data: Prisma.ServiceCreateInput = {
          code: String(codigo),
          name: String(nombre),
          category: { connect: { id: category.id } },
          subcategory: subcategory ? { connect: { id: subcategory.id } } : undefined,
          price: Number(precio ?? 0),
          durationMin: Number(duracionMin ?? 0),
          status: (estado as string) || "Activo"
        };
        if (existing) {
          if (!opts.preview) {
            await prisma.service.update({
              where: { id: existing.id },
              data: {
                name: data.name,
                code: data.code,
                categoryId: category.id,
                subcategoryId: subcategory?.id,
                price: data.price,
                durationMin: data.durationMin,
                status: data.status
              }
            });
          }
          result.updated += 1;
        } else {
          if (!opts.preview) await prisma.service.create({ data });
          result.created += 1;
        }
      } catch (err: any) {
        result.errors.push({ row: idx + 2, message: err?.message || "Error inesperado" });
      }
    }
  }

  if (result.errors.length > 0) {
    const lines = ["row,mensaje_error", ...result.errors.map((e) => `${e.row},"${String(e.message).replace(/"/g, '""')}"`)];
    result.errorsCsv = lines.join("\n");
  }

  return result;
}

const templateColumns: Record<
  ImportKind,
  { header: string; key: string; width: number; example?: any }[]
> = {
  productos: [
    { header: "codigo", key: "codigo", width: 16, example: "MED-001" },
    { header: "nombre", key: "nombre", width: 28, example: "Paracetamol 500mg" },
    { header: "categoria_slug", key: "categoria_slug", width: 18, example: "farmacia" },
    { header: "subcategoria_slug", key: "subcategoria_slug", width: 18, example: "analgesicos" },
    { header: "area_slug", key: "area_slug", width: 14, example: "farmacia" },
    { header: "proveedor", key: "proveedor", width: 18, example: "Distribuidora Médica" },
    { header: "unidad", key: "unidad", width: 10, example: "u" },
    { header: "presentacion", key: "presentacion", width: 16, example: "Tableta" },
    { header: "min_stock", key: "min_stock", width: 12, example: 10 },
    { header: "base_sale_price", key: "base_sale_price", width: 14, example: 35 },
    { header: "avg_cost", key: "avg_cost", width: 12, example: 18 },
    { header: "estado", key: "estado", width: 10, example: "Activo" }
  ],
  stock: [
    { header: "codigo_producto", key: "codigo_producto", width: 20, example: "MED-001" },
    { header: "sucursal", key: "sucursal", width: 14, example: "s1" },
    { header: "stock", key: "stock", width: 10, example: 50 },
    { header: "min_stock", key: "min_stock", width: 12, example: 10 }
  ],
  precios: [
    { header: "codigo_producto", key: "codigo_producto", width: 20, example: "MED-001" },
    { header: "precio_venta", key: "precio_venta", width: 14, example: 45 }
  ],
  costos: [
    { header: "codigo_producto", key: "codigo_producto", width: 20, example: "MED-001" },
    { header: "costo_unitario", key: "costo_unitario", width: 14, example: 18 },
    { header: "cantidad", key: "cantidad", width: 12, example: 20 },
    { header: "sucursal", key: "sucursal", width: 14, example: "s1" }
  ],
  servicios: [
    { header: "codigo", key: "codigo", width: 16, example: "SRV-001" },
    { header: "nombre", key: "nombre", width: 26, example: "Consulta general" },
    { header: "categoria_slug", key: "categoria_slug", width: 18, example: "consulta-medica" },
    { header: "subcategoria_slug", key: "subcategoria_slug", width: 18, example: "general" },
    { header: "precio", key: "precio", width: 12, example: 120 },
    { header: "duracion_min", key: "duracion_min", width: 12, example: 30 },
    { header: "estado", key: "estado", width: 10, example: "Activo" }
  ],
  combos: [
    { header: "codigo_combo", key: "codigo_combo", width: 18, example: "CMB-001" },
    { header: "nombre", key: "nombre", width: 26, example: "Combo consulta + RX" },
    { header: "descripcion", key: "descripcion", width: 32, example: "Consulta + rayos X básico" },
    { header: "servicios_ids", key: "servicios_ids", width: 28, example: "srv1|srv2" },
    { header: "productos_codigos_cant", key: "productos_codigos_cant", width: 32, example: "MED-001:2|INS-010:1" },
    { header: "precio_final", key: "precio_final", width: 14, example: 450 },
    { header: "estado", key: "estado", width: 10, example: "Activo" }
  ]
};

function getWorksheetName(kind: ImportKind) {
  switch (kind) {
    case "productos":
      return "PRODUCTOS";
    case "servicios":
      return "SERVICIOS";
    case "stock":
      return "STOCK";
    case "precios":
      return "PRECIOS";
    case "costos":
      return "COSTOS";
    case "combos":
      return "COMBOS";
    default:
      return (kind as string).toUpperCase();
  }
}
