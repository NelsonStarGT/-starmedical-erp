import { Producto, Servicio } from "@/lib/types/inventario";

export type InventoryFilters = {
  categorias: string[];
  subcategorias: string[];
  areas: string[];
  proveedores: string[];
  estados: string[];
};

export const emptyInventoryFilters: InventoryFilters = {
  categorias: [],
  subcategorias: [],
  areas: [],
  proveedores: [],
  estados: []
};

type CatalogLabels = {
  categorias?: Record<string, string>;
  subcategorias?: Record<string, string>;
  areas?: Record<string, string>;
  proveedores?: Record<string, string>;
};

const tokenize = (term: string) => term.trim().toLowerCase().split(/\s+/).filter(Boolean);

const matchesSearch = (tokens: string[], haystackParts: Array<string | undefined>) => {
  if (tokens.length === 0) return true;
  const haystack = haystackParts.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((t) => haystack.includes(t));
};

export const countActiveFilters = (filters: InventoryFilters) =>
  filters.categorias.length +
  filters.subcategorias.length +
  filters.areas.length +
  filters.proveedores.length +
  filters.estados.length;

export const pruneSubcategorias = (
  selectedSubcategorias: string[],
  selectedCategorias: string[],
  subcategoriaToCategoria: Record<string, string>
) => {
  if (selectedCategorias.length === 0) return selectedSubcategorias;
  return selectedSubcategorias.filter((subId) => selectedCategorias.includes(subcategoriaToCategoria[subId]));
};

export function filterProductos({
  items,
  search,
  filters,
  catalogos
}: {
  items: Producto[];
  search: string;
  filters: InventoryFilters;
  catalogos: CatalogLabels;
}) {
  const tokens = tokenize(search);

  return items.filter((p) => {
    if (filters.categorias.length > 0 && !filters.categorias.includes(p.categoriaId)) return false;
    if (filters.subcategorias.length > 0 && (!p.subcategoriaId || !filters.subcategorias.includes(p.subcategoriaId))) return false;
    if (filters.areas.length > 0 && (!p.areaId || !filters.areas.includes(p.areaId))) return false;
    if (filters.proveedores.length > 0 && (!p.proveedorId || !filters.proveedores.includes(p.proveedorId))) return false;
    if (filters.estados.length > 0 && !filters.estados.includes(p.estado)) return false;

    return matchesSearch(tokens, [
      p.nombre,
      p.codigo,
      p.id,
      p.categoriaId ? catalogos.categorias?.[p.categoriaId] : undefined,
      p.subcategoriaId ? catalogos.subcategorias?.[p.subcategoriaId] : undefined,
      p.areaId ? catalogos.areas?.[p.areaId] : undefined,
      p.proveedorId ? catalogos.proveedores?.[p.proveedorId] : undefined
    ]);
  });
}

export function filterServicios({
  items,
  search,
  filters,
  catalogos,
  categoriaAreas
}: {
  items: Servicio[];
  search: string;
  filters: InventoryFilters;
  catalogos: CatalogLabels;
  categoriaAreas?: Record<string, string>;
}) {
  const tokens = tokenize(search);

  return items.filter((s) => {
    const area = s.area || (s.categoriaId && categoriaAreas ? categoriaAreas[s.categoriaId] : undefined);
    if (filters.categorias.length > 0 && !filters.categorias.includes(s.categoriaId)) return false;
    if (filters.subcategorias.length > 0 && (!s.subcategoriaId || !filters.subcategorias.includes(s.subcategoriaId))) return false;
    if (filters.areas.length > 0 && (!area || !filters.areas.includes(area))) return false;
    if (filters.proveedores.length > 0 && (!s.proveedorId || !filters.proveedores.includes(s.proveedorId))) return false;
    if (filters.estados.length > 0 && !filters.estados.includes(s.estado)) return false;

    return matchesSearch(tokens, [
      s.nombre,
      s.codigoServicio,
      s.id,
      s.categoriaId ? catalogos.categorias?.[s.categoriaId] : undefined,
      s.subcategoriaId ? catalogos.subcategorias?.[s.subcategoriaId] : undefined,
      area ? catalogos.areas?.[area] : undefined,
      s.proveedorId ? catalogos.proveedores?.[s.proveedorId] : undefined
    ]);
  });
}
