"use client";

import { useEffect, useState } from "react";
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

export default function MembershipsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DashboardResponse["data"]["cards"] | null>(null);
  const [categories, setCategories] = useState<DashboardResponse["data"]["categories"]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/subscriptions/memberships/dashboard", { cache: "no-store" });
        const json: DashboardResponse = await res.json();
        if (!res.ok) throw new Error((json as any)?.error || "No se pudo cargar dashboard");
        if (!mounted) return;
        setCards(json.data.cards);
        setCategories(json.data.categories || []);
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

  return (
    <MembershipsShell
      title="Membresías · Dashboard"
      description="KPIs operativos por segmento y categoría. Cobranza se gestiona en Facturación/Finanzas."
    >
      {loading ? <p className="text-xs text-slate-500">Cargando dashboard...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

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
