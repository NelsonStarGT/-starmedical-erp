'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { inventoryReferenceData } from "@/lib/inventory/runtime-fallback";
import { PurchaseRequest, PurchaseRequestStatus } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

const role: "Administrador" | "Operador" = "Administrador";

export default function PurchaseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState<string>(inventoryReferenceData.suppliers[0]?.id || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventario/solicitudes/${params.id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo obtener la solicitud");
      setRequest(data.data);
      const suggestedSupplier = data.data.items.find((it: any) => it.supplierId)?.supplierId;
      if (suggestedSupplier) setSupplierId(suggestedSupplier);
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

  const updateStatus = async (action: "submit" | "approve" | "reject") => {
    setMessage(null);
    const res = await fetch(`/api/inventario/solicitudes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }
    setRequest(data.data);
    setMessage(`Solicitud ${action === "submit" ? "enviada" : action === "approve" ? "aprobada" : "rechazada"}`);
  };

  const createOrder = async () => {
    if (!request) return;
    setCreatingOrder(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        requestId: request.id,
        supplierId,
        branchId: request.branchId,
        createdById: "admin-ui"
      };
      const res = await fetch("/api/inventario/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear la orden");
      setMessage(`Orden ${data.data?.code || ""} creada`);
      router.push(`/admin/inventario/ordenes/${data.data?.id}`);
    } catch (err: any) {
      setError(err?.message || "Error al crear orden");
    } finally {
      setCreatingOrder(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/inventario/solicitudes" className="text-brand-primary hover:underline">
          Solicitudes
        </Link>
        <span>•</span>
        <span>{request?.code || params.id}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Solicitud {request?.code || ""}</h1>
          <p className="text-sm text-slate-500">Sucursal {request?.branchId}</p>
        </div>
        <div className="flex gap-2">
          {request?.status === "DRAFT" && (
            <button
              onClick={() => updateStatus("submit")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft"
            >
              Enviar a aprobación
            </button>
          )}
          {request?.status === "SUBMITTED" && role === "Administrador" && (
            <>
              <button
                onClick={() => updateStatus("reject")}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Rechazar
              </button>
              <button
                onClick={() => updateStatus("approve")}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-soft"
              >
                Aprobar
              </button>
            </>
          )}
        </div>
      </div>

      {message && <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Línea de tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "RECEIVED"].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    isReached(request?.status, step as PurchaseRequestStatus) ? "bg-brand-primary" : "bg-slate-200"
                  )}
                />
                <span className="text-xs font-semibold text-slate-600">{labelForStep(step as PurchaseRequestStatus)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items solicitados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {request?.items?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.productName || item.productId}</p>
                <p className="text-xs text-slate-500">Proveedor: {item.supplierId || "N/D"}</p>
              </div>
              <div className="text-right text-sm text-slate-700">
                <p className="font-semibold">{item.quantity} uds</p>
                {item.notes && <p className="text-xs text-slate-500">{item.notes}</p>}
              </div>
            </div>
          ))}
          {!request?.items?.length && <p className="text-sm text-slate-500">Sin items</p>}
        </CardContent>
      </Card>

      {role === "Administrador" && request?.status === "APPROVED" && (
        <Card>
          <CardHeader>
            <CardTitle>Crear orden de compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SearchableSelect
                label="Proveedor"
                value={supplierId}
                onChange={(v) => setSupplierId((v as string) || "")}
                options={inventoryReferenceData.suppliers.map((p) => ({ value: p.id, label: p.nombre }))}
                includeAllOption={false}
              />
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Se copiarán los items aprobados. El código de la orden se generará como PO-000001.
              </div>
            </div>
            <button
              onClick={createOrder}
              disabled={creatingOrder}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
            >
              Crear orden
            </button>
          </CardContent>
        </Card>
      )}

      {request?.orders && request.orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Órdenes generadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {request.orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/inventario/ordenes/${o.id}`}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {o.code} · {o.status}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function isReached(current: PurchaseRequestStatus | undefined, step: PurchaseRequestStatus) {
  if (!current) return false;
  const order: PurchaseRequestStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "RECEIVED_PARTIAL", "RECEIVED"];
  const currentIndex = order.indexOf(current);
  const stepIndex = order.indexOf(step);
  return currentIndex >= stepIndex;
}

function labelForStep(step: PurchaseRequestStatus) {
  if (step === "DRAFT") return "Creada";
  if (step === "SUBMITTED") return "Enviada";
  if (step === "APPROVED") return "Aprobada";
  if (step === "ORDERED") return "Ordenada";
  if (step === "RECEIVED" || step === "RECEIVED_PARTIAL") return "Recibida";
  return step;
}
// @ts-nocheck
