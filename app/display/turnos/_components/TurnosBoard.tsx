"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicTurnosArea, PublicTurnosResponse } from "@/lib/reception/public-turnos.types";

const AREA_LABELS: Record<string, string> = {
  CONSULTATION: "Consulta",
  LAB: "Laboratorio",
  XRAY: "Rayos X",
  ULTRASOUND: "Ultrasonido",
  URGENT_CARE: "Urgencias"
};

const BRAND = {
  header: "#2e75ba",
  highlight: "#4aa59c",
  accent: "#4aadf5",
  background: "#F8FAFC"
};

function formatTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function AreaSection({ area }: { area: PublicTurnosArea }) {
  const calling = area.calling;
  const nowServing = area.nowServing;
  const waiting = area.waiting;

  return (
    <section
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
      style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)" }}
    >
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: BRAND.header }}
          />
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {AREA_LABELS[area.area] ?? area.area}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Turnos
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Llamando</p>
          <div className="mt-3 space-y-2">
            {calling.length === 0 ? (
              <p className="text-sm text-slate-400">Sin llamados</p>
            ) : (
              calling.map((item) => (
                <div
                  key={`${area.area}-calling-${item.ticketCode}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                >
                  <span className="text-2xl font-semibold text-emerald-700">{item.ticketCode}</span>
                  <span className="text-xs font-medium text-emerald-700">
                    {formatTime(item.calledAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">En atención</p>
          <div className="mt-3 space-y-2">
            {nowServing.length === 0 ? (
              <p className="text-sm text-slate-400">Sin atención activa</p>
            ) : (
              nowServing.map((item) => (
                <div
                  key={`${area.area}-serving-${item.ticketCode}`}
                  className="flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50 px-3 py-2"
                >
                  <span className="text-2xl font-semibold text-sky-700">{item.ticketCode}</span>
                  <span className="text-xs font-medium text-sky-700">En sala</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">En espera</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {waiting.length === 0 ? (
              <p className="text-sm text-slate-400">Sin espera</p>
            ) : (
              waiting.map((item) => (
                <div
                  key={`${area.area}-waiting-${item.ticketCode}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-lg font-semibold text-slate-700"
                >
                  {item.ticketCode}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TurnosBoard({ siteId, area }: { siteId: string; area?: string }) {
  const [data, setData] = useState<PublicTurnosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ siteId });
    if (area) params.set("area", area.toUpperCase());
    params.set("limit", "20");
    return params.toString();
  }, [siteId, area]);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);
      try {
        const res = await fetch(`/api/public/turnos?${query}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("No se pudo cargar los turnos");
        }
        const json = (await res.json()) as PublicTurnosResponse;
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query]
  );

  useEffect(() => {
    fetchData(false);
    const timer = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const generatedAt = data?.generatedAt ? formatTime(data.generatedAt) : "";

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at top, ${BRAND.accent}14, transparent 45%), ${BRAND.background}`
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/80 px-6 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Pantalla pública</p>
              <h1 className="text-3xl font-semibold text-slate-900">Turnos en tiempo real</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {refreshing && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Actualizando
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {generatedAt ? `Actualizado ${generatedAt}` : "Sin datos"}
              </span>
            </div>
          </div>
        </header>

        {loading && !data ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500">
            Cargando turnos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {data?.areas.map((areaItem) => (
              <AreaSection key={areaItem.area} area={areaItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
