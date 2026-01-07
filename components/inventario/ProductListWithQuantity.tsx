"use client";

import { productosMock } from "@/lib/mock/productos";
import { Producto } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

type Item = { productoId: string; cantidad: number };

type Props = {
  items: Item[];
  onChange: (items: Item[]) => void;
  productos?: Producto[];
};

export function ProductListWithQuantity({ items, onChange, productos }: Props) {
  const data = productos || productosMock;
  const updateItem = (index: number, value: Partial<Item>) => {
    const next = [...items];
    next[index] = { ...next[index], ...value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const producto = data.find((p) => p.id === item.productoId);
        return (
          <div key={idx} className="flex items-center gap-2 rounded-xl border border-[#E5E5E7] bg-white px-2 py-2">
            <select
              value={item.productoId}
              onChange={(e) => updateItem(idx, { productoId: e.target.value })}
              className="flex-1 rounded-lg border border-[#E5E5E7] bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            >
              <option value="">Producto</option>
              {data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={item.cantidad}
              onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })}
              className="w-20 rounded-lg border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <button
              onClick={() => removeItem(idx)}
              className="rounded-full border border-[#E5E5E7] px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Quitar
            </button>
            {producto && <span className="text-[11px] text-slate-500">Costo: Q{producto.costoUnitario.toFixed(2)}</span>}
          </div>
        );
      })}
      <button
        onClick={() => onChange([...items, { productoId: "", cantidad: 1 }])}
        className={cn("text-sm font-semibold text-brand-primary hover:underline")}
      >
        + Agregar producto
      </button>
    </div>
  );
}
