"use client";

import Image from "next/image";
import { useState } from "react";
import { Producto } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

type Props = {
  producto: Producto;
  lowStock?: boolean;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showCosts?: boolean;
};

export function ProductCard({ producto, lowStock, onEdit, onDeactivate, onDelete, selectable, selected, onSelectChange, showCosts = true }: Props) {
  const [openMenu, setOpenMenu] = useState(false);
  const categoria = producto.categoriaNombre;
  const subcategoria = producto.subcategoriaNombre;
  const proveedor = producto.proveedorId;
  const stockPorSucursal = producto.stockPorSucursal || [];
  const basePrice = producto.baseSalePrice ?? producto.precioVenta ?? 0;
  const cost = producto.avgCost ?? producto.costoUnitario ?? 0;
  const margin = basePrice - cost;
  const marginPct = basePrice > 0 ? (margin / basePrice) * 100 : 0;
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5E5E7] bg-white/95 p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted",
        lowStock ? "ring-2 ring-amber-200" : ""
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
          />
        )}
        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center">
          {producto.imageUrl ? (
            <Image src={producto.imageUrl} alt={producto.nombre} width={48} height={48} className="object-cover h-full w-full" />
          ) : (
            <span className="text-xs text-slate-500">{categoria?.slice(0, 3) || "IMG"}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{producto.nombre}</p>
            <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", producto.estado === "Activo" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
              {producto.estado}
            </span>
          </div>
          <p className="text-xs text-slate-500">{producto.codigo} · {categoria} {subcategoria ? `· ${subcategoria}` : ""}</p>
          <p className="text-xs text-slate-500">Presentación: {producto.presentacion || "N/D"}</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-700">Stock: <strong>{producto.stockActual}</strong></span>
            <span className="text-slate-500 text-xs">Proveedor: {proveedor || "N/D"}</span>
          </div>
          {stockPorSucursal.length > 0 && (
            <div className="mt-1 space-y-1 text-xs text-slate-600">
              {stockPorSucursal.map((s) => (
                <div key={s.branchId} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
                  <span>{s.branchId}</span>
                  <span>
                    {s.stock} {s.stock <= s.minStock ? <span className="text-amber-600 font-semibold">(min {s.minStock})</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-slate-500">
            Precio base: Q{basePrice.toFixed(2)}
            {showCosts && <> · Costo prom.: Q{cost.toFixed(2)}</>}
          </div>
          {showCosts && (
            <p className="text-xs font-semibold text-slate-700">
              Margen: Q{margin.toFixed(2)} ({marginPct.toFixed(1)}%)
            </p>
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
