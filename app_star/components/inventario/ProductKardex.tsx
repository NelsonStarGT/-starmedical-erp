"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InventoryMovement, MovementType } from "@/lib/types/inventario";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import { toTitleCase } from "@/lib/utils";

type Props = {
  productId: string;
};

export function ProductKardex({ productId }: Props) {
  const [rows, setRows] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("productId", productId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (typeFilter) params.set("type", typeFilter);
      if (branchFilter) params.set("branchId", branchFilter);
      const res = await fetch(`/api/inventario/movimientos?${params.toString()}`);
      const data = await res.json();
      setRows(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [productId, page, pageSize, dateFrom, dateTo, typeFilter, branchFilter]);

  useEffect(() => {
    if (productId) load();
  }, [productId, load]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, typeFilter, branchFilter]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("productId", productId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (typeFilter) params.set("type", typeFilter);
    if (branchFilter) params.set("branchId", branchFilter);
    return `/api/inventario/movimientos/export?${params.toString()}`;
  }, [productId, dateFrom, dateTo, typeFilter, branchFilter]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">Kárdex / Histórico</div>
          <p className="text-xs text-slate-500">Últimos movimientos auditables.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Exportar Excel
          </a>
          <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Refrescar
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <div className="flex flex-col">
          <label className="text-[11px] text-slate-500">Fecha desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] text-slate-500">Fecha hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-slate-200 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] text-slate-500">Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Todos</option>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Salida</option>
            <option value="ADJUSTMENT">Ajuste</option>
            <option value="PRICE_UPDATE">Precio</option>
            <option value="COST_UPDATE">Costo</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] text-slate-500">Sucursal</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Todas</option>
            {sucursalesInvMock.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm text-slate-700">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2">Fecha</th>
              <th className="pb-2">Tipo</th>
              <th className="pb-2">Sucursal</th>
              <th className="pb-2">Cantidad</th>
              <th className="pb-2">Delta</th>
              <th className="pb-2">Costo</th>
              <th className="pb-2">Precio</th>
              <th className="pb-2">Referencia</th>
              <th className="pb-2">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-3 text-center text-sm text-slate-400">
                  Sin movimientos registrados
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="py-2 text-slate-600">{new Date(m.createdAt).toLocaleString()}</td>
                <td className="py-2 font-semibold text-slate-800">{renderType(m.type)}</td>
                <td className="py-2">{branchName(m.branchId)}</td>
                <td className="py-2">{renderQuantity(m)}</td>
                <td className="py-2">{renderDelta(m)}</td>
                <td className="py-2">{m.unitCost !== null && m.unitCost !== undefined ? `Q${Number(m.unitCost).toFixed(2)}` : "—"}</td>
                <td className="py-2">{m.salePrice !== null && m.salePrice !== undefined ? `Q${Number(m.salePrice).toFixed(2)}` : "—"}</td>
                <td className="py-2">{m.reference || m.reason || "—"}</td>
                <td className="py-2">{m.createdById}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <span>
          Página {page} de {totalPages}
          {` · Mostrando ${(rows || []).length} de ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>
      {loading && <p className="mt-2 text-xs text-slate-500">Cargando movimientos…</p>}
    </div>
  );
}

const branchName = (id: string) => sucursalesInvMock.find((b) => b.id === id)?.nombre || id;

const renderType = (t: MovementType) => {
  switch (t) {
    case "ENTRY":
      return "Entrada";
    case "EXIT":
      return "Salida";
    case "ADJUSTMENT":
      return "Ajuste";
    case "PRICE_UPDATE":
      return "Precio";
    case "COST_UPDATE":
      return "Costo";
    default:
      return "Movimiento";
  }
};

const renderQuantity = (m: InventoryMovement) => {
  if (m.type === "ADJUSTMENT") {
    return m.quantity !== null && m.quantity !== undefined ? `${m.quantity}` : "—";
  }
  if (m.quantity === null || m.quantity === undefined) return "—";
  return m.quantity;
};

const renderDelta = (m: InventoryMovement) => {
  if (m.type === "ADJUSTMENT") return m.quantity ?? "—";
  if (m.quantity === null || m.quantity === undefined) return "—";
  return m.type === "EXIT" ? -Math.abs(m.quantity) : Math.abs(m.quantity);
};
