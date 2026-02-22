"use client";

import { useEffect, useMemo, useState } from "react";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type Summary = {
  totalOrders: number;
  byPriority: { priority: string; count: number }[];
  byArea: { area: string; count: number }[];
  avgTATReleasedMin: number | null;
  avgTATSentMin: number | null;
  pendingCounts: Record<string, number>;
  topTests: { name: string; count: number }[];
  range?: { from: string; to: string };
};

const cardStyle = "rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm";

export function ReportsClient() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [from, to]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await safeFetchJson<{ ok: boolean; data: Summary; code?: string }>(
          `/api/labtest/reports/summary${queryString ? `?${queryString}` : ""}`
        );
        if (res.code === "LAB_NOT_READY") {
          setMessage("Ejecuta migración LabTest para habilitar reportes");
        }
        setSummary(res.data);
      } catch (err: any) {
        setMessage(err.message || "No se pudo cargar el resumen");
      }
    };
    load();
  }, [queryString]);

  return (
    <div className="space-y-4">
      <div className={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Reportes</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Resumen operativo</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-slate-600">Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-[#dce7f5] px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-slate-600">Hasta</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-[#dce7f5] px-3 py-2" />
          </label>
          {summary?.range && (
            <div className="self-end rounded-full bg-[#e8f1ff] px-3 py-2 text-xs font-semibold text-[#2e75ba]">
              Rango actual: {summary.range.from.slice(0, 10)} → {summary.range.to.slice(0, 10)}
            </div>
          )}
        </div>
      </div>

      {summary && (
        <>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">Órdenes</p>
              <p className="text-3xl font-bold text-[#163d66]">{summary.totalOrders || 0}</p>
              <p className="text-xs text-slate-500">Total en rango</p>
            </div>
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">TAT liberación</p>
              <p className="text-3xl font-bold text-[#163d66]">
                {summary.avgTATReleasedMin !== null ? `${summary.avgTATReleasedMin} min` : "—"}
              </p>
              <p className="text-xs text-slate-500">Promedio hasta RELEASED</p>
            </div>
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">TAT envío</p>
              <p className="text-3xl font-bold text-[#163d66]">{summary.avgTATSentMin !== null ? `${summary.avgTATSentMin} min` : "—"}</p>
              <p className="text-xs text-slate-500">Promedio hasta SENT</p>
            </div>
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">Pendientes</p>
              <div className="text-sm text-slate-700 space-y-1">
                <div>Requisitos: {summary.pendingCounts?.requirements || 0}</div>
                <div>Recolección: {summary.pendingCounts?.collection || 0}</div>
                <div>Proceso: {summary.pendingCounts?.inProcess || 0}</div>
                <div>Validación: {summary.pendingCounts?.validation || 0}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">Por prioridad</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.byPriority?.map((p) => (
                  <span key={p.priority} className="rounded-full bg-[#e8f1ff] px-3 py-1 text-sm font-semibold text-[#2e75ba]">
                    {p.priority}: {p.count}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs uppercase text-[#2e75ba] font-semibold">Por área</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.byArea?.map((a) => (
                  <span key={a.area} className="rounded-full bg-[#4aa59c]/10 px-3 py-1 text-sm font-semibold text-[#1f6f68]">
                    {a.area}: {a.count}
                  </span>
                ))}
              </div>
            </div>
            <div className={cardStyle}>
              <p className="text-xs uppercase text-[#2e75ba] font-semibold">Top pruebas</p>
              <table className="mt-2 w-full text-sm text-slate-700">
                <thead>
                  <tr className="text-xs uppercase text-slate-500">
                    <th className="py-1 text-left">Prueba</th>
                    <th className="py-1 text-right">Conteo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topTests?.map((t) => (
                    <tr key={t.name} className="border-t border-[#eef3fb]">
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-right font-semibold text-[#163d66]">{t.count}</td>
                    </tr>
                  ))}
                  {summary.topTests?.length === 0 && (
                    <tr>
                      <td className="py-2 text-sm text-slate-500" colSpan={2}>
                        Sin datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</div>}
    </div>
  );
}
