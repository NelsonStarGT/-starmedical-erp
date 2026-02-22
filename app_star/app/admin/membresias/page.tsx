"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const API_BASE = "/api/memberships";

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Error ${res.status} on ${url}`);
  }
  return json;
}

type DashboardData = {
  summary: {
    planesActivos: number;
    contratosActivos: number;
    empresasActivas: number;
    personasActivas: number;
    renovaciones7: number;
    renovaciones15: number;
    renovaciones30: number;
    ingresoMensual: number;
    saldoPendiente: number;
  };
  alerts: {
    vencidos: number;
    suspendidos: number;
    pendientesPago: number;
    proximos: number;
  };
  renewals: Array<{
    id: string;
    code: string;
    ownerName: string;
    planName: string;
    status: string;
    nextRenewAt: string;
    branchName: string | null;
    balance: number;
  }>;
  contracts: Array<{
    id: string;
    planId: string;
    ownerType: "PERSON" | "COMPANY";
    billingFrequency: string;
    code: string;
    ownerName: string;
    planName: string;
    status: string;
    nextRenewAt: string | null;
    branchName: string | null;
    balance: number;
  }>;
  plans: Array<{ id: string; name: string; type: string; active: boolean; priceMonthly: number; priceAnnual: number; maxDependents: number | null }>;
  planSummary?: Array<{ id: string; name: string; type: string; actives: number; mrr: number; renewals30: number }>;
};

const statusTone: Record<string, "success" | "info" | "warning" | "neutral"> = {
  ACTIVO: "success",
  PENDIENTE: "info",
  VENCIDO: "warning",
  SUSPENDIDO: "neutral",
  CANCELADO: "neutral"
};

const currency = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 });
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short" }) : "—");
const frequencyToLabel: Record<string, string> = { MONTHLY: "1m", QUARTERLY: "3m", SEMIANNUAL: "6m", ANNUAL: "12m" };
const durationOrder = ["1m", "3m", "6m", "12m"];

export default function MembresiasDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    safeFetchJson(`${API_BASE}/dashboard`, { cache: "no-store" })
      .then((json) => {
        if (!active) return;
        setData(json.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setData(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => data?.summary || null, [data]);
  const alerts = data?.alerts || { vencidos: 0, suspendidos: 0, pendientesPago: 0, proximos: 0 };
  const planRows = data?.planSummary || [];
  const planDurations = useMemo(() => {
    const map = new Map<string, Set<string>>();
    data?.contracts?.forEach((contract) => {
      const label = frequencyToLabel[contract.billingFrequency] || null;
      if (!label) return;
      if (!map.has(contract.planId)) map.set(contract.planId, new Set());
      map.get(contract.planId)?.add(label);
    });
    return map;
  }, [data?.contracts]);

  const isEmpty =
    totals &&
    [totals.personasActivas, totals.empresasActivas, totals.renovaciones30, totals.saldoPendiente, alerts.pendientesPago, alerts.proximos].every(
      (value) => !value
    ) &&
    planRows.length === 0;

  const planDurationLabel = (planId: string) => {
    const set = planDurations.get(planId);
    if (set && set.size > 0) {
      const ordered = Array.from(set).sort((a, b) => durationOrder.indexOf(a) - durationOrder.indexOf(b));
      return ordered.join(" / ");
    }
    const plan = data?.plans?.find((p) => p.id === planId);
    if (plan) {
      const base = plan.priceAnnual > 0 ? ["1m", "12m"] : ["1m"];
      return base.join(" / ");
    }
    return "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard de membresías</h1>
          <p className="text-sm text-slate-600">Centro de mando: qué hay, qué falta y qué hacer ahora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/membresias/contratos"
            className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-primary/15 transition"
          >
            Ir a gestión
          </Link>
          <Link
            href="/admin/membresias/planes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Ver planes
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-600">Cargando métricas de membresías…</p>}
      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}
      {data && totals && isEmpty && (
        <div className="rounded-2xl border border-dashed border-brand-primary/30 bg-brand-primary/5 px-4 py-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Aún no hay membresías activas</p>
          <p className="text-slate-600">Crea un plan y registra la primera membresía para activar el módulo.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/membresias/planes"
              className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary/90 transition"
            >
              Crear primer plan
            </Link>
            <Link
              href="/admin/membresias/contratos"
              className="rounded-xl border border-brand-primary/40 px-4 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-primary/10 transition"
            >
              Crear primera membresía
            </Link>
          </div>
        </div>
      )}

      {data && totals && (
        <>
          <section aria-label="KPIs" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Membresías activas (Personas)" value={totals.personasActivas} tone="primary" helper="Titulares y dependientes en regla" />
            <KpiCard label="Membresías activas (Empresas)" value={totals.empresasActivas} tone="primary" helper="Cuentas corporativas activas" />
            <KpiCard
              label="Renovaciones 7 / 15 / 30"
              value={`${totals.renovaciones7} / ${totals.renovaciones15} / ${totals.renovaciones30}`}
              tone="accent"
              helper="Agendar llamadas y recordatorios"
            />
            <KpiCard
              label="Morosidad (saldo pendiente)"
              value={currency.format(totals.saldoPendiente)}
              tone="warning"
              helper="Informativo: la cobranza vive en Caja/Facturación"
            />
          </section>

          <section aria-label="Operación inmediata" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Panel operativo</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ActionCard label="Por cobrar" value={alerts.pendientesPago} href="/admin/membresias/contratos?status=PENDIENTE" tone="info" />
                <ActionCard label="Por vencer (≤15d)" value={alerts.proximos} href="/admin/membresias/contratos?range=15" tone="warning" />
                <ActionCard label="Suspendidas" value={alerts.suspendidos} href="/admin/membresias/contratos?status=SUSPENDIDO" tone="neutral" />
                <ActionCard label="Vencidas" value={alerts.vencidos} href="/admin/membresias/contratos?status=VENCIDO" tone="warning" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximas renovaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {data.renewals.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.ownerName}</p>
                        <p className="text-xs text-slate-500">
                          {item.planName} · {item.branchName || "Sin sucursal"}
                        </p>
                      </div>
                      <Badge variant={statusTone[item.status] || "neutral"}>{item.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Renueva: <span className="font-semibold text-slate-900">{formatDate(item.nextRenewAt)}</span>
                    </p>
                    {item.balance > 0 && <p className="text-xs text-amber-600 mt-1">Saldo: {currency.format(item.balance)}</p>}
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link href={`/admin/membresias/contratos?code=${encodeURIComponent(item.code)}`} className="font-semibold text-brand-navy hover:underline">
                        Abrir en gestión
                      </Link>
                      <span className="text-slate-400">·</span>
                      <Link href="/admin/membresias/impresion" className="text-slate-600 hover:underline">
                        Imprimir carnet
                      </Link>
                    </div>
                  </div>
                ))}
                {data.renewals.length === 0 && <p className="text-sm text-slate-500">Sin renovaciones programadas.</p>}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Resumen por plan">
            <Card>
              <CardHeader>
                <CardTitle>Resumen por plan</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Activas</th>
                      <th className="py-2 pr-3">Duración</th>
                      <th className="py-2 pr-3">Renovaciones (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-900">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.type}</div>
                        </td>
                        <td className="py-2 pr-3">{row.actives}</td>
                        <td className="py-2 pr-3">{planDurationLabel(row.id)}</td>
                        <td className="py-2 pr-3">{row.renewals30}</td>
                      </tr>
                    ))}
                    {planRows.length === 0 && (
                      <tr>
                        <td className="py-3 text-sm text-slate-500" colSpan={4}>
                          No hay datos de planes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function ActionCard({ label, value, href, tone }: { label: string; value: number; href: string; tone: "success" | "info" | "warning" | "neutral" }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-white to-brand-primary/10 px-4 py-3 shadow-soft hover:-translate-y-[1px] hover:shadow-lg transition"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">Abrir en Gestión de membresías</p>
      </div>
      <Badge variant={tone}>{value}</Badge>
    </Link>
  );
}

function KpiCard({ label, value, tone, helper }: { label: string; value: number | string; tone: "primary" | "accent" | "warning"; helper?: string }) {
  const toneClass =
    tone === "primary"
      ? "from-[#4aa59c]/15 via-white to-white border-brand-primary/30"
      : tone === "accent"
        ? "from-[#4aadf5]/15 to-white border-[#4aadf5]/30"
        : "from-amber-50 to-white border-amber-200";
  return (
    <Card className={`border bg-gradient-to-br ${toneClass}`}>
      <CardContent className="py-5">
        <p className="text-sm text-slate-600">{label}</p>
        <p className="text-3xl font-semibold text-slate-900 mt-2">{value}</p>
        {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
      </CardContent>
    </Card>
  );
}
