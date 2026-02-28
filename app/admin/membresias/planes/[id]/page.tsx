"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { PlanEditorForm } from "@/components/memberships/PlanEditorForm";

type PlanDetail = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  type: "INDIVIDUAL" | "FAMILIAR" | "EMPRESARIAL";
  segment: "B2C" | "B2B";
  categoryId?: string | null;
  durationPresetId?: string | null;
  customDurationDays?: number | null;
  imageUrl?: string | null;
  active: boolean;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  maxDependents?: number | null;
  MembershipPlanBenefit?: Array<{
    benefitId: string;
    quantity?: number | null;
    isUnlimited?: boolean;
    notes?: string | null;
  }>;
};

export default function MembershipPlanEditPage() {
  const params = useParams<{ id: string }>();
  const planId = String(params?.id || "");
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      setError("Plan inválido");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/memberships/plans/${planId}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar plan");
        if (mounted) setPlan(json.data as PlanDetail);
      } catch (err: any) {
        if (mounted) setError(err?.message || "No se pudo cargar plan");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [planId]);

  return (
    <MembershipsShell title="Planes · Editar" description="Actualiza plan sin romper contratos activos.">
      {loading ? <p className="text-xs text-slate-500">Cargando plan...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {plan ? (
        <PlanEditorForm
          mode="edit"
          planId={planId}
          initialData={{
            ...plan,
            benefits: Array.isArray(plan.MembershipPlanBenefit)
              ? plan.MembershipPlanBenefit.map((benefit) => ({
                  benefitId: benefit.benefitId,
                  quantity: benefit.quantity ?? null,
                  isUnlimited: benefit.isUnlimited ?? false,
                  notes: benefit.notes ?? null
                }))
              : []
          }}
        />
      ) : null}
    </MembershipsShell>
  );
}
