"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { StatusBadge } from "@/components/diagnostics/StatusBadge";
import type { DiagnosticLabResult, DiagnosticOrderDTO, DiagnosticOrderItem } from "@/lib/diagnostics/types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo procesar la solicitud");
  }
  return res.json();
}

type LabItemRow = DiagnosticOrderItem & { order: DiagnosticOrderDTO };

type Props = {
  initialOrders: DiagnosticOrderDTO[];
};

export default function LabWorklistClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<DiagnosticOrderDTO[]>(initialOrders);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ data: DiagnosticOrderDTO[] }>("/api/diagnostics/orders");
      setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const labItems: LabItemRow[] = useMemo(() => {
    return orders
      .flatMap((order) =>
        order.items
          .filter((it) => it.kind === "LAB")
          .map((it) => ({
            ...it,
            order
          }))
      )
      .sort((a, b) => (a.order.orderedAt > b.order.orderedAt ? -1 : 1));
  }, [orders]);

  const latestResult = (item: DiagnosticOrderItem): DiagnosticLabResult | null => {
    if (!item.labResults || item.labResults.length === 0) return null;
    return item.labResults.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
  };

  const registerSpecimen = async (item: LabItemRow) => {
    const code = prompt("Código de muestra (barcode)", `SP-${item.id.slice(0, 6).toUpperCase()}`);
    if (!code) return;
    try {
      await fetchJson("/api/diagnostics/lab/specimens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId: item.id, specimenCode: code })
      });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo registrar la muestra");
    }
  };

  const captureResult = async (item: LabItemRow) => {
    const value = prompt("Valor numérico (usa coma si aplica)", latestResult(item)?.valueNumber?.toString() || "");
    if (!value) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      alert("Ingresa un número válido");
      return;
    }
    try {
      await fetchJson("/api/diagnostics/lab/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: item.id,
          valueNumber: parsed,
          unit: item.catalogItem.unit || undefined,
          refLow: item.catalogItem.refLow ?? undefined,
          refHigh: item.catalogItem.refHigh ?? undefined,
          testCode: item.catalogItem.code
        })
      });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo capturar el resultado");
    }
  };

  const validateResult = async (item: LabItemRow) => {
    const result = latestResult(item);
    if (!result) {
      alert("No hay resultado para validar");
      return;
    }
    try {
      await fetchJson(`/api/diagnostics/lab/results/${result.id}/validate`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo validar");
    }
  };

  const releaseResult = async (item: LabItemRow) => {
    const result = latestResult(item);
    if (!result) {
      alert("No hay resultado para liberar");
      return;
    }
    try {
      await fetchJson(`/api/diagnostics/lab/results/${result.id}/release`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo liberar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Laboratorio · administrativo</p>
          <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Registrar muestra y seguimiento</h2>
          <p className="text-sm text-slate-600">
            Registrar muestra, imprimir etiqueta y ver estado. Captura y validación se realizan en LabTest.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d0e2f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Refrescar
          </button>
          <Link
            href="/labtest/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d0e2f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
          >
            Abrir LabTest
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-md shadow-[#d7e6f8]">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Prueba</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Muestra</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Resultado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {labItems.map((item, idx) => {
              const specimen = item.specimen;
              const result = latestResult(item);
              return (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                  <td className="px-4 py-3 align-top text-sm">
                    <div className="font-semibold text-[#163d66]">{item.order.patient?.name || "Paciente"}</div>
                    <div className="text-xs text-slate-500">{item.order.patient?.dpi || item.order.patientId}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[11px] text-[#2e75ba]">
                      <BeakerIcon className="h-4 w-4" />
                      {item.order.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-sm">
                    <div className="font-semibold text-[#163d66]">{item.catalogItem.name}</div>
                    <div className="text-xs text-slate-500">{item.priority || "Rutina"}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    {specimen ? (
                      <div className="space-y-1">
                        <div className="rounded-full bg-[#e5f5f2] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                          {specimen.specimenCode}
                        </div>
                        <p className="text-xs text-slate-500">
                          {specimen.collectedAt
                            ? new Date(specimen.collectedAt).toLocaleString("es-GT", {
                                dateStyle: "medium",
                                timeStyle: "short"
                              })
                            : "Sin fecha"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700">Muestra pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    {result ? (
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {result.valueNumber ?? result.valueText} {result.unit || ""}
                        </p>
                        {result.flag && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              result.flag === "HIGH"
                                ? "bg-rose-100 text-rose-700"
                                : result.flag === "LOW"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {result.flag}
                          </span>
                        )}
                        <p className="text-xs text-slate-500">
                          {result.resultAt
                            ? new Date(result.resultAt).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })
                            : "Sin fecha"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sin resultado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {item.status === "ORDERED" && (
                        <button
                          onClick={() => registerSpecimen(item)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
                        >
                          Registrar muestra
                        </button>
                      )}
                      {(item.status === "COLLECTED" || item.status === "IN_ANALYSIS" || item.status === "PENDING_VALIDATION") && (
                        <button
                          onClick={() => captureResult(item)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#4aadf5] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#3b94dc]"
                        >
                          Capturar resultado (mover a LabTest)
                        </button>
                      )}
                      {item.status === "PENDING_VALIDATION" && result && (
                        <button
                          onClick={() => validateResult(item)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#245f95]"
                        >
                          <ClipboardDocumentCheckIcon className="h-4 w-4" />
                          Validar (mover a LabTest)
                        </button>
                      )}
                      {item.status === "VALIDATED" && result && (
                        <button
                          onClick={() => releaseResult(item)}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <SparklesIcon className="h-4 w-4" />
                          Liberar (mover a LabTest)
                        </button>
                      )}
                      <Link href="/labtest/orders" className="text-xs font-semibold text-[#2e75ba] hover:underline">
                        Ir a LabTest
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!labItems.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  {loading ? "Cargando..." : "Sin items de laboratorio"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
