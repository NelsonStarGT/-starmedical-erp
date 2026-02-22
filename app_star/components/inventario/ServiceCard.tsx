"use client";

import { useState } from "react";
import Image from "next/image";
import { Servicio } from "@/lib/types/inventario";
import { categoriasServicioMock, serviceSubcategoriasMock, proveedoresMock } from "@/lib/mock/inventario-catalogos";

type Props = {
  servicio: Servicio;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showCosts?: boolean;
};

export function ServiceCard({ servicio, onEdit, onDeactivate, onDelete, selectable, selected, onSelectChange, showCosts = true }: Props) {
  const [openMenu, setOpenMenu] = useState(false);
  const categoria = categoriasServicioMock.find((c) => c.id === servicio.categoriaId)?.nombre;
  const subcategoria = serviceSubcategoriasMock.find((s) => s.id === servicio.subcategoriaId)?.nombre;
  const proveedor = servicio.proveedorId ? proveedoresMock.find((p) => p.id === servicio.proveedorId)?.nombre : "Interno";
  const basePrice = servicio.costoBase ?? servicio.precioVenta ?? 0;
  const costo = servicio.costoCalculado ?? 0;
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
          {servicio.imageUrl ? (
            <Image src={servicio.imageUrl} alt={servicio.nombre} width={48} height={48} className="object-cover h-full w-full" />
          ) : (
            <span className="text-xs text-slate-500">{categoria?.slice(0, 3) || "SRV"}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{servicio.nombre}</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{servicio.estado}</span>
          </div>
          <p className="text-xs text-slate-500">{categoria} {subcategoria ? `· ${subcategoria}` : ""}</p>
          <p className="text-xs text-slate-500">Proveedor: {proveedor}</p>
          <p className="text-xs text-slate-500">Duración: {servicio.duracionMin} min · Código: {servicio.codigoServicio || "N/D"}</p>
          <p className="text-sm text-slate-800 mt-1">Precio base: Q{basePrice.toFixed(2)}</p>
          {showCosts && (
            <>
              <p className="text-xs text-slate-500">Costo: Q{costo.toFixed(2)}</p>
              <p className="text-xs font-semibold text-slate-700">Margen: Q{margin.toFixed(2)} ({marginPct.toFixed(1)}%)</p>
            </>
          )}
        </div>
        {(onEdit || onDeactivate || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="rounded-full border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              ⋯
            </button>
            {openMenu && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl border border-slate-200 bg-white shadow-lg text-sm z-10">
                {onEdit && (
                  <button className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={onEdit}>
                    Editar
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
