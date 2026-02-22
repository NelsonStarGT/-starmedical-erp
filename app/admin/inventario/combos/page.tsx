'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComboCard } from "@/components/inventario/ComboCard";
import ServiceUnavailableNotice from "@/components/inventario/ServiceUnavailableNotice";
import { Modal } from "@/components/ui/Modal";
import { Combo, Producto, RolInventario, Servicio, hasPermission } from "@/lib/types/inventario";
import { ProductListWithQuantity } from "@/components/inventario/ProductListWithQuantity";
import { ServiceSelector } from "@/components/inventario/ServiceSelector";
import { inventoryReferenceData } from "@/lib/inventory/runtime-fallback";
import { parseServiceUnavailablePayload, type ServiceUnavailablePayload } from "@/lib/inventory/runtime-contract";

export default function CombosPage() {
  const role: RolInventario = "Administrador";
  const canEdit = hasPermission(role, "editar_combo");
  const showCosts = hasPermission(role, "ver_costos");
  const [combos, setCombos] = useState<Combo[]>([]);
  const [services, setServices] = useState<Servicio[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Combo>>({ serviciosAsociados: [], productosAsociados: [] });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyToFiltered, setApplyToFiltered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadIssue, setLoadIssue] = useState<ServiceUnavailablePayload | null>(null);

  const servicioIndex = useMemo(() => services.reduce<Record<string, Servicio>>((acc, srv) => ({ ...acc, [srv.id]: srv }), {}), [services]);
  const productoIndex = useMemo(() => products.reduce<Record<string, Producto>>((acc, prod) => ({ ...acc, [prod.id]: prod }), {}), [products]);

  const categoriaServicioNames = useMemo(
    () => inventoryReferenceData.serviceCategories.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.nombre }), {}),
    []
  );
  const subcategoriaServicioNames = useMemo(
    () => inventoryReferenceData.serviceSubcategories.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.nombre }), {}),
    []
  );
  const categoriaProductoNames = useMemo(
    () => inventoryReferenceData.productCategories.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.nombre }), {}),
    []
  );
  const subcategoriaProductoNames = useMemo(
    () => inventoryReferenceData.productSubcategories.reduce<Record<string, string>>((acc, sub) => ({ ...acc, [sub.id]: sub.nombre }), {}),
    []
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tokens = term ? term.split(/\s+/).filter(Boolean) : [];
    return combos.filter((c) => {
      if (statusFilter && c.estado !== statusFilter) return false;
      if (tokens.length === 0) return true;
      const serviceFields = (c.serviciosAsociados || []).flatMap((id) => {
        const srv = servicioIndex[id];
        return [
          srv?.nombre,
          srv?.id,
          srv?.codigoServicio,
          srv?.categoriaId ? categoriaServicioNames[srv.categoriaId] : "",
          srv?.subcategoriaId ? subcategoriaServicioNames[srv.subcategoriaId] : ""
        ];
      });
      const productFields = (c.productosAsociados || []).flatMap(({ productoId }) => {
        const prod = productoIndex[productoId];
        return [
          prod?.nombre,
          prod?.id,
          prod?.codigo,
          prod?.categoriaId ? categoriaProductoNames[prod.categoriaId] : "",
          prod?.subcategoriaId ? subcategoriaProductoNames[prod.subcategoriaId] : ""
        ];
      });
      const haystack = [c.nombre, c.descripcion, c.id, ...serviceFields, ...productFields]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [
    combos,
    search,
    servicioIndex,
    productoIndex,
    categoriaServicioNames,
    subcategoriaServicioNames,
    categoriaProductoNames,
    subcategoriaProductoNames,
    statusFilter
  ]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, sRes, pRes] = await Promise.all([
          fetch(`/api/inventario/combos?q=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ""}`),
          fetch("/api/inventario/servicios"),
          fetch("/api/inventario/productos", { headers: { "x-role": role } })
        ]);
        const cJson = await cRes.json().catch(() => ({}));
        const sJson = await sRes.json().catch(() => ({}));
        const pJson = await pRes.json().catch(() => ({}));
        const serviceUnavailable = parseServiceUnavailablePayload(sRes.status, sJson);
        const productUnavailable = parseServiceUnavailablePayload(pRes.status, pJson);
        setLoadIssue(serviceUnavailable || productUnavailable || null);
        if (cRes.ok) setCombos(cJson.data || []);
        if (sRes.ok) setServices(sJson.data || []);
        else setServices([]);
        if (pRes.ok) setProducts(pJson.data || []);
        else setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [search, statusFilter, role]);

  const refreshCombos = async () => {
    const res = await fetch(`/api/inventario/combos?q=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ""}`);
    const json = await res.json();
    if (res.ok) setCombos(json.data || []);
  };

  const save = async () => {
    if (!draft.nombre) {
      alert("Nombre requerido");
      return;
    }
    const payload = {
      nombre: draft.nombre,
      descripcion: draft.descripcion,
      serviciosAsociados: draft.serviciosAsociados || [],
      productosAsociados: draft.productosAsociados || [],
      precioFinal: draft.precioFinal || 0,
      estado: draft.estado || "Activo",
      imageUrl: draft.imageUrl
    };
    const method = draft.id ? "PATCH" : "POST";
    const url = draft.id ? `/api/inventario/combos/${draft.id}` : "/api/inventario/combos";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-role": role },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo guardar el combo");
      return;
    }
    if (draft.id) {
      setCombos((prev) => prev.map((c) => (c.id === draft.id ? data.data : c)));
    } else {
      setCombos((prev) => [data.data, ...prev]);
    }
    setModalOpen(false);
    setDraft({ serviciosAsociados: [], productosAsociados: [] });
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const handleBulk = async (mode: "deactivate" | "delete") => {
    const ids = applyToFiltered ? [] : Array.from(selectedIds);
    if (!applyToFiltered && ids.length === 0) {
      alert("Selecciona al menos un combo o activa 'Aplicar a búsqueda'.");
      return;
    }
    const payload: any = {
      mode,
      scope: applyToFiltered ? "filtered" : "selected",
      ids: applyToFiltered ? undefined : ids,
      filters: applyToFiltered ? { search, status: statusFilter || undefined } : undefined
    };
    const res = await fetch("/api/inventario/combos/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-role": role },
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
    await refreshCombos();
    setSelectedIds(new Set());
    setApplyToFiltered(false);
  };

  const duplicate = async (combo: Combo) => {
    const payload = {
      nombre: `Copia de ${combo.nombre}`,
      descripcion: combo.descripcion,
      serviciosAsociados: combo.serviciosAsociados,
      productosAsociados: combo.productosAsociados,
      precioFinal: combo.precioFinal,
      estado: combo.estado,
      imageUrl: combo.imageUrl
    };
    const res = await fetch("/api/inventario/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-role": role },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo duplicar");
      return;
    }
    setCombos((prev) => [data.data, ...prev]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este combo?")) return;
    const res = await fetch(`/api/inventario/combos/${id}`, { method: "DELETE", headers: { "x-role": role } });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDeactivate = async (id: string) => {
    const res = await fetch(`/api/inventario/combos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-role": role },
      body: JSON.stringify({ estado: "Inactivo" })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo desactivar");
      return;
    }
    setCombos((prev) => prev.map((c) => (c.id === id ? data.data : c)));
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      alert("Solo JPG/PNG");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("Máximo 20MB");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload/image", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Error al subir");
      return;
    }
    setDraft((prev) => ({ ...prev, imageUrl: json.url }));
  };

  const costoCalculadoDraft = useMemo(() => {
    return (draft.productosAsociados || []).reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productoId);
      const cost = prod ? prod.avgCost ?? (prod as any).costoUnitario ?? 0 : 0;
      return acc + cost * (item.cantidad || 0);
    }, 0);
  }, [draft.productosAsociados, products]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="w-full sm:w-72">
              <input
                placeholder="Buscar por nombre, ID, categoría o subcategoría"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            >
              <option value="">Estado: Todos</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>
          </div>
          <CardTitle>Combos / Paquetes</CardTitle>
          <button
            onClick={() => {
              setDraft({ serviciosAsociados: [], productosAsociados: [], estado: "Activo" });
              setModalOpen(true);
            }}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
          >
            Nuevo combo
          </button>
        </CardHeader>
        <div className="px-6">
          <ServiceUnavailableNotice issue={loadIssue} />
        </div>
        {(selectedIds.size > 0 || applyToFiltered) && (
          <div className="mx-6 mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold">{applyToFiltered ? "Aplicar a búsqueda actual" : `${selectedIds.size} seleccionados`}</span>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={applyToFiltered}
                onChange={(e) => {
                  setApplyToFiltered(e.target.checked);
                  if (e.target.checked) setSelectedIds(new Set());
                }}
              />
              Aplicar a búsqueda actual
            </label>
            <button
              onClick={() => handleBulk("deactivate")}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Desactivar
            </button>
            <button
              onClick={() => handleBulk("delete")}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Eliminar
            </button>
            {!applyToFiltered && (
              <button onClick={toggleSelectAll} className="text-xs text-brand-primary underline">
                {selectedIds.size === filtered.length ? "Quitar selección" : "Seleccionar visibles"}
              </button>
            )}
          </div>
        )}
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {loading && <div className="text-sm text-slate-500">Cargando combos…</div>}
          {!loading &&
            filtered.map((c) => (
              <ComboCard
                key={c.id}
                combo={c}
                showCosts={showCosts}
                servicioIndex={servicioIndex}
                productoIndex={productoIndex}
                selectable
                selected={selectedIds.has(c.id)}
                onSelectChange={(checked) => {
                  setApplyToFiltered(false);
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(c.id);
                    else next.delete(c.id);
                    return next;
                  });
                }}
                onEdit={
                  canEdit
                    ? () => {
                      setDraft(c);
                      setModalOpen(true);
                    }
                    : undefined
                }
                onDeactivate={canEdit ? () => handleDeactivate(c.id) : undefined}
                onDelete={canEdit ? () => handleDelete(c.id) : undefined}
                onDuplicate={canEdit ? () => duplicate(c) : undefined}
              />
            ))}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Combo / Paquete"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              Cancelar
            </button>
            <button onClick={save} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft">
              Guardar
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <input
            placeholder="Nombre"
            value={draft.nombre || ""}
            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
          <textarea
            placeholder="Descripción"
            value={draft.descripcion || ""}
            onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Servicios incluidos</p>
            <div className="flex flex-col gap-2">
              {(draft.serviciosAsociados || []).map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ServiceSelector
                    value={s}
                    services={services}
                    onChange={(val) => {
                      const next = [...(draft.serviciosAsociados || [])];
                      next[idx] = val;
                      setDraft({ ...draft, serviciosAsociados: next });
                    }}
                  />
                  <button
                    onClick={() => setDraft({ ...draft, serviciosAsociados: (draft.serviciosAsociados || []).filter((_, i) => i !== idx) })}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDraft({ ...draft, serviciosAsociados: [...(draft.serviciosAsociados || []), ""] })}
                className="text-sm font-semibold text-brand-primary hover:underline"
              >
                + Agregar servicio
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Productos incluidos</p>
            <ProductListWithQuantity
              items={draft.productosAsociados || []}
              productos={products}
              onChange={(items) => setDraft({ ...draft, productosAsociados: items })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Precio final"
              value={draft.precioFinal || 0}
              onChange={(e) => setDraft({ ...draft, precioFinal: Number(e.target.value) })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <div className="flex items-center">
              <span className="text-sm text-slate-700">Costo calculado: Q{costoCalculadoDraft.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Imagen</p>
            {draft.imageUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.imageUrl} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
                <button className="text-xs text-red-500" onClick={() => setDraft({ ...draft, imageUrl: undefined })}>
                  Quitar
                </button>
              </div>
            )}
            <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
