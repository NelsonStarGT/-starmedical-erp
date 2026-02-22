"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Summary = {
  income?: number;
  expense?: number;
  balance?: number;
};

export default function FinanzasReportesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [legalEntityId, setLegalEntityId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = useMemo(() => {
    if (!summary) return null;
    if (summary.balance !== undefined) return summary.balance;
    return (summary.income || 0) - (summary.expense || 0);
  }, [summary]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (legalEntityId) params.set("legalEntityId", legalEntityId);
      const res = await fetch(`/api/finanzas/summary?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo obtener el resumen");
      setSummary(json?.data || {});
    } catch (err: any) {
      setError(err?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finanzas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-600">Ingresos, egresos y balance por rango de fechas.</p>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 text-sm">
          <label className="text-slate-700">
            Desde
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-slate-700">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-slate-700 md:col-span-2">
            Entidad legal (opcional)
            <input
              type="text"
              value={legalEntityId}
              onChange={(e) => setLegalEntityId(e.target.value)}
              placeholder="ID de entidad"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="md:col-span-4">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-primary/90 disabled:opacity-60"
            >
              {loading ? "Calculando..." : "Calcular"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <Metric label="Ingresos" value={summary?.income} tone="green" loading={loading} />
          <Metric label="Egresos" value={summary?.expense} tone="red" loading={loading} />
          <Metric label="Balance" value={balance ?? undefined} tone="blue" loading={loading} />
          {error && <p className="text-sm text-rose-600 md:col-span-3">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone, loading }: { label: string; value?: number; tone: "green" | "red" | "blue"; loading: boolean }) {
  const colors =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "red"
      ? "bg-rose-50 text-rose-700"
      : "bg-sky-50 text-sky-700";
  return (
    <div className={`rounded-xl border border-slate-100 p-4 ${colors}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{loading ? "…" : value ?? "—"}</p>
    </div>
  );
}
