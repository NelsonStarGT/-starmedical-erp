'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { inventoryReferenceData } from "@/lib/inventory/runtime-fallback";
import { PurchaseOrder, PurchaseOrderStatus } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

const orderStatuses = [
  { value: "DRAFT", label: "Borrador" },
  { value: "SENT", label: "Enviada a proveedor" },
  { value: "RECEIVED_PARTIAL", label: "Recibida parcial" },
  { value: "RECEIVED", label: "Recibida" },
  { value: "CANCELLED", label: "Cancelada" }
];

export default function PurchaseOrdersPage() {
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filters, setFilters] = useState<{ status: string[]; branchId: string | null; supplierId: string | null; q: string; dateFrom: string; dateTo: string }>({
    status: [],
    branchId: null,
    supplierId: null,
    q: "",
    dateFrom: "",
    dateTo: ""
  });
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status.length) params.set("status", filters.status.join(","));
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.supplierId) params.set("supplierId", filters.supplierId);
      if (filters.q) params.set("q", filters.q);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      const res = await fetch(`/api/inventario/ordenes?${params.toString()}`, { headers });
      const data = await res.json();
      if (res.ok) setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusOptions = useMemo(() => orderStatuses.map((s) => ({ value: s.value, label: s.label })), []);

  const sendOrder = async (id: string) => {
    await fetch(`/api/inventario/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      body: JSON.stringify({ action: "send" })
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Órdenes de compra</h1>
          <p className="text-sm text-slate-500">Seguimiento desde envío hasta recepción y Kárdex.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Buscar por código o nota"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          <SearchableSelect
            label="Estado"
            multiple
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: (v as string[]) || [] }))}
            options={statusOptions}
            includeAllOption
          />
          <SearchableSelect
            label="Proveedor"
            value={filters.supplierId}
            onChange={(v) => setFilters((f) => ({ ...f, supplierId: (v as string) || null }))}
            options={inventoryReferenceData.suppliers.map((p) => ({ value: p.id, label: p.nombre }))}
            includeAllOption
          />
          <SearchableSelect
            label="Sucursal"
            value={filters.branchId}
            onChange={(v) => setFilters((f) => ({ ...f, branchId: (v as string) || null }))}
            options={inventoryReferenceData.branches.map((s) => ({ value: s.id, label: s.nombre }))}
            includeAllOption
          />
          <div>
            <label className="text-xs font-semibold text-slate-600">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={load}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
              disabled={loading}
            >
              Aplicar
            </button>
            <button
              onClick={() =>
                setFilters({ status: [], branchId: null, supplierId: null, q: "", dateFrom: "", dateTo: "" })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {orders.map((order) => (
          <Card key={order.id} className="border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-soft">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Orden</p>
                  <p className="text-lg font-semibold text-slate-900">{order.code}</p>
                  <p className="text-xs text-slate-500">Sucursal: {order.branchId} · Proveedor: {order.supplierId}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badgeTone(order.status))}>
                  {statusLabel(order.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  Items: <strong>{order.items?.length || 0}</strong>
                </span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/admin/inventario/ordenes/${order.id}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver detalle
                </Link>
                {order.status === "DRAFT" && (
                  <button
                    onClick={() => sendOrder(order.id)}
                    className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Enviar a proveedor
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!orders.length && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Aún no hay órdenes. Genera una desde una solicitud aprobada o crea una directa vía API.
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(status: PurchaseOrderStatus) {
  const found = orderStatuses.find((s) => s.value === status);
  return found?.label || status;
}

function badgeTone(status: PurchaseOrderStatus) {
  const base = "border px-3 py-1";
  if (status === "RECEIVED") return cn(base, "border-emerald-200 bg-emerald-50 text-emerald-700");
  if (status === "RECEIVED_PARTIAL") return cn(base, "border-sky-200 bg-sky-50 text-sky-700");
  if (status === "CANCELLED") return cn(base, "border-rose-200 bg-rose-50 text-rose-700");
  if (status === "SENT") return cn(base, "border-amber-200 bg-amber-50 text-amber-700");
  return cn(base, "border-slate-200 bg-slate-50 text-slate-700");
}
// @ts-nocheck
