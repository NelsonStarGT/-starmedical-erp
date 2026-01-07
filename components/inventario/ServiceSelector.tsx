"use client";

import { serviciosMock } from "@/lib/mock/servicios";
import { Servicio } from "@/lib/types/inventario";

export function ServiceSelector({ value, onChange, services }: { value?: string; onChange: (id: string) => void; services?: Servicio[] }) {
  const data = services || serviciosMock;
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
    >
      <option value="">Selecciona servicio</option>
      {data.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
}
