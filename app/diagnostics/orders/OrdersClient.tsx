"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ArrowsRightLeftIcon
} from "@heroicons/react/24/outline";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { useTenantDateTimeConfigValue } from "@/lib/datetime/client";
import { formatDateTime as formatDateTimeByConfig } from "@/lib/datetime/format";
import { StatusBadge } from "@/components/diagnostics/StatusBadge";
import {
  type DiagnosticCatalogItem,
  type DiagnosticOrderAdminStatus,
  type DiagnosticOrderDTO,
  type DiagnosticOrderStatus,
  type DiagnosticPaymentMethod,
  type DiagnosticClinicalSummary
} from "@/lib/diagnostics/types";
import { QuickPatientSearch } from "./patients/QuickPatientSearch";
import { QuickCreatePatient } from "./patients/QuickCreatePatient";

const adminStatusOptions: Array<DiagnosticOrderAdminStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "PENDING_PAYMENT",
  "INSURANCE_AUTH",
  "PAID",
  "SENT_TO_EXECUTION",
  "COMPLETED",
  "CANCELLED"
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo cargar la información");
  }
  return res.json();
}

type OrdersClientProps = {
  initialOrders: DiagnosticOrderDTO[];
  initialCatalog: DiagnosticCatalogItem[];
};

