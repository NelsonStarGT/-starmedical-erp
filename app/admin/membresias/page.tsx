"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { SideDrawer } from "@/components/memberships/SideDrawer";
import { money } from "@/app/admin/suscripciones/membresias/_lib";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  type: string;
  segment: "B2C" | "B2B";
  active: boolean;
  imageUrl?: string | null;
  priceMonthly: number;
  priceAnnual: number;
  currency?: string;
  category?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  MembershipPlanCategory?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  durationPreset?: {
    id: string;
    name: string;
    days: number;
  } | null;
  MembershipDurationPreset?: {
    id: string;
    name: string;
    days: number;
  } | null;
  customDurationDays?: number | null;
  benefits?: Array<{
    id: string;
    benefitId?: string;
    quantity?: number | null;
    isUnlimited?: boolean;
    benefitCatalog?: {
      id: string;
      title: string;
      serviceType: string;
    } | null;
  }>;
  MembershipPlanBenefit?: Array<{
    id: string;
    benefitId?: string;
    quantity?: number | null;
    isUnlimited?: boolean;
    MembershipBenefitCatalog?: {
      id: string;
      title: string;
      serviceType: string;
    } | null;
  }>;
};

function resolveCategory(plan: PlanRow) {
  return plan.category || plan.MembershipPlanCategory || null;
}

function resolveDuration(plan: PlanRow) {
  return plan.durationPreset || plan.MembershipDurationPreset || null;
}

function resolveBenefits(plan: PlanRow) {
  if (Array.isArray(plan.benefits) && plan.benefits.length > 0) {
    return plan.benefits.map((item) => ({
      ...item,
      benefitId: item.benefitId || item.id
    }));
  }
  if (Array.isArray(plan.MembershipPlanBenefit) && plan.MembershipPlanBenefit.length > 0) {
    return plan.MembershipPlanBenefit.map((item) => ({
      id: item.id,
      benefitId: item.benefitId || item.id,
      quantity: item.quantity,
      isUnlimited: item.isUnlimited,
      benefitCatalog: item.MembershipBenefitCatalog || null
    }));
  }
  return [];
}

function inferProductModel(plan: PlanRow) {
  const text = `${plan.description || ""} ${plan.type || ""}`.toLowerCase();
  if (text.includes("prepago") || text.includes("gift")) return "Prepago";
  return "Recurrente";
}

