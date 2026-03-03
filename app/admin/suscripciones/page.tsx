"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Pill, RefreshCw, ShieldAlert } from "lucide-react";
import { NavPills } from "@/components/subscriptions/NavPills";
import { SectionCard } from "@/components/subscriptions/SectionCard";
import { KPIStatCard } from "@/components/subscriptions/KPIStatCard";
import { OpsListCard } from "@/components/subscriptions/OpsListCard";
import { AdminApprovalsCard } from "@/components/subscriptions/AdminApprovalsCard";
import { money } from "@/app/admin/suscripciones/membresias/_lib";

type RangeKey = "today" | "7d" | "30d" | "custom";

type MembershipCards = {
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

type PlanRow = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  createdAt?: string;
};

type ContractRow = {
  id: string;
  code: string;
  status: string;
  nextRenewAt?: string | null;
  owner?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  } | null;
  plan?: {
    name?: string | null;
  } | null;
};

type PharmacyQueueRow = {
  id: string;
  patientId: string;
  nextFillAt: string;
  items: Array<{ id: string; medicationId: string; qty: number }>;
  daysUntilNextFill?: number;
};

type PharmacyPausedRow = {
  id: string;
  patientId: string;
  updatedAt?: string;
};

type PlanCategoryRow = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
};

type DashboardState = {
  canAdmin: boolean;
  cards: MembershipCards | null;
  plans: PlanRow[];
  categories: PlanCategoryRow[];
  pendingPayments: ContractRow[];
  failedPayments: ContractRow[];
  renewals: ContractRow[];
  queue: PharmacyQueueRow[];
  paused: PharmacyPausedRow[];
};

const RANGE_DAYS: Record<Exclude<RangeKey, "custom">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30
};

function dateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function ownerLabel(contract: ContractRow) {
  const firstName = contract.owner?.firstName?.trim() || "";
  const lastName = contract.owner?.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || contract.owner?.companyName || "Titular";
}

