"use client";

import { Movimiento } from "@/lib/types/inventario";
import { productosMock } from "@/lib/mock/productos";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";

export function MovimientoCard({ movimiento }: { movimiento: Movimiento }) {
  const producto = productosMock.find((p) => p.id === movimiento.productoId);
  const sucursal = sucursalesInvMock.find((s) => s.id === movimiento.sucursalId)?.nombre;
  return (
    <div className="rounded-2xl border border-[#E5E5E7] bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{producto?.nombre || "Producto"}</p>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{movimiento.tipo}</span>
      </div>
      <p className="text-xs text-slate-500">{movimiento.fecha} · {sucursal}</p>
      <p className="text-sm text-slate-800">Cantidad: {movimiento.cantidad}</p>
      {movimiento.comentario && <p className="text-xs text-slate-500 mt-1">{movimiento.comentario}</p>}
    </div>
  );
}