export default function MembershipCatalogPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRow | null>(null);

  const hasPlans = plans.length > 0;

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, configRes] = await Promise.all([
        fetch("/api/subscriptions/memberships/plans?active=true", { cache: "no-store" }),
        fetch("/api/subscriptions/memberships/config", { cache: "no-store" })
      ]);
      const plansJson = await plansRes.json();
      const configJson = await configRes.json();
      if (!plansRes.ok) throw new Error(plansJson?.error || "No se pudo cargar catálogo");
      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar permisos");
      setPlans(Array.isArray(plansJson?.data) ? plansJson.data : []);
      setCanAdmin(Boolean(configJson?.meta?.canAdmin));
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  async function duplicatePlan(plan: PlanRow) {
    try {
      setBusyId(plan.id);
      const category = resolveCategory(plan);
      const duration = resolveDuration(plan);
      const res = await fetch("/api/subscriptions/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${plan.name} (copia)`,
          slug: `${plan.slug}-copy-${Date.now()}`,
          description: plan.description || null,
          type: plan.type,
          segment: plan.segment,
          categoryId: category?.id || null,
          durationPresetId: duration?.id || null,
          customDurationDays: plan.customDurationDays ?? null,
          imageUrl: plan.imageUrl || null,
          active: false,
          priceMonthly: plan.priceMonthly,
          priceAnnual: plan.priceAnnual,
          currency: plan.currency || "GTQ",
          benefits: resolveBenefits(plan).map((item) => ({
            benefitId: item.benefitId || item.id,
            quantity: item.quantity ?? null,
            isUnlimited: Boolean(item.isUnlimited),
            notes: null
          }))
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo duplicar plan");
      await loadPlans();
    } catch (err: any) {
      setError(err?.message || "No se pudo duplicar plan");
    } finally {
      setBusyId(null);
    }
  }

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  return (
    <MembershipsShell
      title="Membresías · Catálogo"
      description="Oferta comercial vendible para titulares individuales y corporativos."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/suscripciones/membresias/afiliaciones/pacientes?enroll=1"
            className={`${canAdmin ? "border border-slate-300 bg-white text-slate-700 hover:border-[#4aadf5]" : "bg-[#4aa59c] text-white hover:bg-[#4aadf5]"} rounded-lg px-3 py-2 text-xs font-semibold transition`}
          >
            Afiliar
          </Link>
          {canAdmin ? (
            <>
              <Link
                href="/admin/suscripciones/membresias/configuracion"
                className="rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
              >
                Configurar base
              </Link>
              <Link
                href="/admin/suscripciones/membresias/planes/nuevo"
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
              >
                Crear producto
              </Link>
            </>
          ) : null}
        </div>
      }
    >
      {loading ? <p className="text-xs text-slate-500">Cargando catálogo...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && !hasPlans ? (
        <EmptyState
          title="No hay planes publicados"
          description="Inicia con la configuración base y crea el primer plan para habilitar afiliaciones."
          secondaryCtaHref="/admin/suscripciones/membresias/configuracion"
          secondaryCtaLabel="Configurar base"
          ctaHref="/admin/suscripciones/membresias/planes/nuevo"
          ctaLabel="Crear primer producto"
        />
      ) : null}

      {hasPlans ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPlans.map((plan) => {
            const category = resolveCategory(plan);
            const duration = resolveDuration(plan);
            const benefits = resolveBenefits(plan);
            const productModel = inferProductModel(plan);

            return (
              <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-[#F8FAFC]">
                  {plan.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={plan.imageUrl} alt={plan.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">1080 x 1080</div>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">{plan.segment}</span>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">{productModel}</span>
                    {category ? (
                      <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">{category.name}</span>
                    ) : null}
                  </div>
                  <h2 className="text-base font-semibold text-[#2e75ba]">{plan.name}</h2>
                  <p className="text-xs text-slate-600">
                    {duration ? `${duration.name} (${duration.days} días)` : plan.customDurationDays ? `${plan.customDurationDays} días` : "Duración por configurar"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{money(plan.priceMonthly, plan.currency || "GTQ")} / mes</p>
                  <p className="text-[11px] text-slate-500">Anual: {money(plan.priceAnnual, plan.currency || "GTQ")}</p>
                </div>

                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {benefits.slice(0, 3).map((benefit) => (
                    <li key={benefit.id} className="truncate">
                      • {benefit.benefitCatalog?.title || "Beneficio"}{" "}
                      {benefit.isUnlimited ? "(ilimitado)" : benefit.quantity ? `(x${benefit.quantity})` : ""}
                    </li>
                  ))}
                  {benefits.length === 0 ? <li>• Beneficios pendientes de configuración.</li> : null}
                </ul>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    Ver detalle
                  </button>
                  <Link
                    href="/admin/suscripciones/membresias/afiliaciones/pacientes?enroll=1"
                    className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                  >
                    Afiliar
                  </Link>
                  {plan.imageUrl ? (
                    <Link
                      href={plan.imageUrl}
                      target="_blank"
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Ver afiche
                    </Link>
                  ) : (
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                      Afiche pendiente
                    </span>
                  )}
                  {canAdmin ? (
                    <>
                      <Link
                        href={`/admin/suscripciones/membresias/planes/${plan.id}`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => void duplicatePlan(plan)}
                        disabled={busyId === plan.id}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                      >
                        {busyId === plan.id ? "Duplicando..." : "Duplicar"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <SideDrawer
        open={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        title={selectedPlan?.name || "Detalle de plan"}
        subtitle="Detalle comercial para operación y afiliación."
      >
        {selectedPlan ? (
          <div className="space-y-3">
            {selectedPlan.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPlan.imageUrl} alt={selectedPlan.name} className="h-52 w-full rounded-xl border border-slate-200 object-cover" />
            ) : null}
            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Resumen</p>
              <p className="mt-2 text-xs text-slate-700">Tipo de producto: {inferProductModel(selectedPlan)}</p>
              <p className="text-xs text-slate-700">Segmento: {selectedPlan.segment}</p>
              <p className="text-xs text-slate-700">
                Categoría: {resolveCategory(selectedPlan)?.name || "Sin categoría"}
              </p>
              <p className="text-xs text-slate-700">
                Duración:{" "}
                {resolveDuration(selectedPlan)
                  ? `${resolveDuration(selectedPlan)?.name} (${resolveDuration(selectedPlan)?.days} días)`
                  : selectedPlan.customDurationDays
                    ? `${selectedPlan.customDurationDays} días`
                    : "Pendiente"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {money(selectedPlan.priceMonthly, selectedPlan.currency || "GTQ")} / mes
              </p>
              <p className="text-xs text-slate-500">Anual: {money(selectedPlan.priceAnnual, selectedPlan.currency || "GTQ")}</p>
              {selectedPlan.description ? <p className="mt-2 text-xs text-slate-600">{selectedPlan.description}</p> : null}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Beneficios</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {resolveBenefits(selectedPlan).map((benefit) => (
                  <li key={benefit.id}>
                    • {benefit.benefitCatalog?.title || "Beneficio"}{" "}
                    {benefit.isUnlimited ? "(ilimitado)" : benefit.quantity ? `(x${benefit.quantity})` : ""}
                  </li>
                ))}
                {resolveBenefits(selectedPlan).length === 0 ? <li>Sin beneficios configurados.</li> : null}
              </ul>
            </section>
          </div>
        ) : null}
      </SideDrawer>
    </MembershipsShell>
  );
}
