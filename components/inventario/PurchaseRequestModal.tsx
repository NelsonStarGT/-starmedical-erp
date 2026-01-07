"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { proveedoresMock, sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import { Producto, PurchaseRequest } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

type ItemDraft = {
  productId: string;
  quantity: number;
  supplierId?: string;
  notes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (req: PurchaseRequest) => void;
  token?: string;
  requestedById?: string;
};

export function PurchaseRequestModal({ open, onClose, onCreated, token, requestedById = "admin-ui" }: Props) {
  const [branchId, setBranchId] = useState<string>(sucursalesInvMock[0]?.id || "");
  const [items, setItems] = useState<ItemDraft[]>([{ productId: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/inventario/productos", {
          headers: token ? { "x-inventory-token": token } : undefined
        });
        const data = await res.json();
        if (res.ok) setProducts(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, token]);

  useEffect(() => {
    if (!open) {
      setItems([{ productId: "", quantity: 1 }]);
      setBranchId(sucursalesInvMock[0]?.id || "");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: `${p.nombre} (${p.codigo})` })),
    [products]
  );

  const supplierOptions = useMemo(
    () => proveedoresMock.map((p) => ({ value: p.id, label: p.nombre })),
    []
  );

  const handleItemChange = (idx: number, value: Partial<ItemDraft>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...value };
    if (value.productId) {
      const suggested = suggestQuantity(value.productId);
      if (suggested > 0 && (!next[idx].quantity || next[idx].quantity <= 1)) {
        next[idx].quantity = suggested;
      }
    }
    setItems(next);
  };

  const addItem = () => setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const suggestQuantity = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    const stockSucursal = product.stockPorSucursal?.find((s) => s.branchId === branchId);
    const stockActual = stockSucursal?.stock ?? product.stockActual ?? 0;
    const minStock = stockSucursal?.minStock ?? product.stockMinimo ?? 0;
    const needed = minStock - stockActual;
    return needed > 0 ? needed : 0;
  };

  const save = async (mode: "DRAFT" | "SUBMITTED") => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        branchId,
        requestedById,
        notes,
        status: mode,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity || 0) }))
      };
      const res = await fetch("/api/inventario/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-inventory-token": token } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      onCreated(data.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/30 px-3 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Nueva solicitud de compra</h3>
            <p className="text-sm text-slate-500">Agrega productos, proveedor sugerido y notas.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200">
            Cerrar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <SearchableSelect
            label="Sucursal"
            value={branchId}
            onChange={(v) => setBranchId((v as string) || "")}
            options={sucursalesInvMock.map((s) => ({ value: s.id, label: s.nombre }))}
          />
          <div>
            <label className="text-xs font-semibold text-slate-600">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              placeholder="Detalles, prioridad, instrucciones al proveedor..."
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item, idx) => {
            const product = products.find((p) => p.id === item.productId);
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border border-slate-200 bg-slate-50/60 p-3 shadow-inner transition",
                  product ? "border-brand-primary/40" : ""
                )}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
                  <div className="md:col-span-3">
                    <SearchableSelect
                      label="Producto"
                      value={item.productId}
                      onChange={(v) => handleItemChange(idx, { productId: v as string })}
                      options={productOptions}
                      placeholder="Buscar por nombre o código"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Cantidad</label>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, { quantity: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                    />
                    {item.productId && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Sugerido: {suggestQuantity(item.productId)} (stock sucursal vs mín)
                      </p>
                    )}
                  </div>
                  <div>
                    <SearchableSelect
                      label="Proveedor sugerido"
                      value={item.supplierId || ""}
                      onChange={(v) => handleItemChange(idx, { supplierId: v as string })}
                      options={supplierOptions}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <input
                      value={item.notes || ""}
                      onChange={(e) => handleItemChange(idx, { notes: e.target.value })}
                      placeholder="Notas"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-xs text-rose-500 hover:underline">
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                {product && (
                  <p className="mt-2 text-[12px] text-slate-500">
                    Stock actual: <span className="font-semibold text-slate-800">{product.stockActual}</span> · Unidad:{" "}
                    {product.unidadMedida}
                  </p>
                )}
              </div>
            );
          })}
          <button
            onClick={addItem}
            className="text-sm font-semibold text-brand-primary hover:underline"
            type="button"
            disabled={loading}
          >
            + Agregar producto
          </button>
        </div>

        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Los códigos se asignan automáticamente (PR-000001). Las solicitudes se pueden enviar de inmediato o guardar como borrador.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => save("DRAFT")}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Guardar borrador
            </button>
            <button
              onClick={() => save("SUBMITTED")}
              disabled={saving}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
            >
              Enviar a aprobación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