export default function OrdersClient({ initialOrders, initialCatalog }: OrdersClientProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const patientId = searchParams.get("patientId");
  const sourceRefId = searchParams.get("sourceRefId");
  const [orders, setOrders] = useState<DiagnosticOrderDTO[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<DiagnosticOrderAdminStatus | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [catalog, setCatalog] = useState<DiagnosticCatalogItem[]>(initialCatalog);
  const [showNew, setShowNew] = useState(false);
  const dateTimeConfig = useTenantDateTimeConfigValue();
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    order?: DiagnosticOrderDTO;
    mode?: "pay" | "method";
  }>({ open: false });

  const loadOrders = async (
    nextStatus = adminStatus,
    nextRange: { from: string; to: string } = dateRange
  ) => {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (nextStatus && nextStatus !== "ALL") qp.set("adminStatus", nextStatus);
      if (nextRange.from) qp.set("dateFrom", nextRange.from);
      if (nextRange.to) qp.set("dateTo", nextRange.to);
      const query = qp.toString() ? `?${qp.toString()}` : "";
      const data = await fetchJson<{ data: DiagnosticOrderDTO[] }>(`/api/diagnostics/orders${query}`);
      setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminStatus, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!highlightId) return;
    const timeout = setTimeout(() => {
      const target = document.getElementById(`order-${highlightId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [highlightId, orders]);

  const scopedOrders = useMemo(() => {
    const scopedByPatient = patientId ? orders.filter((o) => o.patientId === patientId) : orders;
    return sourceRefId ? scopedByPatient.filter((o) => o.sourceRefId === sourceRefId) : scopedByPatient;
  }, [orders, patientId, sourceRefId]);

  const filteredOrders = useMemo(() => {
    const byStatus = adminStatus === "ALL" ? scopedOrders : scopedOrders.filter((o) => o.adminStatus === adminStatus);
    return byStatus.filter((order) => {
      const orderDate = String(order.orderedAt || "").slice(0, 10);
      if (dateRange.from && orderDate < dateRange.from) return false;
      if (dateRange.to && orderDate > dateRange.to) return false;
      return true;
    });
  }, [adminStatus, dateRange.from, dateRange.to, scopedOrders]);

  const stats = useMemo(() => {
    const total = scopedOrders.length;
    const pendingPayment = scopedOrders.filter((o) => o.adminStatus === "PENDING_PAYMENT").length;
    const pendingExecution = scopedOrders.filter((o) => o.adminStatus === "PAID").length;
    const inExecution = scopedOrders.filter((o) => o.adminStatus === "SENT_TO_EXECUTION").length;
    return [
      { label: "Órdenes activas", value: total, tone: "text-[#2e75ba]", bg: "bg-[#e9f1fb]" },
      { label: "Pendientes de pago", value: pendingPayment, tone: "text-amber-700", bg: "bg-amber-50" },
      { label: "Pendientes de ejecución", value: pendingExecution, tone: "text-[#2e75ba]", bg: "bg-[#e8f1ff]" },
      { label: "En ejecución", value: inExecution, tone: "text-emerald-700", bg: "bg-emerald-50" }
    ];
  }, [scopedOrders]);

  const handlePay = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setPaymentModal({ open: true, order, mode: "pay" });
  };

  const updateAdminStatus = async (orderId: string, payload: Record<string, unknown>) => {
    try {
      await fetchJson(`/api/diagnostics/orders/${orderId}/admin-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo actualizar la orden");
    }
  };

  const handleSendToExecution = async (orderId: string) => {
    try {
      await fetchJson(`/api/diagnostics/orders/${orderId}/send-to-execution`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo enviar a ejecución");
    }
  };

  const renderAdminActions = (order: DiagnosticOrderDTO) => {
    const status = order.adminStatus || "DRAFT";

    if (status === "DRAFT") {
      return (
        <>
          <button
            disabled
            title="Próximamente"
            className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-3 py-1 text-xs font-semibold text-slate-400 shadow-sm"
          >
            Editar items
          </button>
          <button
            onClick={() => updateAdminStatus(order.id, { adminStatus: "CANCELLED" })}
            className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-200"
          >
            <XMarkIcon className="h-4 w-4" />
            Cancelar
          </button>
        </>
      );
    }

    if (status === "PENDING_PAYMENT") {
      return (
        <>
          <button
            onClick={() => handlePay(order.id)}
            className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
          >
            <CurrencyDollarIcon className="h-4 w-4" />
            Marcar pagada
          </button>
          <button
            onClick={() => setPaymentModal({ open: true, order, mode: "method" })}
            className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
          >
            Cambiar método
          </button>
        </>
      );
    }

    if (status === "INSURANCE_AUTH") {
      return (
        <button
          onClick={() =>
            updateAdminStatus(order.id, {
              adminStatus: "PAID",
              paymentMethod: "INSURANCE",
              insuranceId: order.insuranceId || undefined
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-200"
        >
          <ShieldCheckIcon className="h-4 w-4" />
          Marcar autorizada
        </button>
      );
    }

    if (status === "PAID") {
      return (
        <button
          onClick={() => handleSendToExecution(order.id)}
          className="inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#245f95]"
        >
          Enviar a ejecución
        </button>
      );
    }

    if (status === "SENT_TO_EXECUTION") {
      return <span className="text-xs font-semibold text-[#2e75ba]">En ejecución</span>;
    }

    if (status === "COMPLETED") {
      return <span className="text-xs font-semibold text-emerald-700">Completada</span>;
    }

    if (status === "CANCELLED") {
      return <span className="text-xs font-semibold text-rose-600">Cancelada</span>;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Órdenes</p>
          <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Órdenes administrativas</h2>
          <p className="text-sm text-slate-600">
            Aprobación/pago y envío a ejecución (LabTest / RX / US).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadOrders()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d0e2f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refrescar
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#3f8f87]"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva orden
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {stats.map((card) => (
          <div key={card.label} className={`rounded-2xl border border-[#dce7f5] p-4 shadow-sm ${card.bg}`}>
            <p className="text-sm text-slate-600">{card.label}</p>
            <p className={`text-3xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#dce7f5] bg-white shadow-md shadow-[#d7e6f8]">
        <div className="flex flex-col gap-3 border-b border-[#e5edf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {adminStatusOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAdminStatus(opt)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    adminStatus === opt ? "bg-[#2e75ba] text-white shadow-sm" : "bg-[#eef3fb] text-[#2e75ba] hover:bg-[#d8e6fb]"
                  }`}
                >
                  {opt === "ALL" ? "Todos" : AdminStatusLabel(opt)}
                </button>
              ))}
            </div>
            <DateRangeField
              value={dateRange}
              onChange={setDateRange}
              labels={{ from: "Desde", to: "Hasta" }}
              className="max-w-[380px]"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-2 w-2 rounded-full bg-[#4aa59c]" />
            <span>Teal = acción clínica</span>
            <div className="h-2 w-2 rounded-full bg-[#2e75ba]" />
            <span>Azul corporativo = seguimiento</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e5edf8]">
            <thead className="bg-[#2e75ba] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Pago</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado clínico</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3fb]">
              {filteredOrders.map((order, idx) => (
                <tr
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`${idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"} ${
                    highlightId === order.id ? "ring-2 ring-[#4aa59c]/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      <AdminStatusBadge status={order.adminStatus} />
                      <span className="text-xs text-slate-500">Operativo: {StatusLabel(order.status as DiagnosticOrderStatus)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm font-semibold text-[#163d66]">{order.patient?.name || "Paciente"}</div>
                    <div className="text-xs text-slate-500">{order.patient?.dpi || order.patient?.nit || order.patientId}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              item.kind === "LAB" ? "bg-[#e5f5f2] text-[#1f6f68]" : "bg-[#e8f1ff] text-[#2e75ba]"
                            }`}
                          >
                            {item.kind === "LAB" ? "LAB" : item.catalogItem.modality || "IMG"}
                          </span>
                          <span className="font-medium">{item.catalogItem.name}</span>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-sm font-semibold text-[#163d66]">
                    Q {order.totalAmount?.toFixed(2) || "0.00"}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    <PaymentMethodBadge method={order.paymentMethod} />
                    {order.paymentReference && (
                      <div className="text-xs text-slate-500">Ref: {order.paymentReference}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <ClinicalSummary summary={order.clinicalSummary} />
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-600">
                    {formatDateTimeByConfig(order.orderedAt, dateTimeConfig)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {renderAdminActions(order)}
                      <Link
                        href={`/diagnostics/orders/${order.id}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#2e75ba] hover:underline"
                      >
                        Ver detalle <ArrowUpRightIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/diagnostics/lab/worklist"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#2e75ba] hover:underline"
                      >
                        Ir a worklists <ArrowUpRightIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredOrders.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    {loading ? "Cargando..." : "Sin órdenes en este estado"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewOrderModal
          catalog={catalog}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            loadOrders();
          }}
        />
      )}

      {paymentModal.open && paymentModal.order && (
        <PaymentModal
          order={paymentModal.order}
          mode={paymentModal.mode || "pay"}
          onClose={() => setPaymentModal({ open: false })}
          onSave={async (payload) => {
            if (!paymentModal.order) return;
            const nextStatus = paymentModal.mode === "pay" ? "PAID" : paymentModal.order.adminStatus;
            await updateAdminStatus(paymentModal.order.id, { adminStatus: nextStatus, ...payload });
            setPaymentModal({ open: false });
          }}
        />
      )}
    </div>
  );
}

function StatusLabel(value: DiagnosticOrderStatus | "ALL") {
  const map: Record<string, string> = {
    ALL: "Todos",
    DRAFT: "Borrador",
    PAID: "Pagada",
    IN_PROGRESS: "En proceso",
    READY: "Lista",
    RELEASED: "Liberada",
    CANCELLED: "Cancelada"
  };
  return map[value] || value;
}

function AdminStatusLabel(value: DiagnosticOrderAdminStatus) {
  const map: Record<DiagnosticOrderAdminStatus, string> = {
    DRAFT: "Borrador",
    PENDING_PAYMENT: "Pendiente pago",
    INSURANCE_AUTH: "Autorización seguro",
    PAID: "Pagada",
    SENT_TO_EXECUTION: "En ejecución",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada"
  };
  return map[value] || value;
}

function AdminStatusBadge({ status }: { status: DiagnosticOrderAdminStatus }) {
  const styles: Record<DiagnosticOrderAdminStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border border-slate-200",
    PENDING_PAYMENT: "bg-amber-100 text-amber-700 border border-amber-200",
    INSURANCE_AUTH: "bg-orange-100 text-orange-700 border border-orange-200",
    PAID: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    SENT_TO_EXECUTION: "bg-[#e8f1ff] text-[#2e75ba] border border-[#cbd9f5]",
    COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border border-rose-200"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {AdminStatusLabel(status)}
    </span>
  );
}

function PaymentMethodBadge({ method }: { method: DiagnosticPaymentMethod | null }) {
  if (!method) return <span className="text-xs text-slate-400">Sin método</span>;
  const map: Record<DiagnosticPaymentMethod, { label: string; tone: string; icon: ReactNode }> = {
    CASH: { label: "Efectivo", tone: "bg-slate-100 text-slate-700", icon: <BanknotesIcon className="h-4 w-4" /> },
    CARD: { label: "Tarjeta", tone: "bg-[#e8f1ff] text-[#2e75ba]", icon: <CreditCardIcon className="h-4 w-4" /> },
    TRANSFER: { label: "Transfer.", tone: "bg-[#eef3fb] text-[#2e75ba]", icon: <ArrowsRightLeftIcon className="h-4 w-4" /> },
    INSURANCE: { label: "Seguro", tone: "bg-amber-100 text-amber-700", icon: <ShieldCheckIcon className="h-4 w-4" /> }
  };
  const config = map[method];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${config.tone}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ClinicalSummary({ summary }: { summary?: DiagnosticClinicalSummary }) {
  if (!summary) return <span className="text-slate-400">—</span>;
  const labText = summary.lab.expected
    ? summary.lab.completed
      ? "Lab: completado"
      : `Lab: ${summary.lab.released}/${summary.lab.total} liberados`
    : "Lab: —";
  const xrText = summary.xr.expected
    ? summary.xr.completed
      ? "RX: completado"
      : `RX: ${summary.xr.pending}/${summary.xr.total} pendientes`
    : "RX: —";
  const usText = summary.us.expected
    ? summary.us.completed
      ? "US: completado"
      : `US: ${summary.us.pending}/${summary.us.total} pendientes`
    : "US: —";
  return (
    <div className="space-y-1">
      <div>{labText}</div>
      <div>{xrText}</div>
      <div>{usText}</div>
    </div>
  );
}

type NewOrderModalProps = {
  catalog: DiagnosticCatalogItem[];
  onClose: () => void;
  onCreated: () => void;
};

function NewOrderModal({ catalog, onClose, onCreated }: NewOrderModalProps) {
  const [patientId, setPatientId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const lab = catalog.filter((c) => c.kind === "LAB");
  const imaging = catalog.filter((c) => c.kind === "IMAGING");
  const selectedTotal = Array.from(selected).reduce((sum, id) => {
    const item = catalog.find((c) => c.id === id);
    return sum + (item?.price || 0);
  }, 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || selected.size === 0) {
      alert("Paciente e items son obligatorios");
      return;
    }
    try {
      setSaving(true);
      const items = Array.from(selected).map((id) => {
        const cat = catalog.find((c) => c.id === id);
        return { catalogItemId: id, kind: cat?.kind || "LAB" };
      });
      await fetchJson("/api/diagnostics/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, branchId: branchId || undefined, notes, items, sourceType: "WALK_IN" })
      });
      onCreated();
      setPatientId("");
      setBranchId("");
      setNotes("");
      setSelected(new Set());
    } catch (err: any) {
      alert(err.message || "No se pudo crear la orden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
        <div className="w-full max-w-3xl rounded-2xl border border-[#d0e2f5] bg-white p-6 shadow-xl shadow-[#d7e6f8]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Nueva orden</p>
            <h3 className="text-xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Paciente + items</h3>
            <p className="text-sm text-slate-600">Selecciona pruebas de laboratorio o estudios de imagen.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#163d66]">Paciente</label>
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="text-xs font-semibold text-[#2e75ba] hover:underline"
              >
                Crear paciente rápido
              </button>
            </div>
            <QuickPatientSearch
              value={patientName}
              onChange={(id, patient) => {
                setPatientId(id);
                setPatientName(patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : id);
              }}
            />
            {patientId && (
              <p className="text-xs text-slate-500">
                Seleccionado: <span className="font-semibold text-[#163d66]">{patientName || patientId}</span>
              </p>
            )}
            <label className="text-sm font-semibold text-[#163d66]">Sucursal</label>
            <input
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              placeholder="ID sucursal (opcional)"
            />
            <label className="text-sm font-semibold text-[#163d66]">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              rows={4}
              placeholder="Indicaciones adicionales"
            />
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2e75ba]">Laboratorio</p>
                <span className="text-xs text-slate-500">{lab.length} items</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lab.map((test) => (
                  <label
                    key={test.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selected.has(test.id)
                        ? "border-[#4aa59c] bg-[#e5f5f2] text-[#1f6f68]"
                        : "border-[#e5edf8] bg-white text-slate-700 hover:border-[#c8d7ee]"
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(test.id)} onChange={() => toggle(test.id)} className="mt-1" />
                    <div>
                      <p className="font-semibold">{test.name}</p>
                      <p className="text-xs text-slate-500">
                        {test.unit || "panel"} • Q {test.price?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2e75ba]">Imagenología</p>
                <span className="text-xs text-slate-500">{imaging.length} items</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {imaging.map((study) => (
                  <label
                    key={study.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selected.has(study.id)
                        ? "border-[#4aadf5] bg-[#e9f4ff] text-[#1c6fb8]"
                        : "border-[#e5edf8] bg-white text-slate-700 hover:border-[#c8d7ee]"
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(study.id)} onChange={() => toggle(study.id)} className="mt-1" />
                    <div>
                      <p className="font-semibold">{study.name}</p>
                      <p className="text-xs text-slate-500">
                        {study.modality || "IMG"} • Q {study.price?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-[#e5edf8] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#3f8f87] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Crear orden"}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e5edf8] bg-[#f8fafc] px-4 py-3 text-sm">
          <div className="font-semibold text-[#163d66]">Carrito</div>
          <div className="text-sm text-slate-600">Items seleccionados: {selected.size}</div>
          <div className="text-sm font-semibold text-[#2e75ba]">Total estimado: Q {selectedTotal.toFixed(2)}</div>
        </div>
        </div>
      </div>
      {showQuickCreate && (
        <QuickCreatePatient
          onClose={() => setShowQuickCreate(false)}
          onCreated={(id, name) => {
            setPatientId(id);
            setPatientName(name);
            setShowQuickCreate(false);
          }}
        />
      )}
    </>
  );
}

type PaymentModalProps = {
  order: DiagnosticOrderDTO;
  mode: "pay" | "method";
  onClose: () => void;
  onSave: (payload: { paymentMethod: DiagnosticPaymentMethod; paymentReference?: string; insuranceId?: string }) => void;
};

function PaymentModal({ order, mode, onClose, onSave }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<DiagnosticPaymentMethod>(order.paymentMethod || "CASH");
  const [paymentReference, setPaymentReference] = useState(order.paymentReference || "");
  const [insuranceId, setInsuranceId] = useState(order.insuranceId || "");

  const title = mode === "pay" ? "Marcar como pagada" : "Cambiar método de pago";
  const subtitle = mode === "pay" ? "Registra el método y referencia de pago." : "Actualiza el método antes de cobrar.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      paymentMethod,
      paymentReference: paymentReference || undefined,
      insuranceId: paymentMethod === "INSURANCE" ? insuranceId || undefined : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#d0e2f5] bg-white p-6 shadow-xl shadow-[#d7e6f8]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Pago</p>
            <h3 className="text-xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">{title}</h3>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50">
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1 text-sm">
            <label className="font-semibold text-[#163d66]">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as DiagnosticPaymentMethod)}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
            >
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="INSURANCE">Seguro</option>
            </select>
          </div>

          <div className="space-y-1 text-sm">
            <label className="font-semibold text-[#163d66]">Referencia</label>
            <input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              placeholder="Número de boleta, voucher, transferencia..."
            />
          </div>

          {paymentMethod === "INSURANCE" && (
            <div className="space-y-1 text-sm">
              <label className="font-semibold text-[#163d66]">Seguro / Autorización</label>
              <input
                value={insuranceId}
                onChange={(e) => setInsuranceId(e.target.value)}
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
                placeholder="ID o número de autorización"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
