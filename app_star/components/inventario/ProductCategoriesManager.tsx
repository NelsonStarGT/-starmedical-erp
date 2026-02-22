// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoriaProducto, Subcategoria } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

type Props = { role?: string };

export function ProductCategoriesManager({ role = "Administrador" }: Props) {
  const [categories, setCategories] = useState<CategoriaProducto[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategoria[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState<Partial<CategoriaProducto>>({ tipo: "FARMACIA", estado: "Activo", order: 0 });
  const [subForm, setSubForm] = useState<Partial<Subcategoria>>({ estado: "Activo", order: 0 });
  const [loading, setLoading] = useState(false);

  const selectedCat = useMemo(() => categories.find((c) => c.id === selectedCatId) || null, [categories, selectedCatId]);
  const filteredSubs = useMemo(() => subcategories.filter((s) => s.categoriaId === selectedCatId), [subcategories, selectedCatId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/inventario/categorias/productos"),
        fetch("/api/inventario/subcategorias/productos")
      ]);
      const cJson = await cRes.json();
      const sJson = await sRes.json();
      if (cRes.ok) setCategories(cJson.data || []);
      if (sRes.ok) setSubcategories(sJson.data || []);
      setSelectedCatId((prev) => {
        if (prev) return prev;
        return cJson?.data?.[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCategory = async () => {
    if (!catForm.nombre || !catForm.slug || !catForm.tipo) {
      alert("Nombre, slug y tipo son requeridos");
      return;
    }
    const payload = {
      name: catForm.nombre,
      slug: catForm.slug,
      type: catForm.tipo,
      order: Number(catForm.order || 0),
      status: catForm.estado || "Activo"
    };
    const res = await fetch(catForm.id ? `/api/inventario/categorias/productos/${catForm.id}` : "/api/inventario/categorias/productos", {
      method: catForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "x-role": role },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo guardar la categoría");
      return;
    }
    await load();
    setCatForm({ tipo: "FARMACIA", estado: "Activo", order: 0 });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("¿Eliminar categoría? (solo si no tiene dependencias)")) return;
    const res = await fetch(`/api/inventario/categorias/productos/${id}`, { method: "DELETE", headers: { "x-role": role } });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
    setSelectedCatId(categories.find((c) => c.id !== id)?.id || null);
  };

  const saveSubcategory = async () => {
    if (!subForm.categoriaId || !subForm.nombre || !subForm.slug) {
      alert("Nombre, slug y categoría son requeridos");
      return;
    }
    const payload = {
      categoryId: subForm.categoriaId,
      name: subForm.nombre,
      slug: subForm.slug,
      order: Number(subForm.order || 0),
      status: subForm.estado || "Activo"
    };
    const res = await fetch(
      subForm.id ? `/api/inventario/subcategorias/productos/${subForm.id}` : "/api/inventario/subcategorias/productos",
      {
        method: subForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-role": role },
        body: JSON.stringify(payload)
      }
    );
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo guardar la subcategoría");
      return;
    }
    await load();
    setSubForm({ categoriaId: selectedCatId || undefined, estado: "Activo", order: 0 });
  };

  const deleteSubcategory = async (id: string) => {
    if (!confirm("¿Eliminar subcategoría?")) return;
    const res = await fetch(`/api/inventario/subcategorias/productos/${id}`, { method: "DELETE", headers: { "x-role": role } });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Categorías de productos</p>
          {loading && <span className="text-xs text-slate-500">Cargando…</span>}
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Slug</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">#Subcat</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {categories.map((c) => (
              <tr
                key={c.id}
                className={cn("cursor-pointer", selectedCatId === c.id && "bg-brand-primary/5")}
                onClick={() => {
                  setSelectedCatId(c.id);
                  setSubForm({ categoriaId: c.id, estado: "Activo", order: 0 });
                }}
              >
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">{c.nombre || c.name}</td>
                <td className="px-3 py-2 text-sm text-slate-700">{c.slug}</td>
                <td className="px-3 py-2 text-sm text-slate-700">{c.estado || c.status}</td>
                <td className="px-3 py-2 text-sm text-slate-700">
                  {subcategories.filter((s) => s.categoriaId === c.id).length}
                </td>
                <td className="px-3 py-2 text-sm text-slate-700 space-x-2">
                  <button className="text-brand-primary text-xs" onClick={() => setCatForm({ ...c })}>
                    Editar
                  </button>
                  <button className="text-rose-600 text-xs" onClick={(e) => { e.stopPropagation(); deleteCategory(c.id); }}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-sm text-slate-500" colSpan={5}>
                  No hay categorías; crea la primera.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-800 mb-2">Subcategorías</p>
          {selectedCat ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Slug</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredSubs.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.nombre}</td>
                    <td className="px-3 py-2 text-slate-700">{s.slug}</td>
                    <td className="px-3 py-2 text-slate-700">{s.estado || s.status}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button className="text-brand-primary text-xs" onClick={() => setSubForm({ ...s })}>
                        Editar
                      </button>
                      <button className="text-rose-600 text-xs" onClick={() => deleteSubcategory(s.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-sm text-slate-500" colSpan={4}>
                      No hay subcategorías para esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-500">Selecciona una categoría para ver subcategorías.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
          <p className="text-sm font-semibold text-slate-800">Crear / Editar categoría</p>
          <input
            placeholder="Nombre categoría"
            value={catForm.nombre || ""}
            onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value, slug: catForm.slug || slugify(e.target.value) })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug"
            value={catForm.slug || ""}
            onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          />
          <select
            value={catForm.tipo || ""}
            onChange={(e) => setCatForm({ ...catForm, tipo: e.target.value })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          >
            <option value="FARMACIA">FARMACIA</option>
            <option value="INSUMOS">INSUMOS</option>
            <option value="IMAGEN">IMAGEN</option>
            <option value="LABORATORIO">LABORATORIO</option>
            <option value="LIMPIEZA">LIMPIEZA</option>
            <option value="OFICINA">OFICINA</option>
            <option value="OTROS">OTROS</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={catForm.estado || "Activo"}
              onChange={(e) => setCatForm({ ...catForm, estado: e.target.value })}
              className="rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <input
              type="number"
              placeholder="Orden"
              value={catForm.order ?? 0}
              onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
              className="rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            {catForm.id && (
              <button className="text-xs text-slate-500 underline" onClick={() => setCatForm({ tipo: "FARMACIA", estado: "Activo", order: 0 })}>
                Limpiar
              </button>
            )}
            <button
              onClick={saveCategory}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Guardar categoría
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
          <p className="text-sm font-semibold text-slate-800">Crear / Editar subcategoría</p>
          <select
            value={subForm.categoriaId || selectedCatId || ""}
            onChange={(e) => setSubForm({ ...subForm, categoriaId: e.target.value })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          >
            <option value="">Selecciona categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre || c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Nombre subcategoría"
            value={subForm.nombre || ""}
            onChange={(e) => setSubForm({ ...subForm, nombre: e.target.value, slug: subForm.slug || slugify(e.target.value) })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug"
            value={subForm.slug || ""}
            onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })}
            className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={subForm.estado || "Activo"}
              onChange={(e) => setSubForm({ ...subForm, estado: e.target.value })}
              className="rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <input
              type="number"
              placeholder="Orden"
              value={subForm.order ?? 0}
              onChange={(e) => setSubForm({ ...subForm, order: Number(e.target.value) })}
              className="rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            {subForm.id && (
              <button className="text-xs text-slate-500 underline" onClick={() => setSubForm({ categoriaId: selectedCatId || undefined, estado: "Activo", order: 0 })}>
                Limpiar
              </button>
            )}
            <button
              onClick={saveSubcategory}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Guardar subcategoría
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
// @ts-nocheck
