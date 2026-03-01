"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { CompactTable } from "@/components/memberships/CompactTable";
import { EmptyState } from "@/components/memberships/EmptyState";
import { money } from "@/app/admin/suscripciones/membresias/_lib";

type DashboardResponse = {
  data: {
    cards: {
      plansActive: number;
      contractsActive: number;
      renewals7: number;
      renewals15: number;
      renewals30: number;
      contractsAtRisk: number;
      estimatedMrr: number;
      b2cActive: number;
      b2bActive: number;
      b2cMrr: number;
      b2bMrr: number;
    };
    categories: Array<{
      categoryId: string | null;
      categoryName: string;
      segment: "B2C" | "B2B";
      activeContracts: number;
      renewals30d: number;
      mrr: number;
    }>;
  };
};

const baseCardClass = "rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm";
const setupCardClass = "rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm";

export default function MembershipsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DashboardResponse["data"]["cards"] | null>(null);
  const [categories, setCategories] = useState<DashboardResponse["data"]["categories"]>([]);
  const [setupSummary, setSetupSummary] = useState({
    categoriesCount: 0,
    plansCount: 0
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [dashboardRes, categoriesRes, plansRes] = await Promise.all([
          fetch("/api/subscriptions/memberships/dashboard", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/plan-categories?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/plans", { cache: "no-store" })
        ]);

        const dashboardJson: DashboardResponse = await dashboardRes.json();
        const categoriesJson = await categoriesRes.json();
        const plansJson = await plansRes.json();

        if (!dashboardRes.ok) throw new Error((dashboardJson as any)?.error || "No se pudo cargar dashboard");

        if (!mounted) return;
        setCards(dashboardJson.data.cards);
        setCategories(dashboardJson.data.categories || []);
        setSetupSummary({
          categoriesCount: categoriesRes.ok && Array.isArray(categoriesJson?.data) ? categoriesJson.data.length : 0,
          plansCount: plansRes.ok && Array.isArray(plansJson?.data) ? plansJson.data.length : 0
        });
      } catch (err: any) {
        if (mounted) setError(err?.message || "Error cargando dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const showSetupWizard = !loading && (setupSummary.categoriesCount === 0 || setupSummary.plansCount === 0);

  return (
    <MembershipsShell
      title="Membresías · Dashboard"
      description="KPIs operativos por segmento y categoría. Cobranza se gestiona en Facturación/Finanzas."
    >
      {loading ? <p className="text-xs text-slate-500">Cargando dashboard...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {showSetupWizard ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-[#2e75ba]">Setup inicial de membresías</h2>
            <p className="mt-1 text-xs text-slate-600">
              Completa la base operativa para habilitar afiliaciones, renovaciones y seguimiento.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <article className={setupCardClass}>
              <p className="text-xs font-semibold text-[#2e75ba]">1) Crear categorías</p>
              <p className="mt-1 text-xs text-slate-600">Define tipos B2C/B2B para ordenar la oferta.</p>
              <Link
                href="/admin/suscripciones/membresias/configuracion?tab=catalogos"
                className="mt-3 inline-flex rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
              >
                Ir a categorías
              </Link>
            </article>
            <article className={setupCardClass}>
              <p className="text-xs font-semibold text-[#2e75ba]">2) Crear duraciones</p>
              <p className="mt-1 text-xs text-slate-600">Carga presets de vigencia para estandarizar planes.</p>
              <Link
                href="/admin/suscripciones/membresias/configuracion?tab=duraciones"
                className="mt-3 inline-flex rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
              >
                Configurar duraciones
              </Link>
            </article>
            <article className={setupCardClass}>
              <p className="text-xs font-semibold text-[#2e75ba]">3) Crear primer plan</p>
              <p className="mt-1 text-xs text-slate-600">Publica la oferta inicial para empezar afiliaciones.</p>
              <Link
                href="/admin/suscripciones/membresias/planes/nuevo"
                className="mt-3 inline-flex rounded-lg bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
              >
                Crear plan
              </Link>
            </article>
          </div>
        </section>
      ) : null}

      {cards ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Planes activos</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.plansActive}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Contratos activos</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.contractsActive}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">MRR estimado</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{money(cards.estimatedMrr)}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Contratos en riesgo</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.contractsAtRisk}</p>
            </article>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Renovaciones 7 días</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.renewals7}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Renovaciones 15 días</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.renewals15}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Renovaciones 30 días</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{cards.renewals30}</p>
            </article>
            <article className={baseCardClass}>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Segmento B2C/B2B activos</p>
              <p className="mt-1 text-xl font-semibold text-[#2e75ba]">
                {cards.b2cActive} / {cards.b2bActive}
              </p>
              <p className="text-[11px] text-slate-500">MRR: {money(cards.b2cMrr)} / {money(cards.b2bMrr)}</p>
            </article>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">KPIs por categoría</h2>
            {categories.length === 0 ? (
              <EmptyState
                title="Sin KPIs por categoría"
                description="Crea categorías y planes para habilitar esta vista analítica."
                ctaHref="/admin/suscripciones/membresias/configuracion"
                ctaLabel="Configurar categorías"
              />
            ) : (
              <CompactTable columns={["Categoría", "Segmento", "Activos", "Renovaciones 30d", "MRR"]}>
                {categories.map((row) => (
                  <tr key={`${row.segment}:${row.categoryId || "none"}`} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{row.categoryName}</td>
                    <td className="px-3 py-2 text-slate-700">{row.segment}</td>
                    <td className="px-3 py-2 text-slate-700">{row.activeContracts}</td>
                    <td className="px-3 py-2 text-slate-700">{row.renewals30d}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{money(row.mrr)}</td>
                  </tr>
                ))}
              </CompactTable>
            )}
          </section>
        </>
      ) : null}
    </MembershipsShell>
  );
}
