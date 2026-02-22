"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  CheckBadgeIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PhotoIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/diagnostics/StatusBadge";
import type { DiagnosticImagingReport, DiagnosticOrderDTO, DiagnosticOrderItem } from "@/lib/diagnostics/types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo procesar la solicitud");
  }
  return res.json();
}

type ImagingItemRow = DiagnosticOrderItem & { order: DiagnosticOrderDTO };

type Props = {
  initialOrders: DiagnosticOrderDTO[];
  modality?: "XR" | "US";
};

export default function ImagingWorklistClient({ initialOrders, modality }: Props) {
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
  }, [modality]);

  const imagingItems: ImagingItemRow[] = useMemo(() => {
    const items = orders
      .flatMap((order) =>
        order.items
          .filter((it) => it.kind === "IMAGING")
          .map((it) => ({
            ...it,
            order
          }))
      )
      .sort((a, b) => (a.order.orderedAt > b.order.orderedAt ? -1 : 1));
    if (!modality) return items;
    return items.filter((it) => it.catalogItem.modality === modality);
  }, [orders, modality]);

  const latestReport = (item: DiagnosticOrderItem): DiagnosticImagingReport | null => {
    const reports = item.imagingStudy?.reports || [];
    if (!reports.length) return null;
    return reports.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
  };

  const viewerUrlForStudy = (orthancStudyId?: string | null) => {
    const viewerBase = process.env.NEXT_PUBLIC_ORTHANC_VIEWER_URL || process.env.NEXT_PUBLIC_ORTHANC_BASE_URL;
    if (!viewerBase || !orthancStudyId) return null;
    return `${viewerBase.replace(/\/$/, "")}/${orthancStudyId}`;
  };

  const linkStudy = async (item: ImagingItemRow) => {
    const orthanc = prompt("Orthanc Study ID", item.imagingStudy?.orthancStudyId || `ST-${item.id.slice(0, 6).toUpperCase()}`);
    if (!orthanc) return;
    const modality = item.catalogItem.modality || "XR";
    try {
      await fetchJson("/api/diagnostics/imaging/studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: item.id,
          orthancStudyId: orthanc,
          modality
        })
      });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo vincular el estudio");
    }
  };

  const signReport = async (item: ImagingItemRow) => {
    const report = latestReport(item);
    if (!report) {
      alert("Crea el reporte antes de firmar");
      return;
    }
    try {
      await fetchJson(`/api/diagnostics/imaging/reports/${report.id}/sign`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo firmar");
    }
  };

  const releaseReport = async (item: ImagingItemRow) => {
    const report = latestReport(item);
    if (!report) {
      alert("No hay reporte firmado");
      return;
    }
    try {
      await fetchJson(`/api/diagnostics/imaging/reports/${report.id}/release`, { method: "POST" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "No se pudo liberar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">
            Imagen · administrativo {modality ? `• ${modality}` : ""}
          </p>
          <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Worklist de imagen</h2>
          <p className="text-sm text-slate-600">Adjuntar Orthanc, abrir visor, estado y reporte.</p>
        </div>
        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d0e2f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refrescar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-md shadow-[#d7e6f8]">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estudio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Orthanc / Visor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reporte</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {imagingItems.map((item, idx) => {
              const study = item.imagingStudy;
              const report = latestReport(item);
              const viewerUrl = study ? viewerUrlForStudy(study.orthancStudyId) : null;
              return (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                  <td className="px-4 py-3 align-top text-sm">
                    <div className="font-semibold text-[#163d66]">{item.order.patient?.name || "Paciente"}</div>
                    <div className="text-xs text-slate-500">{item.order.patient?.dpi || item.order.patientId}</div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-2 py-0.5 text-[11px] text-[#2e75ba]">
                      <PhotoIcon className="h-4 w-4" />
                      {item.order.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-sm">
                    <div className="font-semibold text-[#163d66]">{item.catalogItem.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.catalogItem.modality || "IMG"} • {item.priority || "Rutina"}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    {study ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
                          <PaperClipIcon className="h-4 w-4" />
                          {study.orthancStudyId || "Sin ID"}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-[#e5f5f2] px-2 py-0.5 text-[#1f6f68]">
                            {study.modality}
                          </span>
                          {study.receivedAt && (
                            <span>
                              {new Date(study.receivedAt).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#2e75ba]">
                          <Link href={`/diagnostics/imaging/studies/${study.id}`} className="inline-flex items-center gap-1 hover:underline">
                            Abrir visor <ArrowUpRightIcon className="h-4 w-4" />
                          </Link>
                          {viewerUrl && (
                            <a
                              href={viewerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#1f6f68] hover:underline"
                            >
                              PACS externo <ArrowUpRightIcon className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700">Sin estudio adjunto</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-sm text-slate-700">
                    {report ? (
                      <div className="space-y-1">
                        <StatusBadge status={report.status} className="text-xs" />
                        <p className="text-xs text-slate-500">
                          {report.updatedAt
                            ? new Date(report.updatedAt).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" })
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Reporte pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {!study && (
                        <button
                          onClick={() => linkStudy(item)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#4aadf5] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#3b94dc]"
                        >
                          <PaperClipIcon className="h-4 w-4" />
                          Adjuntar Orthanc
                        </button>
                      )}
                      {study && (
                        <>
                          <Link
                            href={`/diagnostics/imaging/studies/${study.id}`}
                            className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#d7e6fb]"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Ir a reportes
                          </Link>
                          {report?.status === "DRAFT" && (
                            <button
                              onClick={() => signReport(item)}
                              className="inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#245f95]"
                            >
                              <CheckBadgeIcon className="h-4 w-4" />
                              Firmar
                            </button>
                          )}
                          {report?.status === "SIGNED" && (
                            <button
                              onClick={() => releaseReport(item)}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                            >
                              <SparklesIcon className="h-4 w-4" />
                              Liberar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!imagingItems.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  {loading ? "Cargando..." : "Sin estudios de imagen"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
