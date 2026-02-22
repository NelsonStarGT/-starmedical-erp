"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  PlayIcon
} from "@heroicons/react/24/outline";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import type { EncounterResultValueRow } from "@/components/medical/encounter/types";
import {
  fetchWorklistOrders,
  patchWorklistOrderStatus,
  uploadWorklistOrderResult,
  type WorklistModality,
  type WorklistOrderItem,
  type WorklistOrderPriority,
  type WorklistOrderStatus
} from "@/lib/medical/worklistClient";

type StatusScope = "pending" | "ordered" | "in_progress" | "completed" | "all";

function modalityLabel(modality: WorklistModality) {
  if (modality === "RX") return "Rayos X";
  if (modality === "USG") return "Ultrasonido";
  return "Laboratorio";
}

function statusLabel(status: WorklistOrderStatus) {
  if (status === "in_progress") return "En proceso";
  if (status === "completed") return "Realizada";
  if (status === "cancelled") return "Cancelada";
  return "Ordenada";
}

function statusPill(status: WorklistOrderStatus) {
  if (status === "in_progress") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "cancelled") return "border-slate-300 bg-slate-100 text-slate-700";
  return "border-[#2e75ba]/25 bg-[#f2f8ff] text-[#2e75ba]";
}

function priorityLabel(priority: WorklistOrderPriority) {
  return priority === "urgent" ? "Urgente" : "Rutina";
}

function priorityPill(priority: WorklistOrderPriority) {
  return priority === "urgent"
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusScopeLabel(scope: StatusScope) {
  if (scope === "pending") return "Pendientes";
  if (scope === "ordered") return "Ordenadas";
  if (scope === "in_progress") return "En proceso";
  if (scope === "completed") return "Realizadas";
  return "Todas";
}

function statusesFromScope(scope: StatusScope): WorklistOrderStatus[] {
  if (scope === "ordered") return ["ordered"];
  if (scope === "in_progress") return ["in_progress"];
  if (scope === "completed") return ["completed"];
  if (scope === "all") return ["ordered", "in_progress", "completed", "cancelled"];
  return ["ordered", "in_progress"];
}

function parseResultValues(raw: string): EncounterResultValueRow[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [parameter, value, range, flag] = line.split("|").map((item) => item?.trim() || "");
      if (!parameter || !value) return null;
      return {
        parameter,
        value,
        range: range || null,
        flag: flag || null
      } satisfies EncounterResultValueRow;
    })
    .filter((item): item is EncounterResultValueRow => Boolean(item));
}

