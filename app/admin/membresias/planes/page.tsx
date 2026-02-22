"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { money } from "@/app/admin/membresias/_lib";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  segment: "B2C" | "B2B";
  active: boolean;
  imageUrl?: string | null;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  MembershipPlanCategory?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  activeContracts: number;
};

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memberships/plans", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar planes");
      setPlans(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar planes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function togglePlanStatus(plan: PlanRow) {
    try {
      setBusyId(plan.id);
      const res = await fetch(`/api/memberships/plans/${plan.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !plan.active })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadPlans();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicatePlan(plan: PlanRow) {
    try {
      setBusyId(plan.id);
      const res = await fetch("/api/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${plan.name} (copia)`,
          slug: `${plan.slug}-copia-${Date.now()}`,
          description: null,
          type: plan.type,
          segment: plan.segment,
          categoryId: plan.MembershipPlanCategory?.id ?? null,
          imageUrl: plan.imageUrl ?? null,
          active: false,
          priceMonthly: plan.priceMonthly,
          priceAnnual: plan.priceAnnual,
          currency: plan.currency,
          maxDependents: null
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

  return (
    <MembershipsShell
      title="Planes · Catálogo"
      description="Oferta comercial de membresías por segmento y categoría."
      actions={
        <Link
          href="/admin/membresias/planes/nuevo"
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          Crear plan
        </Link>
      }
    >
      {loading ? <p className="text-xs text-slate-500">Cargando planes...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && plans.length === 0 ? (
        <EmptyState
          title="No hay planes cargados"
          description="Configura categorías y crea el primer plan para habilitar contratos."
          ctaHref="/admin/membresias/planes/nuevo"
          ctaLabel="Crear primer plan"
        />
      ) : null}

      {plans.length > 0 ? (
        <CompactTable columns={["Plan", "Segmento", "Categoría", "Precio", "Estado", "Acciones"]}>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-slate-100">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {plan.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={plan.imageUrl} alt={plan.name} className="h-10 w-10 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400">
                      IMG
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{plan.name}</p>
                    <p className="text-[11px] text-slate-500">{plan.type}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-slate-700">{plan.segment}</td>
              <td className="px-3 py-2 text-slate-700">{plan.MembershipPlanCategory?.name || "Sin categoría"}</td>
              <td className="px-3 py-2 text-slate-900">
                <p>{money(plan.priceMonthly, plan.currency)}</p>
                <p className="text-[11px] text-slate-500">Anual: {money(plan.priceAnnual, plan.currency)}</p>
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${plan.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                  {plan.active ? "ACTIVO" : "INACTIVO"}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">Contratos activos: {plan.activeContracts}</p>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/admin/membresias/planes/${plan.id}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicatePlan(plan)}
                    disabled={busyId === plan.id}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePlanStatus(plan)}
                    disabled={busyId === plan.id}
                    className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c] disabled:opacity-60"
                  >
                    {plan.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </CompactTable>
      ) : null}
    </MembershipsShell>
  );
}
