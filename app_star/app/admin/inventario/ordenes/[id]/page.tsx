'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

const role: "Administrador" | "Operador" = "Administrador";

type ReceiveDraft = Record<string, { quantity: number; unitCost?: number | null }>;

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [draft, setDraft] = useState<ReceiveDraft>({});
  const [reference, setReference] = useState("");

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventario/ordenes/${params.id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la orden");
      setOrder(data.data);
      // reset receiving draft
      const defaults: ReceiveDraft = {};
      data.data.items?.forEach((it: PurchaseOrderItem) => {
        defaults[it.id] = { quantity: Math.max(0, (it.quantity || 0) - (it.receivedQty || 0)), unitCost: it.unitCost || undefined };
      });
      setDraft(defaults);
    } catch (err: any) {
      setError(err?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const send = async (action: "send" | "cancel") => {
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/inventario/ordenes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }
    setOrder(data.data);
    setMessage(action === "send" ? "Orden enviada al proveedor" : "Orden cancelada");
  };

  const receive = async () => {
    if (!order) return;
    const items = Object.entries(draft)
      .filter(([, v]) => Number(v.quantity) > 0)
      .map(([id, v]) => ({ itemId: id, quantity: Number(v.quantity), unitCost: v.unitCost }));
    if (items.length === 0) {
      setError("Ingresa cantidades a recibir");
      return;
    }
    setReceiving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/inventario/ordenes/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify({ action: "receive", items, createdById: "admin-ui", reference })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la recepción");
      setOrder(data.data);
      setMessage("Recepción guardada y Kárdex actualizado");
    } catch (err: any) {
      setError(err?.message || "Error al recibir");
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/inventario/ordenes" className="text-brand-primary hover:underline">
          Órdenes
        </Link>
        <span>•</span>
        <span>{order?.code || params.id}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Orden {order?.code || ""}</h1>
          <p className="text-sm text-slate-500">
            Proveedor {order?.supplierId} · Sucursal {order?.branchId}
          </p>
          {order?.request && (
            <Link href={`/admin/inventario/solicitudes/${order.request.id}`} className="text-xs text-brand-primary hover:underline">
              Basada en solicitud {order.request.code}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badgeTone(order?.status || "DRAFT"))}>
            {statusLabel(order?.status || "DRAFT")}
          </span>
          <button
            disabled
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            title="Generación de PDF pendiente"
          >
            PDF (próximamente)
          </button>
          {role === "Administrador" && order?.status === "DRAFT" && (
            <button
              onClick={() => send("send")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Enviar a proveedor
            </button>
          )}
          {role === "Administrador" && order && !["RECEIVED", "CANCELLED"].includes(order.status) && (
            <button
              onClick={() => send("cancel")}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {message && <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order?.items?.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-slate-900">{item.productName || item.productId}</p>
                <p className="text-xs text-slate-500">Código: {item.productCode || item.productId}</p>
              </div>
              <div className="text-sm text-slate-700">
                <p>Solicitado: {item.quantity}</p>
                <p className="text-xs text-slate-500">Recibido: {item.receivedQty}</p>
              </div>
              <div className="text-sm text-slate-700">
                <p>Pendiente: {Math.max(0, item.quantity - (item.receivedQty || 0))}</p>
                {item.unitCost != null && <p className="text-xs text-slate-500">Costo unitario: Q{Number(item.unitCost).toFixed(2)}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {order && !["CANCELLED", "RECEIVED"].includes(order.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Recepción y entrada a Kárdex</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Solo se registran cantidades mayores a 0. Cada item crea un movimiento ENTRY con referencia {order.code}.
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Referencia factura / guía (obligatoria)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. FAC-123 o guía 789"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
            </div>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">{item.productName || item.productId}</p>
                    <p className="text-xs text-slate-500">Pendiente: {Math.max(0, item.quantity - (item.receivedQty || 0))}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Cantidad recibida</label>
                    <input
                      type="number"
                      min={0}
                      value={draft[item.id]?.quantity ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, [item.id]: { ...(d[item.id] || {}), quantity: Number(e.target.value) } }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Costo unitario</label>
                    <input
                      type="number"
                      min={0}
                      value={draft[item.id]?.unitCost ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [item.id]: { ...(d[item.id] || {}), unitCost: e.target.value === "" ? undefined : Number(e.target.value) } }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={receive}
              disabled={receiving}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
            >
              Guardar recepción
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function statusLabel(status: PurchaseOrderStatus) {
  if (status === "SENT") return "Enviada";
  if (status === "RECEIVED") return "Recibida";
  if (status === "RECEIVED_PARTIAL") return "Parcial";
  if (status === "CANCELLED") return "Cancelada";
  return "Borrador";
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