function parseImageUrls(raw: string): string[] {
  return raw
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OperationalWorklistClient({ modality }: { modality: WorklistModality }) {
  const { toasts, showToast, dismiss } = useToast();
  const [items, setItems] = useState<WorklistOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusScope, setStatusScope] = useState<StatusScope>("pending");
  const [priority, setPriority] = useState<WorklistOrderPriority | "all">("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadOrder, setUploadOrder] = useState<WorklistOrderItem | null>(null);
  const [uploadPdfUrl, setUploadPdfUrl] = useState("");
  const [uploadImageUrls, setUploadImageUrls] = useState("");
  const [uploadValues, setUploadValues] = useState("");
  const [markReady, setMarkReady] = useState(true);

  const statuses = useMemo(() => statusesFromScope(statusScope), [statusScope]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWorklistOrders({
        modality,
        priority,
        query,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statuses
      });
      setItems(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo cargar worklist.", "error");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, modality, priority, query, showToast, statuses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 180);
    return () => clearTimeout(timer);
  }, [load]);

  const openUploadModal = (order: WorklistOrderItem) => {
    setUploadOrder(order);
    setUploadPdfUrl("");
    setUploadImageUrls("");
    setUploadValues("");
    setMarkReady(true);
  };

  const closeUploadModal = () => {
    setUploadOrder(null);
    setUploadPdfUrl("");
    setUploadImageUrls("");
    setUploadValues("");
    setMarkReady(true);
  };

  const updateOrderStatus = async (order: WorklistOrderItem, nextStatus: WorklistOrderStatus) => {
    if (workingOrderId) return;
    setWorkingOrderId(order.orderId);
    try {
      await patchWorklistOrderStatus({ orderId: order.orderId, status: nextStatus });
      if (nextStatus === "in_progress") {
        showToast("Orden marcada en proceso.", "success");
      } else if (nextStatus === "completed") {
        showToast("Orden marcada como realizada.", "success");
        openUploadModal(order);
      } else if (nextStatus === "cancelled") {
        showToast("Orden cancelada.", "info");
      } else {
        showToast("Estado de orden actualizado.", "success");
      }
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar estado de la orden.", "error");
    } finally {
      setWorkingOrderId(null);
    }
  };

  const submitUpload = async () => {
    if (!uploadOrder || uploading) return;
    const values = parseResultValues(uploadValues);
    const imageUrls = parseImageUrls(uploadImageUrls);
    const pdfUrl = uploadPdfUrl.trim();

    const hasAny = Boolean(pdfUrl) || imageUrls.length > 0 || values.length > 0;
    if (!hasAny) {
      showToast("Adjunta PDF, imágenes o valores antes de guardar.", "error");
      return;
    }

    setUploading(true);
    try {
      await uploadWorklistOrderResult({
        orderId: uploadOrder.orderId,
        pdfUrl: pdfUrl || null,
        imageUrls,
        values,
        markReady
      });
      showToast("Resultado cargado.", "success");
      closeUploadModal();
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo cargar resultado.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Worklist operativa</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{modalityLabel(modality)} · Órdenes médicas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gestiona órdenes pendientes, ejecuta estudios y carga resultados para que aparezcan en ResultsModal.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_160px_minmax(0,1fr)_170px_170px_auto] xl:items-end">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estado</span>
            <select
              value={statusScope}
              onChange={(event) => setStatusScope(event.target.value as StatusScope)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            >
              {(["pending", "ordered", "in_progress", "completed", "all"] as const).map((scope) => (
                <option key={scope} value={scope}>
                  {statusScopeLabel(scope)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prioridad</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as WorklistOrderPriority | "all")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            >
              <option value="all">Todas</option>
              <option value="urgent">Urgente</option>
              <option value="routine">Rutina</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Paciente / Encounter</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar paciente o encounter..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Desde</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hasta</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white",
              loading ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
            )}
          >
            <ArrowPathIcon className={cn("h-4 w-4", loading && "animate-spin")} />
            Refrescar
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#2e75ba] text-white">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estudio</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Prioridad</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Cargando worklist...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Sin órdenes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const blocked = workingOrderId === item.orderId;
                  return (
                    <tr key={item.orderId} className={index % 2 === 1 ? "bg-[#f8fafc]" : "bg-white"}>
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-slate-900">{item.patientName}</p>
                        <p className="text-xs text-slate-500">{item.encounterId}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-slate-900">{item.serviceTitle}</p>
                        <p className="text-xs text-slate-500">{item.modality}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityPill(item.priority))}>
                          {priorityLabel(item.priority)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusPill(item.status))}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-600">
                        <p>{formatDateTime(item.createdAt)}</p>
                        <p className="mt-1 text-slate-500">Actualizado: {formatDateTime(item.updatedAt)}</p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link
                            href={`/modulo-medico/consultaM/${encodeURIComponent(item.encounterId)}?focus=resultados`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Ver encounter
                          </Link>
                          {item.status === "ordered" && (
                            <button
                              type="button"
                              onClick={() => void updateOrderStatus(item, "in_progress")}
                              disabled={blocked}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white",
                                blocked ? "cursor-not-allowed bg-slate-300" : "bg-amber-600 hover:bg-amber-700"
                              )}
                            >
                              <PlayIcon className="h-3.5 w-3.5" />
                              En proceso
                            </button>
                          )}
                          {(item.status === "ordered" || item.status === "in_progress") && (
                            <button
                              type="button"
                              onClick={() => void updateOrderStatus(item, "completed")}
                              disabled={blocked}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white",
                                blocked ? "cursor-not-allowed bg-slate-300" : "bg-[#4aa59c] hover:opacity-90"
                              )}
                            >
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              Marcar realizada
                            </button>
                          )}
                          {item.status === "completed" && (
                            <button
                              type="button"
                              onClick={() => openUploadModal(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#2e75ba] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              <CloudArrowUpIcon className="h-3.5 w-3.5" />
                              Cargar resultado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(uploadOrder)}
        onClose={closeUploadModal}
        title={uploadOrder ? `Cargar resultado · ${uploadOrder.serviceTitle}` : "Cargar resultado"}
        subtitle={uploadOrder ? `${uploadOrder.modality} · ${uploadOrder.encounterId}` : undefined}
        className="max-w-3xl"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeUploadModal}
              disabled={uploading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void submitUpload()}
              disabled={uploading || !uploadOrder}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold text-white",
                uploading || !uploadOrder ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
              )}
            >
              {uploading ? "Guardando..." : "Guardar resultado"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">PDF URL</span>
            <input
              value={uploadPdfUrl}
              onChange={(event) => setUploadPdfUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Imágenes (una URL por línea)</span>
            <textarea
              rows={3}
              value={uploadImageUrls}
              onChange={(event) => setUploadImageUrls(event.target.value)}
              placeholder={"https://.../img1.png\nhttps://.../img2.png"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Valores LAB (parámetro|valor|rango|flag)
            </span>
            <textarea
              rows={4}
              value={uploadValues}
              onChange={(event) => setUploadValues(event.target.value)}
              placeholder={"Hb|13.8 g/dL|12-16|\nLeucocitos|11.2 x10^3/uL|4.0-10.5|HIGH"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={markReady}
              onChange={(event) => setMarkReady(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#2e75ba] focus:ring-[#2e75ba]"
            />
            Marcar resultado como listo para interpretación médica
          </label>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
