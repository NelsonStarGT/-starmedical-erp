'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProductCard } from "@/components/inventario/ProductCard";
import { ProductModalV2 } from "@/components/inventario/ProductModalV2";
import ServiceUnavailableNotice from "@/components/inventario/ServiceUnavailableNotice";
import { SearchFilterBar } from "@/components/inventory/SearchFilterBar";
import { InventoryFilters, emptyInventoryFilters, filterProductos, pruneSubcategorias } from "@/lib/inventory/filters";
import { inventoryReferenceData } from "@/lib/inventory/runtime-fallback";
import { parseServiceUnavailablePayload, type ServiceUnavailablePayload } from "@/lib/inventory/runtime-contract";
import { Producto, hasPermission } from "@/lib/types/inventario";
import { toTitleCase } from "@/lib/utils";

export default function ProductosPage() {
  const currentRole = "Administrador";
  const canEdit = hasPermission(currentRole as any, "editar_producto");
  const showCosts = hasPermission(currentRole as any, "ver_costos");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Producto | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>(emptyInventoryFilters);
  const [loading, setLoading] = useState(false);
  const [loadIssue, setLoadIssue] = useState<ServiceUnavailablePayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyToFiltered, setApplyToFiltered] = useState(false);

  const categoriaNames = useMemo(
    () => inventoryReferenceData.productCategories.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.nombre }), {}),
    []
  );
  const subcategoriaNames = useMemo(
    () => inventoryReferenceData.productSubcategories.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.nombre }), {}),
    []
  );
  const subcategoriaToCat = useMemo(
    () => inventoryReferenceData.productSubcategories.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.categoriaId }), {}),
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/inventario/productos", { headers: { "x-role": currentRole } });
        const data = await res.json().catch(() => ({}));
        const unavailable = parseServiceUnavailablePayload(res.status, data);
        if (unavailable) {
          setLoadIssue(unavailable);
          setProductos([]);
          setSelectedIds(new Set());
          return;
        }

        if (res.ok) {
          setLoadIssue(null);
          setProductos(data.data || []);
          setSelectedIds(new Set());
        } else {
          console.error(data.error || "No se pudo cargar productos");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      filterProductos({
        items: productos,
        search,
        filters,
        catalogos: {
          categorias: categoriaNames,
          subcategorias: subcategoriaNames,
          areas: inventoryReferenceData.inventoryAreas.reduce<Record<string, string>>((acc, area) => ({ ...acc, [area.id]: area.nombre }), {}),
          proveedores: inventoryReferenceData.suppliers.reduce<Record<string, string>>((acc, prov) => ({ ...acc, [prov.id]: prov.nombre }), {})
        }
      }),
    [productos, search, filters, categoriaNames, subcategoriaNames]
  );

  const options = useMemo(
    () => ({
      categorias: inventoryReferenceData.productCategories.map((c) => ({ value: c.id, label: toTitleCase(c.nombre) })),
      subcategorias: inventoryReferenceData.productSubcategories.map((s) => ({ value: s.id, label: toTitleCase(s.nombre) })),
      areas: inventoryReferenceData.inventoryAreas.map((a) => ({ value: a.id, label: toTitleCase(a.nombre) })),
      proveedores: inventoryReferenceData.suppliers.map((p) => ({ value: p.id, label: toTitleCase(p.nombre) })),
      estados: [
        { value: "Activo", label: "Activo" },
        { value: "Inactivo", label: "Inactivo" }
      ]
    }),
    []
  );

  const handleFiltersChange = (next: InventoryFilters) => {
    const pruned = pruneSubcategorias(next.subcategorias, next.categorias, subcategoriaToCat);
    setFilters({ ...next, subcategorias: pruned });
    setApplyToFiltered(false);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleBulk = async (mode: "deactivate" | "delete") => {
    const ids = applyToFiltered ? [] : Array.from(selectedIds);
    if (!applyToFiltered && ids.length === 0) {
      alert("Selecciona al menos un producto o activa 'Aplicar a filtros'.");
      return;
    }
    const payload: any = {
      mode,
      scope: applyToFiltered ? "filtered" : "selected",
      ids: applyToFiltered ? undefined : ids,
      filters: applyToFiltered
        ? {
            categoryId: filters.categorias,
            subcategoryId: filters.subcategorias,
            areaId: filters.areas,
            providerId: filters.proveedores,
            status: filters.estados
          }
        : undefined
    };
    const res = await fetch("/api/inventario/productos/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-role": currentRole },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo aplicar la acción");
      return;
    }
    alert(
      `Procesados: ${data.processed || 0}\nDesactivados: ${data.deactivated || 0}\nEliminados: ${data.deleted || 0}\nSaltados: ${
        data.skipped?.length || 0
      }`
    );
    setSelectedIds(new Set());
    setApplyToFiltered(false);
    // Refrescar
    setLoading(true);
    try {
      const ref = await fetch("/api/inventario/productos", { headers: { "x-role": currentRole } });
      const refData = await ref.json().catch(() => ({}));
      const unavailable = parseServiceUnavailablePayload(ref.status, refData);
      if (unavailable) {
        setLoadIssue(unavailable);
        setProductos([]);
      } else if (ref.ok) {
        setLoadIssue(null);
        setProductos(refData.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (prod: Producto) => {
    setProductos((prev) => {
      const exists = prev.find((p) => p.id === prod.id);
      if (exists) {
        return prev.map((p) => (p.id === prod.id ? prod : p));
      }
      return [...prev, prod];
    });
    setDraft(null);
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Productos</CardTitle>
            <button
              onClick={() => {
                setDraft(null);
                setModalOpen(true);
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Nuevo producto
            </button>
          </div>
          <ServiceUnavailableNotice issue={loadIssue} />
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            filters={filters}
            onApplyFilters={handleFiltersChange}
            onClear={() => {
              setSearch("");
              handleFiltersChange(emptyInventoryFilters);
            }}
            options={options}
            counts={{ showing: filtered.length, total: productos.length }}
            subcategoriaToCategoria={subcategoriaToCat}
          />
          {(selectedIds.size > 0 || applyToFiltered) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">{applyToFiltered ? "Aplicar a filtros actuales" : `${selectedIds.size} seleccionados`}</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={applyToFiltered}
                  onChange={(e) => {
                    setApplyToFiltered(e.target.checked);
                    if (e.target.checked) setSelectedIds(new Set());
                  }}
                />
                Aplicar a filtros actuales
              </label>
              <button
                onClick={() => handleBulk("deactivate")}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Desactivar
              </button>
              {canEdit && (
                <button
                  onClick={() => handleBulk("delete")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Eliminar
                </button>
              )}
              {!applyToFiltered && (
                <button onClick={toggleSelectAll} className="text-xs text-brand-primary underline">
                  {selectedIds.size === filtered.length ? "Quitar selección" : "Seleccionar visibles"}
                </button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {loading && <div className="text-sm text-slate-500">Cargando productos…</div>}
          {!loading && filtered.map((p) => (
            <ProductCard
              key={p.id}
              producto={p}
              lowStock={p.stockActual <= p.stockMinimo}
              selectable
              showCosts={showCosts}
              selected={selectedIds.has(p.id)}
              onSelectChange={(checked) => {
                setApplyToFiltered(false);
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(p.id);
                  else next.delete(p.id);
                  return next;
                });
              }}
              onEdit={canEdit ? () => { setDraft(p); setModalOpen(true); } : undefined}
              onDeactivate={canEdit ? () => setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: "Inactivo" } : x))) : undefined}
              onDelete={
                canEdit
                  ? () => {
                      const hasMovs = inventoryReferenceData.movementSeed.some((m) => m.productoId === p.id);
                      if (hasMovs) {
                        alert("El producto tiene movimientos; usa Desactivar.");
                        return;
                      }
                      setProductos((prev) => prev.filter((x) => x.id !== p.id));
                    }
                  : undefined
              }
            />
          ))}
        </CardContent>
      </Card>

      <ProductModalV2
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={draft || undefined}
        existingCodes={productos.map((p) => p.codigo)}
        rol="Administrador"
      />
    </div>
  );
}
