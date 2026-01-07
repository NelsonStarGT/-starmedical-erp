"use client";

import { ChangeEvent } from "react";
import { productosMock } from "@/lib/mock/productos";
import { MoneyInput } from "@/components/inventario/MoneyInput";

type ProductPickerRowProps = {
  value: { productoId?: string; cantidad?: number };
  onChange: (next: { productoId?: string; cantidad?: number }) => void;
  onRemove: () => void;
  showCost: boolean;
};

export function ProductPickerRow({ value, onChange, onRemove, showCost }: ProductPickerRowProps) {
  const producto = productosMock.find((p) => p.id === value.productoId);
  const costoUnitario = producto?.costoUnitario || 0;
  const qty = value.cantidad || 0;
  const subtotal = qty * costoUnitario;

  const handleQty = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange({ ...value, cantidad: undefined });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onChange({ ...value, cantidad: parsed });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-xl border border-[#E5E5E7] bg-white px-3 py-2">
      <div className="md:col-span-2">
        <select
          value={value.productoId || ""}
          onChange={(e) => onChange({ ...value, productoId: e.target.value || undefined })}
          className="w-full rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
        >
          <option value="">Selecciona producto</option>
          {productosMock.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.codigo})
            </option>
          ))}
        </select>
        {producto && <p className="text-[11px] text-slate-500 mt-1">Stock: {producto.stockActual} · Unidad: {producto.unidadMedida}</p>}
      </div>
      <div>
        <label className="text-[12px] font-semibold text-slate-500">Cantidad</label>
        <input
          type="number"
          min="0"
          value={value.cantidad ?? ""}
          onChange={handleQty}
          className="w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          placeholder="0"
        />
      </div>
      {showCost && (
        <div>
          <MoneyInput label="Costo unitario" value={costoUnitario} onChange={() => {}} />
        </div>
      )}
      <div className="flex items-end justify-between md:justify-end gap-2">
        <div className="text-sm text-slate-700">
          <p className="text-[12px] font-semibold text-slate-500">Subtotal</p>
          <p>Q{subtotal.toFixed(2)}</p>
        </div>
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline">
          Quitar
        </button>
      </div>
    </div>
  );
}