async function fetchMaybe<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) return fallback;
    return (json?.data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function SubscriptionsDashboardPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [customDays, setCustomDays] = useState("14");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardState>({
    canAdmin: false,
    cards: null,
    plans: [],
    categories: [],
    pendingPayments: [],
    failedPayments: [],
    renewals: [],
    queue: [],
    paused: []
  });

  const windowDays = useMemo(() => {
    if (range !== "custom") return RANGE_DAYS[range];
    const parsed = Number(customDays);
    if (!Number.isFinite(parsed) || parsed < 1) return 7;
    return Math.min(90, Math.trunc(parsed));
  }, [customDays, range]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        dashboardCards,
        plans,
        categories,
        pendingPayments,
        failedPayments,
        renewals,
        queue,
        paused,
        configMeta
      ] = await Promise.all([
        fetchMaybe<{ cards: MembershipCards }>("/api/subscriptions/memberships/dashboard", { cards: {
          plansActive: 0,
          contractsActive: 0,
          renewals7: 0,
          renewals15: 0,
          renewals30: 0,
          contractsAtRisk: 0,
          estimatedMrr: 0,
          b2cActive: 0,
          b2bActive: 0,
          b2cMrr: 0,
          b2bMrr: 0
        } }),
        fetchMaybe<PlanRow[]>("/api/subscriptions/memberships/plans?active=true", []),
        fetchMaybe<PlanCategoryRow[]>("/api/subscriptions/memberships/plan-categories?active=true", []),
        fetchMaybe<ContractRow[]>("/api/subscriptions/memberships/contracts?status=PENDIENTE_PAGO&take=5", []),
        fetchMaybe<ContractRow[]>("/api/subscriptions/memberships/contracts?paymentMethod=RECURRENT&status=SUSPENDIDO&take=5", []),
        fetchMaybe<ContractRow[]>(`/api/subscriptions/memberships/contracts?renewWindowDays=${windowDays}&take=5`, []),
        fetchMaybe<PharmacyQueueRow[]>(`/api/subscriptions/pharmacy/queue?windowDays=${windowDays}`, []),
        fetchMaybe<PharmacyPausedRow[]>("/api/subscriptions/pharmacy/medication-subscriptions?status=PAUSED&take=5", []),
        fetchMaybe<{ canAdmin?: boolean }>("/api/subscriptions/memberships/config", { canAdmin: false })
      ]);

      const sortedPlans = [...plans].sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });

      setData({
        canAdmin: Boolean(configMeta?.canAdmin),
        cards: dashboardCards?.cards || null,
        plans: sortedPlans,
        categories,
        pendingPayments,
        failedPayments,
        renewals,
        queue,
        paused
      });
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el dashboard de suscripciones");
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const queueCounters = useMemo(() => {
    return data.queue.reduce(
      (acc, row) => {
        const days = Number(row.daysUntilNextFill ?? 99);
        if (days <= 0) acc.today += 1;
        if (days <= 3) acc.in3 += 1;
        if (days <= 7) acc.in7 += 1;
        return acc;
      },
      { today: 0, in3: 0, in7: 0 }
    );
  }, [data.queue]);

  const membershipsCriticalList = useMemo(() => {
    const ranked = new Map<string, { id: string; primary: string; secondary: string; badge: string }>();

    data.failedPayments.forEach((row) => {
      if (ranked.has(row.id)) return;
      ranked.set(row.id, {
        id: row.id,
        primary: ownerLabel(row),
        secondary: `${row.plan?.name || "Plan"} · cobro recurrente fallido`,
        badge: "Fallo"
      });
    });

    data.pendingPayments.forEach((row) => {
      if (ranked.has(row.id)) return;
      ranked.set(row.id, {
        id: row.id,
        primary: ownerLabel(row),
        secondary: `${row.code} · pago manual pendiente`,
        badge: "Pendiente"
      });
    });

    data.renewals.forEach((row) => {
      if (ranked.has(row.id)) return;
      ranked.set(row.id, {
        id: row.id,
        primary: ownerLabel(row),
        secondary: `${row.plan?.name || "Plan"} · renueva ${dateLabel(row.nextRenewAt)}`,
        badge: "Renovación"
      });
    });

    return Array.from(ranked.values()).slice(0, 5);
  }, [data.failedPayments, data.pendingPayments, data.renewals]);

  const pharmacyQueueList = useMemo(() => {
    return data.queue.slice(0, 5).map((row) => ({
      id: row.id,
      primary: row.patientId,
      secondary: `${dateLabel(row.nextFillAt)} · ${row.items.length} item(s)`,
      badge: Number(row.daysUntilNextFill ?? 99) <= 0 ? "Hoy" : "Programado"
    }));
  }, [data.queue]);

  const attentionItems = useMemo(() => {
    const items: Array<{ id: string; label: string; hint: string }> = [];

    if (data.failedPayments.length > 0) {
      items.push({
        id: "failed",
        label: `${data.failedPayments.length} cobros recurrentes con fallo`,
        hint: "Verifica pasarela y confirma método alterno con el titular."
      });
    }

    if (data.pendingPayments.length > 0) {
      items.push({
        id: "manual",
        label: `${data.pendingPayments.length} cobros manuales pendientes`,
        hint: "Genera o revisa borradores en Facturación para cierre operativo."
      });
    }

    if (data.paused.length > 0) {
      items.push({
        id: "stock",
        label: `${data.paused.length} suscripciones de farmacia pausadas`,
        hint: "Stock no disponible: sugerir sustituto y reprogramar entrega."
      });
    }

    if (queueCounters.today > 0) {
      items.push({
        id: "queue",
        label: `${queueCounters.today} entregas de farmacia para hoy`,
        hint: "Prioriza preparación y contacto antes del corte de turno."
      });
    }

    return items;
  }, [data.failedPayments.length, data.pendingPayments.length, data.paused.length, queueCounters.today]);

  const showSetupWizard = !loading && (data.categories.length === 0 || data.plans.length === 0);

  const rangeItems = useMemo(
    () => [
      { key: "today", label: "Hoy", active: range === "today", onClick: () => setRange("today") },
      { key: "7d", label: "7 días", active: range === "7d", onClick: () => setRange("7d") },
      { key: "30d", label: "30 días", active: range === "30d", onClick: () => setRange("30d") },
      { key: "custom", label: "Custom", active: range === "custom", onClick: () => setRange("custom") }
    ],
    [range]
  );

  const approvalItems = useMemo(
    () => [
      {
        id: "coupon",
        label: "Cupones pendientes",
        count: data.pendingPayments.length,
        hint: "Validación admin"
      },
      {
        id: "reschedule",
        label: "Cambios de fecha con recargo",
        count: data.failedPayments.length,
        hint: "Requiere revisión"
      },
      {
        id: "reprint",
        label: "Reimpresiones pendientes",
        count: queueCounters.today,
        hint: "Operación diaria"
      }
    ],
    [data.failedPayments.length, data.pendingPayments.length, queueCounters.today]
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Dashboard"
        subtitle="Control diario de membresías y farmacia, con prioridades operativas por rango."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/suscripciones/membresias/afiliaciones/pacientes?enroll=1"
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
            >
              Afiliar
            </Link>
            <Link
              href="/admin/suscripciones/membresias/planes/nuevo"
              className="rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
            >
              Crear producto
            </Link>
            <NavPills items={rangeItems} ariaLabel="Seleccionar rango de análisis" />
            {range === "custom" ? (
              <input
                value={customDays}
                onChange={(event) => setCustomDays(event.target.value)}
                inputMode="numeric"
                placeholder="Días"
                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              />
            ) : null}
          </div>
        }
      >
        {loading ? <p className="text-xs text-slate-500">Cargando dashboard...</p> : null}
        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

        {!loading && !error ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#2e75ba]">Membresías</h3>
                  <p className="mt-1 text-xs text-slate-600">Afiliaciones activas, renovaciones y cobro manual/recurrente.</p>
                </div>
                <Link
                  href="/admin/suscripciones/membresias/afiliaciones/pacientes"
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Ver afiliaciones
                </Link>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <KPIStatCard label="Activas" value={data.cards?.contractsActive || 0} tone="success" />
                <KPIStatCard label="Por vencer" value={data.renewals.length} hint={`Ventana ${windowDays} días`} />
                <KPIStatCard label="Pendientes manual" value={data.pendingPayments.length} tone="warning" />
                <KPIStatCard label="Fallos recurrente" value={data.failedPayments.length} tone="warning" />
                <KPIStatCard label="Renovaciones pendientes" value={data.cards?.renewals30 || 0} />
                <KPIStatCard label="MRR estimado" value={money(data.cards?.estimatedMrr || 0)} />
              </div>

              <OpsListCard
                title="Suscripciones críticas"
                subtitle="Top 5 por riesgo operativo"
                items={membershipsCriticalList}
                emptyCopy="No hay suscripciones críticas en este rango."
                ctaLabel="Ver afiliaciones"
                ctaHref="/admin/suscripciones/membresias/afiliaciones/pacientes"
              />
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#2e75ba]">Farmacia</h3>
                  <p className="mt-1 text-xs text-slate-600">Cola operativa y seguimiento de suscripciones por medicamento.</p>
                </div>
                <Link
                  href="/admin/suscripciones/farmacia?tab=cola"
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Ver cola
                </Link>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <KPIStatCard label="Cola hoy" value={queueCounters.today} />
                <KPIStatCard label="Cola 3 días" value={queueCounters.in3} />
                <KPIStatCard label="Cola 7 días" value={queueCounters.in7} />
                <KPIStatCard label="Sin stock" value={data.paused.length} tone="warning" />
                <KPIStatCard label="Preparado sin entrega" value={Math.max(0, queueCounters.today - data.paused.length)} />
                <KPIStatCard label="Cobros pendientes" value={data.paused.length} />
              </div>

              <OpsListCard
                title="Cola operativa"
                subtitle="Top 5 del turno"
                items={pharmacyQueueList}
                emptyCopy="No hay entregas programadas en este rango."
                ctaLabel="Ver cola"
                ctaHref="/admin/suscripciones/farmacia?tab=cola"
              />
            </section>
          </div>
        ) : null}
      </SectionCard>

      {showSetupWizard ? (
        <SectionCard
          title="Configura la base inicial"
          subtitle="Completa estos pasos para habilitar operación comercial de Suscripciones."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#2e75ba]">1) Configurar base</p>
              <p className="mt-1 text-xs text-slate-600">Define categorías, duraciones y beneficios para el catálogo.</p>
              <Link
                href="/admin/suscripciones/membresias/configuracion"
                className="mt-3 inline-flex rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#4aa59c]"
              >
                Configurar base
              </Link>
            </article>

            <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#2e75ba]">2) Crear primer producto</p>
              <p className="mt-1 text-xs text-slate-600">Publica el primer plan para iniciar afiliaciones.</p>
              <Link
                href="/admin/suscripciones/membresias/planes/nuevo"
                className="mt-3 inline-flex rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#4aa59c]"
              >
                Crear primer producto
              </Link>
            </article>

            <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#2e75ba]">3) Afiliar primer cliente</p>
              <p className="mt-1 text-xs text-slate-600">Completa la primera afiliación y enlaza cobro en Facturación.</p>
              <Link
                href="/admin/suscripciones/membresias/afiliaciones/pacientes"
                className="mt-3 inline-flex rounded-lg bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4aadf5]"
              >
                Afiliar primer cliente
              </Link>
            </article>
          </div>
        </SectionCard>
      ) : null}

      {!loading && !error ? (
        <SectionCard title="Atención" subtitle="Alertas suaves para priorizar trabajo del turno sin fricción visual.">
          {attentionItems.length === 0 ? (
            <p className="text-xs text-slate-600">Sin alertas relevantes en este rango.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {attentionItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <div className="flex items-start gap-2">
                    {item.id === "failed" ? (
                      <RefreshCw className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    ) : item.id === "queue" ? (
                      <CalendarClock className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    ) : item.id === "stock" ? (
                      <Pill className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[#2e75ba]">{item.label}</p>
                      <p className="mt-1 text-[11px] text-slate-600">{item.hint}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-3 rounded-lg border border-[#4aadf5] bg-white px-3 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#2e75ba]" />
              <span>
                Los excedentes generan borrador de cobro en Facturación y se procesan el siguiente día hábil.
              </span>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <AdminApprovalsCard isAdmin={data.canAdmin} items={approvalItems} href="/admin/suscripciones/configuracion" />
    </div>
  );
}
