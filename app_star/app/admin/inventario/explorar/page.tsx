'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type ComboLite = { id: string; nombre: string; descripcion?: string; precioFinal?: number; estado?: string };
type Finding = { title: string; count: number; items: Array<{ id: string; label: string; link?: string; extra?: string }> };

type Item = {
  id: string;
  tipo: "producto" | "servicio" | "combo";
  codigo?: string;
  nombre: string;
  categoria?: string;
  subcategoria?: string;
  area?: string;
  estado?: string;
  precio?: number;
  costo?: number;
  stock?: number;
  link?: string;
  sucursales?: Array<{ branchId: string; stock: number; minStock: number }>;
};

type PriceMap = Record<string, Record<string, number>>;

export default function InventarioExplorarPage() {
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);
  const showMargin = Boolean(headers);

  const [tab, setTab] = useState<"todos" | "productos" | "servicios" | "combos">("todos");
  const [items, setItems] = useState<Item[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>([]);
  const [priceMaps, setPriceMaps] = useState<{ PRODUCT: PriceMap; SERVICE: PriceMap; COMBO: PriceMap }>({
    PRODUCT: {},
    SERVICE: {},
    COMBO: {}
  });
  const [filters, setFilters] = useState({
    search: "",
    categoria: "",
    subcategoria: "",
    area: "",
    estado: "",
    sucursal: "",
    priceListId: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const term = filters.search.toLowerCase();
    return items.filter((i) => {
      if (tab !== "todos" && i.tipo !== tab.slice(0, -1)) return false;
      if (filters.categoria && i.categoria !== filters.categoria) return false;
      if (filters.subcategoria && i.subcategoria !== filters.subcategoria) return false;
      if (filters.area && i.area !== filters.area) return false;
      if (filters.estado && i.estado !== filters.estado) return false;
      if (filters.sucursal && !i.sucursales?.some((s) => s.branchId === filters.sucursal)) return false;
      if (term && !`${i.nombre} ${i.codigo || ""} ${i.categoria || ""} ${i.subcategoria || ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, tab, filters]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodsRes, servsRes, combosRes, integrityRes] = await Promise.all([
        fetch("/api/inventario/productos?role=Administrador", { headers }),
        fetch("/api/inventario/servicios?role=Administrador", { headers }),
        fetch("/api/inventario/combos", { headers }),
        fetch("/api/inventario/integrity", { headers })
      ]);
      const [prods, servs, combos, integ] = await Promise.all([prodsRes.json(), servsRes.json(), combosRes.json(), integrityRes.json()]);
      const prodItems: Item[] = (prods.data || []).map((p: any) => ({
        id: p.id,
        tipo: "producto",
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoriaNombre,
        subcategoria: p.subcategoriaNombre,
        area: p.areaNombre,
        estado: p.estado,
        precio: p.precioVenta,
        costo: p.costoUnitario ?? p.avgCost,
        stock: p.stockActual,
        link: `/admin/inventario/productos/${p.id}`,
        sucursales: p.stockPorSucursal
      }));
      const servItems: Item[] = (servs.data || []).map((s: any) => ({
        id: s.id,
        tipo: "servicio",
        codigo: s.codigoServicio,
        nombre: s.nombre,
        categoria: s.categoriaNombre,
        subcategoria: s.subcategoriaNombre,
        estado: s.estado,
        precio: s.precioVenta,
        costo: s.costoBase,
        link: `/admin/inventario/servicios/${s.id}`
      }));
      const comboItems: Item[] = (combos.data || []).map((c: ComboLite) => ({
        id: c.id,
        tipo: "combo",
        nombre: c.nombre,
        estado: (c as any).estado,
        precio: c.precioFinal,
        costo: (c as any).costoCalculado || (c as any).costoProductosTotal,
        link: `/admin/inventario/combos/${c.id}`
      }));
      setItems([...prodItems, ...servItems, ...comboItems]);
      setFindings(integ.findings || []);
      await loadPriceMaps();
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadPriceMaps = async () => {
    try {
      const productRes = await fetch("/api/inventario/prices/matrix?itemType=PRODUCT", { headers });
      const productData = await productRes.json();
      const serviceRes = await fetch("/api/inventario/prices/matrix?itemType=SERVICE", { headers });
      const serviceData = await serviceRes.json();
      const comboRes = await fetch("/api/inventario/prices/matrix?itemType=COMBO", { headers });
      const comboData = await comboRes.json();
      setLists(productData.lists || []);
      setPriceMaps({
        PRODUCT: productData.prices || {},
        SERVICE: serviceData.prices || {},
        COMBO: comboData.prices || {}
      });
    } catch {
      // ignore errors to not block view
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {["todos", "productos", "servicios", "combos"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {toLabel(t)}
          </button>
        ))}
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Buscar..."
          className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <SearchableSelect
          label="Categoría"
          value={filters.categoria}
          onChange={(v) => setFilters((f) => ({ ...f, categoria: (v as string) || "" }))}
          options={[
            { value: "", label: "Todas" },
            ...Array.from(new Set(items.map((i) => i.categoria).filter(Boolean))).map((c) => ({ value: c as string, label: c as string }))
          ]}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Subcategoría"
          value={filters.subcategoria}
          onChange={(v) => setFilters((f) => ({ ...f, subcategoria: (v as string) || "" }))}
          options={[
            { value: "", label: "Todas" },
            ...Array.from(new Set(items.map((i) => i.subcategoria).filter(Boolean))).map((c) => ({ value: c as string, label: c as string }))
          ]}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Área"
          value={filters.area}
          onChange={(v) => setFilters((f) => ({ ...f, area: (v as string) || "" }))}
          options={[
            { value: "", label: "Todas" },
            ...Array.from(new Set(items.map((i) => i.area).filter(Boolean))).map((c) => ({ value: c as string, label: c as string }))
          ]}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Estado"
          value={filters.estado}
          onChange={(v) => setFilters((f) => ({ ...f, estado: (v as string) || "" }))}
          options={[
            { value: "", label: "Todos" },
            ...Array.from(new Set(items.map((i) => i.estado).filter(Boolean))).map((c) => ({ value: c as string, label: c as string }))
          ]}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Sucursal"
          value={filters.sucursal}
          onChange={(v) => setFilters((f) => ({ ...f, sucursal: (v as string) || "" }))}
          options={[
            { value: "", label: "Todas" },
            ...Array.from(new Set(items.flatMap((i) => i.sucursales?.map((s) => s.branchId) || []).filter(Boolean))).map((c) => ({
              value: c as string,
              label: c as string
            }))
          ]}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Lista de precios"
          value={filters.priceListId}
          onChange={(v) => setFilters((f) => ({ ...f, priceListId: (v as string) || "" }))}
          options={[
            { value: "", label: "Particular (base)" },
            ...lists.map((l) => ({ value: l.id, label: l.name }))
          ]}
          includeAllOption={false}
        />
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {loading && <p className="text-sm text-slate-500">Cargando...</p>}

      <Card>
        <CardHeader>
          <CardTitle>Integridad de datos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {findings.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-bold text-white">{f.count}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {f.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>{item.label}</span>
                    {item.link && (
                      <Link href={item.link} className="text-xs font-semibold text-brand-primary underline">
                        Ver
                      </Link>
                    )}
                  </li>
                ))}
                {f.items.length === 0 && <li className="text-xs text-slate-500">Sin hallazgos</li>}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {filteredItems.map((item) => (
        <div key={`${item.tipo}-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{toLabel(item.tipo)}</p>
              <p className="text-sm font-semibold text-slate-800">{item.nombre}</p>
              <p className="text-xs text-slate-500">{item.codigo || "Sin código"}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{item.estado || "Activo"}</span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {item.categoria && <p>Categoría: {item.categoria}</p>}
            {item.subcategoria && <p>Subcategoría: {item.subcategoria}</p>}
            {item.area && <p>Área: {item.area}</p>}
            {item.stock !== undefined && <p>Stock: {item.stock}</p>}
            <p className="font-semibold text-slate-800">
              {filters.priceListId
                ? `Precio (${listLabel(filters.priceListId, lists)}): Q${getPrice(item, filters.priceListId, priceMaps).toFixed(2)}`
                : `Precio base: Q${getPrice(item, "", priceMaps).toFixed(2)}`}
            </p>
            {showMargin && item.costo !== undefined && (
              <p className="text-[11px] text-slate-600">
                Margen estimado: Q{marginAmount(item, filters.priceListId, priceMaps).toFixed(2)}
                {" · "}
                {marginPct(item, filters.priceListId, priceMaps).toFixed(1)}%
              </p>
            )}
          </div>
          {item.link && (
            <Link href={item.link} className="mt-2 inline-block text-xs font-semibold text-brand-primary underline">
              Ver detalle
            </Link>
            )}
          </div>
        ))}
        {filteredItems.length === 0 && !loading && <p className="text-sm text-slate-500">No hay resultados.</p>}
      </div>
    </div>
  );
}

function toLabel(id: string) {
  if (id === "todos") return "Todos";
  if (id === "productos") return "Productos";
  if (id === "servicios") return "Servicios";
  if (id === "combos") return "Combos";
  return id;
}

function listLabel(id: string, lists: Array<{ id: string; name: string }>) {
  if (!id) return "Particular";
  return lists.find((l) => l.id === id)?.name || id;
}

function getPrice(item: Item, priceListId: string, priceMaps: { PRODUCT: PriceMap; SERVICE: PriceMap; COMBO: PriceMap }) {
  const map = item.tipo === "producto" ? priceMaps.PRODUCT : item.tipo === "servicio" ? priceMaps.SERVICE : priceMaps.COMBO;
  const priceList = priceListId && map[item.id]?.[priceListId];
  const base = item.precio || 0;
  return priceList !== undefined ? Number(priceList) : Number(base);
}

function marginAmount(item: Item, priceListId: string, priceMaps: { PRODUCT: PriceMap; SERVICE: PriceMap; COMBO: PriceMap }) {
  const price = getPrice(item, priceListId, priceMaps);
  const cost = item.costo ?? 0;
  return price - cost;
}

function marginPct(item: Item, priceListId: string, priceMaps: { PRODUCT: PriceMap; SERVICE: PriceMap; COMBO: PriceMap }) {
  const price = getPrice(item, priceListId, priceMaps);
  const cost = item.costo ?? 0;
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}
// @ts-nocheck
