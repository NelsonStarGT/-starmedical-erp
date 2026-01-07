'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type ItemTypeOption = "PRODUCT" | "SERVICE" | "COMBO";
type PriceList = { id: string; name: string; type: string; status: string };
type ItemRow = { id: string; code: string; name: string };

export default function MatrizPreciosPage() {
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const [itemType, setItemType] = useState<ItemTypeOption>("PRODUCT");
  const [lists, setLists] = useState<PriceList[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({});
  const [changes, setChanges] = useState<
    Array<{ priceListId: string; itemType: ItemTypeOption; itemCode: string; price: number }>
  >([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(term));
  }, [items, search]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventario/prices/matrix?itemType=${itemType}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar precios");
      setLists(data.lists || []);
      setItems(data.items || []);
      setPrices(data.prices || {});
      setChanges([]);
    } catch (err: any) {
      setError(err?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemType]);

  const setPrice = (itemId: string, priceListId: string, value: number) => {
    setPrices((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [priceListId]: value }
    }));
    setChanges((prev) => {
      const other = prev.filter((c) => !(c.itemCode === itemId && c.priceListId === priceListId));
      return [...other, { priceListId, itemType, itemCode: itemId, price: value }];
    });
  };

  const save = async () => {
    if (changes.length === 0) {
      setMessage("Nada que guardar");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/inventario/prices/matrix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(changes)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setMessage("Precios actualizados");
      setChanges([]);
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const onImport = async (file: File) => {
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/inventario/prices/matrix/import/xlsx", {
      method: "POST",
      headers: { ...(headers || {}) },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo importar");
    setMessage(`Importados ${data.imported || 0} precios`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          label="Tipo de item"
          value={itemType}
          onChange={(v) => setItemType((v as ItemTypeOption) || "PRODUCT")}
          options={[
            { value: "PRODUCT", label: "Productos" },
            { value: "SERVICE", label: "Servicios" },
            { value: "COMBO", label: "Combos" }
          ]}
          includeAllOption={false}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código/nombre"
          className="mt-6 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        />
        <a
          href={`/api/inventario/prices/matrix/export/xlsx?itemType=${itemType}`}
          className="mt-6 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Exportar Excel
        </a>
        <label className="mt-6 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Importar Excel
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file).catch((err) => setError(err.message || "Error al importar"));
            }}
          />
        </label>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando matriz…</p>}
      {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Precios por aseguradora</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <th className="px-2 py-2">Código</th>
                <th className="px-2 py-2">Nombre</th>
                {lists.map((l) => (
                  <th key={l.id} className="px-2 py-2">{l.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-xs text-slate-700">{item.code}</td>
                  <td className="px-2 py-2 text-xs text-slate-700">{item.name}</td>
                  {lists.map((l) => (
                    <td key={l.id} className="px-2 py-1">
                      <input
                        type="number"
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                        value={prices[item.id]?.[l.id] ?? ""}
                        onChange={(e) => setPrice(item.id, l.id, Number(e.target.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-sm text-slate-500" colSpan={lists.length + 2}>
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
