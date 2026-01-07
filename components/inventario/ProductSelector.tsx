"use client";

import { productosMock } from "@/lib/mock/productos";
import { Producto } from "@/lib/types/inventario";

type Props = {
  value?: string;
  onChange: (id: string) => void;
};

export function ProductSelector({ value, onChange }: Props) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
    >
      <option value="">Selecciona producto</option>
      {productosMock.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  );
}
