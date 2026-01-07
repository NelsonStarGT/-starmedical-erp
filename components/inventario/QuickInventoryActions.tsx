"use client";

import { useState } from "react";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import { MovementType } from "@/lib/types/inventario";

type QuickActionProps = {
  productId: string;
  onCompleted?: () => void;
  role?: string;
};

type ActionForm = {
  branchId: string;
  quantity?: number;
  unitCost?: number;
  salePrice?: number;
  reference?: string;
  reason?: string;
};

const ACTIONS: { type: MovementType; title: string; showQty: boolean; showCost?: boolean; showPrice?: boolean; adminOnly?: boolean }[] = [
  { type: "ENTRY", title: "Registrar entrada", showQty: true, showCost: true },
  { type: "EXIT", title: "Registrar salida", showQty: true },
  { type: "ADJUSTMENT", title: "Ajuste por conteo", showQty: true },
  { type: "PRICE_UPDATE", title: "Actualizar precio", showQty: false, showPrice: true },
  { type: "COST_UPDATE", title: "Actualizar costo", showQty: false, showCost: true, adminOnly: true }
];

export function QuickInventoryActions({ productId, onCompleted, role = "Administrador" }: QuickActionProps) {
  const [loadingType, setLoadingType] = useState<MovementType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ActionForm>({
    branchId: sucursalesInvMock[0]?.id || "s1"
  });

  const isAdmin = role === "Administrador";

  const handleSubmit = async (type: MovementType) => {
    setLoadingType(type);
    setMessage(null);
    setError(null);
    try {
      if (["EXIT", "ADJUSTMENT", "COST_UPDATE", "PRICE_UPDATE"].includes(type) && !form.reference) {
        setError("Referencia requerida para este movimiento");
        setLoadingType(null);
        return;
      }
      if (["EXIT", "ADJUSTMENT", "COST_UPDATE", "PRICE_UPDATE"].includes(type) && !form.reason) {
        setError("Motivo requerido para este movimiento");
        setLoadingType(null);
        return;
      }
      const payload: any = {
        productId,
        branchId: form.branchId,
        type,
        reference: form.reference,
        reason: form.reason,
        createdById: role || "system"
      };
      if (type === "ENTRY" || type === "EXIT" || type === "ADJUSTMENT") payload.quantity = form.quantity;
      if (type === "ENTRY" || type === "COST_UPDATE") payload.unitCost = form.unitCost;
      if (type === "PRICE_UPDATE") payload.salePrice = form.salePrice;

      const res = await fetch("/api/inventario/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": role },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar");
      setMessage("Movimiento registrado");
      onCompleted?.();
    } catch (err: any) {
      setError(err?.message || "Error al registrar");
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 text-sm font-semibold text-slate-800">Acciones rápidas</div>
      {message && <p className="mb-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Sucursal
          <select
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
          >
            {sucursalesInvMock.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Referencia / factura / comentario
          <input
            value={form.reference || ""}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            placeholder="Ej: Factura 123 / Conteo mayo"
          />
        </label>
        <label className="text-sm text-slate-700">
          Motivo
          <input
            value={form.reason || ""}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            placeholder="Merma, vencimiento, consumo..."
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ACTIONS.filter((a) => (a.adminOnly ? isAdmin : true)).map((action) => (
          <div key={action.type} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 text-sm font-semibold text-slate-800">{action.title}</div>
            {action.showQty && (
              <label className="text-xs text-slate-600">
                Cantidad
                <input
                  type="number"
                  value={form.quantity ?? ""}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  placeholder="Ej: 10"
                />
              </label>
            )}
            {action.showCost && (
              <label className="text-xs text-slate-600">
                Costo unitario
                <input
                  type="number"
                  step="0.01"
                  value={form.unitCost ?? ""}
                  onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  placeholder="Ej: 25.50"
                />
              </label>
            )}
            {action.showPrice && (
              <label className="text-xs text-slate-600">
                Precio de venta
                <input
                  type="number"
                  step="0.01"
                  value={form.salePrice ?? ""}
                  onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  placeholder="Ej: 55.00"
                />
              </label>
            )}
            <button
              onClick={() => handleSubmit(action.type)}
              className="mt-2 w-full rounded-xl bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm"
              disabled={loadingType === action.type}
            >
              {loadingType === action.type ? "Guardando..." : action.title}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
