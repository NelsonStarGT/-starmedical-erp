'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/inventario/KpiCard";
import { RankingList } from "@/components/inventario/RankingList";
import { AlertList } from "@/components/inventario/AlertList";
import { getSummaryKPIs, getProductKPIs, getServiceKPIs, getComboKPIs, getOperativeKPIs, type TimeRange } from "@/lib/inventory/kpis";

const rangeOptions: { label: string; value: TimeRange }[] = [
  { label: "Hoy", value: "hoy" },
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" }
];

export default function InventarioDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [range]);

  const summary = useMemo(() => getSummaryKPIs(range), [range]);
  const productKpis = useMemo(() => getProductKPIs(range), [range]);
  const serviceKpis = useMemo(() => getServiceKPIs(range), [range]);
  const comboKpis = useMemo(() => getComboKPIs(range), [range]);
  const operative = useMemo(() => getOperativeKPIs(range), [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard de inventario</h1>
          <p className="text-sm text-slate-500">Vista de control gerencial</p>
        </div>
        <div className="flex gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-inner">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${range === opt.value ? "bg-brand-primary text-white shadow-soft" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard title="Productos activos" value={loading ? "…" : String(summary.productosActivos)} />
        <KpiCard title="Servicios activos" value={loading ? "…" : String(summary.serviciosActivos)} />
        <KpiCard title="Combos activos" value={loading ? "…" : String(summary.combosActivos)} />
        <KpiCard title="Valor inventario" value={loading ? "…" : `Q${summary.valorInventario.toFixed(2)}`} />
        <KpiCard title="Alertas activas" value={loading ? "…" : `${summary.lowStock.length + summary.expiring.length}`} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertList
          title="Alertas de stock"
          items={loading ? [] : summary.lowStock.map((p) => ({ title: p.nombre, detail: `Stock ${p.stockActual} / Mín ${p.stockMinimo}`, tone: "warning" }))}
        />
        <AlertList
          title="Próximos a vencer (30 días)"
          items={loading ? [] : summary.expiring.map((p) => ({ title: p.nombre, detail: `Vence: ${p.fechaExpiracion}`, tone: "danger" }))}
        />
        <div className="rounded-2xl border border-[#E5E5E7] bg-white/90 p-4 shadow-soft">
          <p className="text-sm font-semibold text-slate-800 mb-2">KPIs operativos</p>
          <p className="text-xs text-slate-500">Rotación: <span className="font-semibold text-slate-900">{operative.rotacion}</span></p>
          <p className="text-xs text-slate-500">Costo mensual de consumo: <span className="font-semibold text-slate-900">Q{operative.consumoCosto.toFixed(2)}</span></p>
          <p className="text-xs text-slate-500 mt-2">Inventario por sucursal</p>
          <div className="mt-1 space-y-1 text-sm text-slate-700">
            {operative.porSucursal.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
                <span>{s.title}</span>
                <span>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <RankingList title="Mayor margen" items={loading ? [] : productKpis.topMargen} />
          <RankingList title="Menor margen" items={loading ? [] : productKpis.lowMargen} />
          <RankingList title="Mayor movimiento (salidas)" items={loading ? [] : productKpis.topMov} />
          <RankingList title="Bajo stock" items={loading ? [] : productKpis.lowStock.map((p) => ({ title: p.nombre, value: `Stock ${p.stockActual}`, hint: `Mín ${p.stockMinimo}` }))} />
          <RankingList title="Mayor valor en inventario" items={loading ? [] : productKpis.topValor} />
          <RankingList
            title="Próximos a vencer"
            items={
              loading
                ? []
                : [
                    ...productKpis.exp30.map((p) => ({ title: p.nombre, value: "≤30 días", subtitle: p.fechaExpiracion })),
                    ...productKpis.exp60.map((p) => ({ title: p.nombre, value: "≤60 días", subtitle: p.fechaExpiracion })),
                    ...productKpis.exp90.map((p) => ({ title: p.nombre, value: "≤90 días", subtitle: p.fechaExpiracion }))
                  ].slice(0, 5)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servicios</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <RankingList title="Más vendidos" items={loading ? [] : serviceKpis.topVentas} />
          <RankingList title="Mayor costo operativo" items={loading ? [] : serviceKpis.topCosto} />
          <RankingList title="Mayor margen" items={loading ? [] : serviceKpis.margenAlto} />
          <RankingList title="Menor margen" items={loading ? [] : serviceKpis.margenBajo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Combos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <RankingList title="Más vendidos" items={loading ? [] : comboKpis.topVentas} />
          <RankingList title="Mayor margen" items={loading ? [] : comboKpis.topMargen} />
          <RankingList title="Menor margen" items={loading ? [] : comboKpis.lowMargen} />
          <RankingList title="Mayor consumo de inventario" items={loading ? [] : comboKpis.topConsumo} />
        </CardContent>
      </Card>
    </div>
  );
}
