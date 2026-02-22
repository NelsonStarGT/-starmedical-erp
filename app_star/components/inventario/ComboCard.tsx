"use client";

import { useState } from "react";
import Image from "next/image";
import { Combo, Producto, Servicio } from "@/lib/types/inventario";
import { serviciosMock } from "@/lib/mock/servicios";
import { productosMock } from "@/lib/mock/productos";
import { cn } from "@/lib/utils";

type Props = {
  combo: Combo;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showCosts?: boolean;
  servicioIndex?: Record<string, Servicio>;
  productoIndex?: Record<string, Producto>;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
};

export function ComboCard({
  combo,
  selectable,
  selected,
  onSelectChange,
  showCosts = true,
  servicioIndex,
  productoIndex,
  onEdit,
  onDeactivate,
  onDelete,
  onDuplicate
}: Props) {
  const [openMenu, setOpenMenu] = useState(false);
  const servicesData = servicioIndex || serviciosMock.reduce<Record<string, Servicio>>((acc, s) => ({ ...acc, [s.id]: s as any }), {});
  const productsData = productoIndex || productosMock.reduce<Record<string, Producto>>((acc, p) => ({ ...acc, [p.id]: p as any }), {});

  const servicios = combo.serviciosAsociados.map((id) => servicesData[id]?.nombre).filter(Boolean);
  const productos = (combo.productosAsociados || []).map((p) => productsData[p.productoId]?.nombre).filter(Boolean);

  const basePrice = combo.precioFinal ?? 0;
  const costo = combo.costoCalculado ?? 0;
  const margin = basePrice - costo;
  const marginPct = basePrice > 0 ? (margin / basePrice) * 100 : 0;

  return (
    <div className="rounded-2xl border border-[#E5E5E7] bg-white/95 p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted">
      <div className="flex gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
          />
        )}
        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
          {combo.imageUrl ? (
            <Image src={combo.imageUrl} alt={combo.nombre} width={48} height={48} className="object-cover h-full w-full" />
          ) : (
            <span className="text-xs text-slate-500">Combo</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{combo.nombre}</p>
            <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", combo.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
              {combo.estado}
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{combo.descripcion}</p>
          <p className="text-[11px] text-slate-500">
            Servicios: {servicios.slice(0, 2).join(", ") || "N/D"} {servicios.length > 2 && <span className="text-slate-400">+{servicios.length - 2} más</span>}
          </p>
          <p className="text-[11px] text-slate-500">
            Productos: {productos.slice(0, 2).join(", ") || "N/D"} {productos.length > 2 && <span className="text-slate-400">+{productos.length - 2} más</span>}
          </p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-800 font-semibold">Precio: Q{basePrice.toFixed(2)}</span>
            {showCosts && <span className="text-slate-500 text-xs">Costo: Q{costo.toFixed(2)}</span>}
          </div>
          {showCosts && (
            <p className="text-xs font-semibold text-slate-700">Margen: Q{margin.toFixed(2)} ({marginPct.toFixed(1)}%)</p>
          )}
        </div>
        {(onEdit || onDeactivate || onDelete || onDuplicate) && (
          <div className="relative">
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="rounded-full border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              ⋯
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg text-sm z-10">
                {onEdit && (
                  <button className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={onEdit}>
                    Editar
                  </button>
                )}
                {onDuplicate && (
                  <button className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={onDuplicate}>
                    Duplicar
                  </button>
                )}
                {onDeactivate && (
                  <button className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={onDeactivate}>
                    Desactivar
                  </button>
                )}
                {onDelete && (
                  <button className="w-full px-3 py-2 text-left text-red-600 hover:bg-rose-50" onClick={onDelete}>
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
