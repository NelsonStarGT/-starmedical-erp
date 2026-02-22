"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Benefit = {
  id: string;
  kind: string;
  targetType: string;
  targetId?: string | null;
  categoryId?: string | null;
  discountPercent?: string | number | null;
  includedQty?: string | number | null;
  frequency: string;
  resetEveryDays?: number | null;
  branchScope: string;
  actionOnExceed: string;
  active: boolean;
};

type Plan = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  description?: string | null;
  priceMonthly: string | number;
  priceAnnual: string | number;
  currency: string;
  maxDependents?: number | null;
  MembershipBenefit: Benefit[];
};

const API_BASE = "/api/memberships";
const frequencyToLabel: Record<string, string> = { MONTHLY: "1m", QUARTERLY: "3m", SEMIANNUAL: "6m", ANNUAL: "12m" };
const durationOrder = ["1m", "3m", "6m", "12m"];

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Error ${res.status} on ${url}`);
  return json;
}

const currency = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 });

export default function MembresiasPlanesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planStats, setPlanStats] = useState<Record<string, { actives: number; renewals30: number }>>({});
  const [planDurations, setPlanDurations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  useEffect(() => {
    safeFetchJson(`${API_BASE}/plans`, { cache: "no-store" })
      .then((json) => {
        setPlans(json.data.plans || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setPlans([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    safeFetchJson(`${API_BASE}/dashboard`, { cache: "no-store" })
      .then((json) => {
        const stats: Record<string, { actives: number; renewals30: number }> = {};
        (json.data.planSummary || []).forEach((row: any) => {
          stats[row.id] = { actives: row.actives, renewals30: row.renewals30 };
        });
        const map = new Map<string, Set<string>>();
        (json.data.contracts || []).forEach((contract: any) => {
          const label = frequencyToLabel[contract.billingFrequency];
          if (!label) return;
          if (!map.has(contract.planId)) map.set(contract.planId, new Set());
          map.get(contract.planId)?.add(label);
        });
        const durations: Record<string, string> = {};
        map.forEach((set, planId) => {
          const ordered = Array.from(set).sort((a, b) => durationOrder.indexOf(a) - durationOrder.indexOf(b));
          durations[planId] = ordered.join(" / ");
        });
        setPlanDurations(durations);
        setPlanStats(stats);
      })
      .catch(() => {
        setPlanStats({});
      });
  }, []);

  const toggleActive = async (plan: Plan, activeCount: number) => {
    if (plan.active && activeCount > 0) {
      setError("No se puede desactivar un plan con membresías activas.");
      return;
    }
    setUpdatingPlanId(plan.id);
    setMessage(null);
    setError(null);
    try {
      const json = await safeFetchJson(`${API_BASE}/plans/${plan.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !plan.active })
      });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: json.data.active } : p)));
      setMessage(!plan.active ? "Plan activado" : "Plan desactivado");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingPlanId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Planes de membresía</h1>
          <p className="text-sm text-slate-600">Define la oferta comercial y los beneficios reales de cada plan.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando planes…</p>}
      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{message}</p>}
      {info && <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{info}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const segment = plan.type === "EMPRESARIAL" ? "Empresa" : "Persona";
          const activeCount = planStats[plan.id]?.actives ?? 0;
          const renewals30 = planStats[plan.id]?.renewals30 ?? 0;
          const duration = planDurations[plan.id] || "1m / 12m";
          return (
            <Card key={plan.id} className="h-full flex flex-col">
              <CardHeader className="flex items-start justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-xs text-slate-500">Tipo: {plan.type}</p>
                  <p className="text-xs text-slate-500">Segmento permitido: {segment}</p>
                  <p className="text-xs text-slate-500">Duración: {duration}</p>
                </div>
                <Badge variant={plan.active ? "success" : "neutral"}>{plan.active ? "Activo" : "Inactivo"}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">Descripción comercial</p>
                  <p className="text-xs text-slate-500">
                    {plan.description || "Sin descripción comercial. Úsala para PDFs o landing de venta."}
                  </p>
                </div>
                <p className="text-sm text-slate-700">
                  Mensual: {currency.format(Number(plan.priceMonthly))} · Anual: {currency.format(Number(plan.priceAnnual))}
                </p>
                <div className="text-xs text-slate-500">Membresías activas: {activeCount} · Renovaciones 30d: {renewals30}</div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Beneficios estructurados</p>
                  {plan.MembershipBenefit.length === 0 && <p className="text-xs text-slate-500">Sin beneficios configurados.</p>}
                  {plan.MembershipBenefit.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1 pr-2">Tipo</th>
                            <th className="py-1 pr-2">Límite</th>
                            <th className="py-1 pr-2">Frecuencia</th>
                            <th className="py-1 pr-2">Aplica a</th>
                            <th className="py-1 pr-2">Grupo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.MembershipBenefit.map((benefit) => (
                            <tr key={benefit.id} className="border-t border-slate-100">
                              <td className="py-1 pr-2 text-slate-900 font-semibold">{benefit.kind}</td>
                              <td className="py-1 pr-2">{benefitLimitLabel(benefit)}</td>
                              <td className="py-1 pr-2">
                                {benefit.frequency}
                                {benefit.resetEveryDays ? ` · Reinicia ${benefit.resetEveryDays}d` : ""}
                              </td>
                              <td className="py-1 pr-2">{benefit.targetType}</td>
                              <td className="py-1 pr-2">{benefit.branchScope || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Acciones</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setInfo("Edición de plan disponible en el flujo comercial (pendiente).")}
                    >
                      Editar plan
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setInfo("Duplicar plan requiere confirmar precios y beneficios.")}
                    >
                      Duplicar plan
                    </button>
                    <button
                      className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 font-semibold text-brand-navy hover:bg-brand-primary/15 disabled:opacity-50"
                      onClick={() => toggleActive(plan, activeCount)}
                      disabled={updatingPlanId === plan.id || (plan.active && activeCount > 0)}
                    >
                      {updatingPlanId === plan.id ? "Guardando..." : plan.active ? "Desactivar plan" : "Activar plan"}
                    </button>
                  </div>
                  {plan.active && activeCount > 0 && (
                    <p className="text-[11px] text-amber-700">No puedes desactivar mientras existan membresías activas.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function benefitLimitLabel(benefit: Benefit) {
  if (benefit.includedQty) return `Incluye ${benefit.includedQty}`;
  if (benefit.discountPercent) return `${benefit.discountPercent}%`;
  return "—";
}
