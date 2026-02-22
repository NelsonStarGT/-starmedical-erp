import { categoriasProductoMock, subcategoriasMock, inventoryAreasMock, proveedoresMock, sucursalesInvMock, categoriasServicioMock, serviceSubcategoriasMock } from "@/lib/mock/inventario-catalogos";
import { movimientosMock } from "@/lib/mock/movimientos";
import { combosMock } from "@/lib/mock/combos";
import { productosMock } from "@/lib/mock/productos";
import { serviciosMock } from "@/lib/mock/servicios";
import { buildServiceUnavailablePayload } from "@/lib/inventory/runtime-contract";

export function runtimeFallbackEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_RUNTIME_MOCKS === "1";
}

export function inventoryServiceUnavailable(module: string, error: string) {
  return buildServiceUnavailablePayload({
    module,
    error,
    hint: "Módulo en preparación. Completa integración de datos para habilitarlo.",
    action: "En desarrollo puedes activar ALLOW_RUNTIME_MOCKS=1 para fallback temporal controlado."
  });
}

export function mapFallbackProductsForApi() {
  return productosMock.map((item) => ({
    ...item,
    categoriaNombre: undefined,
    subcategoriaNombre: undefined,
    areaNombre: undefined,
    stockPorSucursal: [{ branchId: item.sucursalId, stock: item.stockActual, minStock: item.stockMinimo }]
  }));
}

export function mapFallbackServicesForApi() {
  return serviciosMock.map((item) => ({
    ...item,
    categoriaNombre: undefined,
    subcategoriaNombre: undefined
  }));
}

export const inventoryReferenceData = {
  productCategories: categoriasProductoMock,
  productSubcategories: subcategoriasMock,
  inventoryAreas: inventoryAreasMock,
  suppliers: proveedoresMock,
  branches: sucursalesInvMock,
  serviceCategories: categoriasServicioMock,
  serviceSubcategories: serviceSubcategoriasMock,
  movementSeed: movimientosMock,
  comboSeed: combosMock,
  productSeed: productosMock,
  serviceSeed: serviciosMock
};
