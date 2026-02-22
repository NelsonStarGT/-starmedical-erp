"use client";

import { useEffect, useMemo, useState } from "react";
import { LabArea, LabTestPriority, LabTestStatus } from "@prisma/client";
import { StatusChip } from "@/components/labtest/StatusChip";
import { PriorityBadge } from "@/components/labtest/PriorityBadge";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type ResultLog = any;

const areaOptions = Object.values(LabArea);
const priorityOptions = Object.values(LabTestPriority);
const statusOptions = Object.values(LabTestStatus);

export function LogsResultsClient() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [data, setData] = useState<ResultLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (area) params.set("area", area);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    return params.toString();
  }, [from, to, area, priority, status]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await safeFetchJson<{ ok: boolean; data: ResultLog[]; code?: string }>(
          `/api/labtest/logs/results${queryString ? `?${queryString}` : ""}`
        );
        if (res.code === "LAB_NOT_READY") setMessage("Ejecuta migración LabTest para habilitar bitácoras");
        setData(res.data || []);
      } catch (err: any) {
        setMessage(err.message || "No se pudo cargar bitácora");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryString]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Bitácora</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Resultados liberados/enviados</h2>
        <p className="text-sm text-slate-600">Visibilidad rápida de reportes con secuencia.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1 text-sm">
            <label className="text-slate-600">Desde</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" className="w-full rounded-lg border border-[#dce7f5] px-3 py-2" />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-600">Hasta</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} type="date" className="w-full rounded-lg border border-[#dce7f5] px-3 py-2" />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-600">Área</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-lg border border-[#dce7f5] px-3 py-2">
              <option value="">Todas</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-600">Prioridad</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-[#dce7f5] px-3 py-2">
              <option value="">Todas</option>
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-600">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-[#dce7f5] px-3 py-2">
              <option value="">Todos</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Secuencia reporte</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Orden</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Prueba</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Liberado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {data.map((res, idx) => (
              <tr key={res.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                <td className="px-4 py-3 text-sm font-semibold text-[#163d66]">
                  {res.item?.order?.reportSeq ? `${res.item.order.reportSeq}` : "—"}
                  <div className="text-[11px] text-slate-500">{res.item?.order?.reportSeqDateKey || ""}</div>
                </td>
                <td className="px-4 py-3 text-sm text-[#163d66]">
                  {res.item?.order?.code}
                  <div className="text-[11px] text-slate-500">{res.item?.order?.areaHint || res.item?.area}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {res.item?.order?.patientDisplay ||
                    res.item?.order?.patient?.firstName ||
                    res.item?.order?.labPatient?.firstName ||
                    "Paciente"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{res.item?.name}</td>
                <td className="px-4 py-3">
                  <StatusChip status={res.status as LabTestStatus} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {res.releasedAt ? new Date(res.releasedAt).toLocaleString() : res.createdAt ? new Date(res.createdAt).toLocaleString() : ""}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  {loading ? "Cargando..." : "Sin registros en este rango."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</div>}
    </div>
  );
}
