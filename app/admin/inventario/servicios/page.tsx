'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ServiceCard } from "@/components/inventario/ServiceCard";
import { ServiceModal } from "@/components/inventario/ServiceModal";
import { ServiceModalV2 } from "@/components/inventario/ServiceModalV2";
import { SearchFilterBar } from "@/components/inventory/SearchFilterBar";
import { categoriasServicioMock, serviceSubcategoriasMock, proveedoresMock } from "@/lib/mock/inventario-catalogos";
import { combosMock } from "@/lib/mock/combos";
import { InventoryFilters, emptyInventoryFilters, filterServicios, pruneSubcategorias } from "@/lib/inventory/filters";
import { Servicio, hasPermission } from "@/lib/types/inventario";
import { toTitleCase } from "@/lib/utils";

export default function ServiciosPage() {
  const currentRole = "Administrador";
  const canEdit = hasPermission(currentRole as any, "editar_servicio");
  const showCosts = hasPermission(currentRole as any, "ver_costos");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Servicio | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>(emptyInventoryFilters);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyToFiltered, setApplyToFiltered] = useState(false);
  const [importModal, setImportModal] = useState<null | "servicios" | "implementos">(null);

  const categoriaNames = useMemo(
    () => categoriasServicioMock.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.nombre }), {}),
    []
  );
  const subcategoriaNames = useMemo(
    () => serviceSubcategoriasMock.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.nombre }), {}),
    []
  );
  const subcategoriaToCat = useMemo(
    () => serviceSubcategoriasMock.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.categoriaId }), {}),
    []
  );
  const categoriaAreaMap = useMemo(
    () => categoriasServicioMock.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.area }), {}),
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/inventario/servicios", { headers: { "x-role": currentRole } });
        const data = await res.json();
        if (res.ok) {
          setServicios(data.data || []);
          setSelectedIds(new Set());
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(
    () =>
      filterServicios({
        items: servicios,
        search,
        filters,
        catalogos: {
          categorias: categoriaNames,
          subcategorias: subcategoriaNames,
          areas: Object.values(categoriaAreaMap).reduce<Record<string, string>>((acc, area) => ({ ...acc, [area]: area }), {}),
          proveedores: proveedoresMock.reduce<Record<string, string>>((acc, prov) => ({ ...acc, [prov.id]: prov.nombre }), {})
        },
        categoriaAreas: categoriaAreaMap
      }),
    [servicios, search, filters, categoriaNames, subcategoriaNames, categoriaAreaMap]
  );

  const formatArea = (text: string) => toTitleCase(text.replace(/[_-]+/g, " "));

  const ServiceModalComponent = ServiceModalV2 ?? ServiceModal;

  const options = useMemo(
    () => ({
      categorias: categoriasServicioMock.map((c) => ({ value: c.id, label: toTitleCase(c.nombre) })),
      subcategorias: serviceSubcategoriasMock.map((s) => ({ value: s.id, label: toTitleCase(s.nombre) })),
      areas: Array.from(new Set(categoriasServicioMock.map((c) => c.area))).map((area) => ({ value: area, label: formatArea(area) })),
      proveedores: proveedoresMock.map((p) => ({ value: p.id, label: toTitleCase(p.nombre) })),
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

  const handleSave = (srv: Servicio) => {
    setServicios((prev) => {
      const exists = prev.find((s) => s.id === srv.id);
      if (exists) return prev.map((s) => (s.id === srv.id ? srv : s));
      return [...prev, srv];
    });
    setDraft(null);
    setModalOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s) => s.id)));
  };

  const handleBulk = async (mode: "deactivate" | "delete") => {
    const ids = applyToFiltered ? [] : Array.from(selectedIds);
    if (!applyToFiltered && ids.length === 0) {
      alert("Selecciona al menos un servicio o activa 'Aplicar a filtros'.");
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
            status: filters.estados
          }
        : undefined
    };
    const res = await fetch("/api/inventario/servicios/bulk", {
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
      const ref = await fetch("/api/inventario/servicios", { headers: { "x-role": currentRole } });
      const refData = await ref.json();
      if (ref.ok) setServicios(refData.data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Servicios</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setImportModal("servicios")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Importar servicios (.xlsx)
              </button>
              <button
                onClick={() => setImportModal("implementos")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                Importar implementos por servicio (.xlsx)
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setModalOpen(true);
                }}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
              >
                Nuevo servicio
              </button>
            </div>
          </div>
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
            counts={{ showing: filtered.length, total: servicios.length }}
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
          {loading && <div className="text-sm text-slate-500">Cargando servicios…</div>}
          {!loading && filtered.map((s) => (
            <ServiceCard
              key={s.id}
              servicio={s}
              selectable
              selected={selectedIds.has(s.id)}
              showCosts={showCosts}
              onSelectChange={(checked) => {
                setApplyToFiltered(false);
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(s.id);
                  else next.delete(s.id);
                  return next;
                });
              }}
              onEdit={canEdit ? () => { setDraft(s); setModalOpen(true); } : undefined}
              onDeactivate={canEdit ? () => setServicios((prev) => prev.map((x) => (x.id === s.id ? { ...x, estado: "Inactivo" } : x))) : undefined}
              onDelete={
                canEdit
                  ? () => {
                      const usedInCombo = combosMock.some((c) => (c.serviciosAsociados || []).includes(s.id));
                      if (usedInCombo) {
                        alert("El servicio está en un combo; usa Desactivar.");
                        return;
                      }
                      setServicios((prev) => prev.filter((x) => x.id !== s.id));
                    }
                  : undefined
              }
            />
          ))}
        </CardContent>
      </Card>

      <ServiceModalComponent
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={draft || undefined}
        existingCodes={servicios.map((s) => s.codigoServicio || "").filter(Boolean)}
        rol="Administrador"
      />

      {importModal && (
        <Modal
          open
          onClose={() => setImportModal(null)}
          title={importModal === "servicios" ? "Importar servicios" : "Importar implementos por servicio"}
          subtitle="Preparación para importación masiva"
        >
          <div className="space-y-3 text-sm text-slate-700">
            <p>Dejamos los botones listos. Este modal es un placeholder para la importación masiva en .xlsx.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Soportará validación de columnas y previsualización.</li>
              <li>Podrás subir plantillas de servicios o de implementos por servicio.</li>
              <li>Rol actual: Administrador.</li>
            </ul>
            <p className="text-xs text-slate-500">Funcionalidad se integrará en la siguiente iteración.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
