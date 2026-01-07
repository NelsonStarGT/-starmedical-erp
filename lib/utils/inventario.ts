import { productosMock } from "@/lib/mock/productos";
import { categoriasProductoMock, categoriasServicioMock } from "@/lib/mock/inventario-catalogos";
import { ServicioProducto, ComboProducto } from "@/lib/types/inventario";

export function serviciosCosto(items: ServicioProducto[]) {
  return items.reduce((acc, item) => {
    const prod = productosMock.find((p) => p.id === item.productoId);
    return acc + (prod?.costoUnitario || 0) * (item.cantidad || 0);
  }, 0);
}

export function combosCosto(items: ComboProducto[]) {
  return items.reduce((acc, item) => {
    const prod = productosMock.find((p) => p.id === item.productoId);
    return acc + (prod?.costoUnitario || 0) * (item.cantidad || 0);
  }, 0);
}

export function getProductCategoryBySlug(slug: string) {
  return categoriasProductoMock.find((c) => c.slug === slug);
}

export function getServiceCategoryBySlug(slug: string) {
  return categoriasServicioMock.find((c) => c.slug === slug);
}
