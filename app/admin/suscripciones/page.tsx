"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CreditCard, Pill, ShieldAlert } from "lucide-react";
import { NavPills } from "@/components/subscriptions/NavPills";
import { SectionCard } from "@/components/subscriptions/SectionCard";
import { KPIStat } from "@/components/subscriptions/KPIStat";
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
  active: boolean;
  createdAt?: string;
};

type ContractRow = {
  id: string;
  code: string;
  status: string;
  owner?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  } | null;
  plan?: {
    name?: string | null;
  } | null;
  nextRenewAt?: string | null;
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

type DashboardState = {
  cards: MembershipCards | null;
  plans: PlanRow[];
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

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.error || `Error cargando ${url}`);
  return json;
}

export default function SubscriptionsDashboardPage() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [customDays, setCustomDays] = useState("14");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardState>({
    cards: null,
    plans: [],
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
        dashboardJson,
        plansJson,
        pendingJson,
        failedJson,
        renewalsJson,
        queueJson,
        pausedJson
      ] = await Promise.all([
        fetchJson<{ data: { cards: MembershipCards } }>("/api/subscriptions/memberships/dashboard"),
        fetchJson<{ data: PlanRow[] }>("/api/subscriptions/memberships/plans?active=true"),
        fetchJson<{ data: ContractRow[] }>("/api/subscriptions/memberships/contracts?status=PENDIENTE_PAGO&take=6"),
        fetchJson<{ data: ContractRow[] }>(
          "/api/subscriptions/memberships/contracts?paymentMethod=RECURRENT&status=SUSPENDIDO&take=6"
        ),
        fetchJson<{ data: ContractRow[] }>(`/api/subscriptions/memberships/contracts?renewWindowDays=${windowDays}&take=6`),
        fetchJson<{ data: PharmacyQueueRow[] }>(`/api/subscriptions/pharmacy/queue?windowDays=${windowDays}`),
        fetchJson<{ data: PharmacyPausedRow[] }>(
          "/api/subscriptions/pharmacy/medication-subscriptions?status=PAUSED&take=6"
        )
      ]);

      const sortedPlans = [...(plansJson.data || [])].sort((a, b) => {
        const left = new Date(a.createdAt || 0).getTime();
        const right = new Date(b.createdAt || 0).getTime();
        return right - left;
      });

      setData({
        cards: dashboardJson.data.cards,
        plans: sortedPlans.slice(0, 6),
        pendingPayments: pendingJson.data || [],
        failedPayments: failedJson.data || [],
        renewals: renewalsJson.data || [],
        queue: (queueJson.data || []).slice(0, 8),
        paused: pausedJson.data || []
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

  const attentionItems = useMemo(() => {
    const list: Array<{ id: string; label: string; hint: string }> = [];
    if ((data.cards?.contractsAtRisk || 0) > 0) {
      list.push({
        id: "risk",
        label: `${data.cards?.contractsAtRisk || 0} afiliaciones en riesgo`,
        hint: "Revisar renovación y contacto preventivo."
      });
    }
    if (data.failedPayments.length > 0) {
      list.push({
        id: "failed",
        label: `${data.failedPayments.length} cobros recurrentes con fallo`,
        hint: "Validar pasarela y notificar al titular."
      });
    }
    if (data.paused.length > 0) {
      list.push({
        id: "paused",
        label: `${data.paused.length} suscripciones de farmacia en pausa`,
        hint: "Priorizar stock y reconfirmar entrega."
      });
    }
    if (queueCounters.today > 0) {
      list.push({
        id: "queue-today",
        label: `${queueCounters.today} entregas de farmacia para hoy`,
        hint: "Ejecutar cola operativa antes del corte."
      });
    }
    return list;
  }, [data.cards?.contractsAtRisk, data.failedPayments.length, data.paused.length, queueCounters.today]);

  const rangeItems = useMemo(
    () => [
      { key: "today", label: "Hoy", active: range === "today", onClick: () => setRange("today") },
      { key: "7d", label: "7 días", active: range === "7d", onClick: () => setRange("7d") },
      { key: "30d", label: "30 días", active: range === "30d", onClick: () => setRange("30d") },
      { key: "custom", label: "Custom", active: range === "custom", onClick: () => setRange("custom") }
    ],
    [range]
  );

  const showMembershipSetup = !loading && data.plans.length === 0;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Dashboard"
        subtitle="Vista consolidada de operación diaria para membresías y farmacia."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
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
        {loading ? <p className="text-xs text-slate-500">Cargando indicadores...</p> : null}
        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

        {!loading && !error ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard
              title="Membresías"
              subtitle="Afiliaciones, renovaciones y seguimiento de cobro."
              actions={
                <Link
                  href="/admin/suscripciones/membresias/afiliaciones/pacientes"
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Ver afiliaciones
                </Link>
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <KPIStat label="MRR B2C" value={money(data.cards?.b2cMrr || 0)} />
                <KPIStat label="MRR B2B" value={money(data.cards?.b2bMrr || 0)} />
                <KPIStat label="Pendientes" value={data.pendingPayments.length} tone="warning" />
                <KPIStat label="Pagos fallidos" value={data.failedPayments.length} tone="warning" />
                <KPIStat label="Renovaciones" value={data.renewals.length} hint={`Ventana ${windowDays} días`} />
                <KPIStat label="En riesgo" value={data.cards?.contractsAtRisk || 0} tone="warning" />
              </div>

              {showMembershipSetup ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                  <h3 className="text-sm font-semibold text-[#2e75ba]">Base inicial pendiente</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Configura catálogos y publica el primer plan para habilitar operación.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                      Crear primer plan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold text-[#2e75ba]">Planes nuevos</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {data.plans.slice(0, 4).map((plan) => (
                        <li key={plan.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{plan.name}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {plan.segment}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold text-[#2e75ba]">Pendientes de pago</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {data.pendingPayments.slice(0, 4).map((contract) => (
                        <li key={contract.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{ownerLabel(contract)}</span>
                          <span className="text-[11px] text-slate-500">{contract.code}</span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold text-[#2e75ba]">Cobros fallidos</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {data.failedPayments.slice(0, 4).map((contract) => (
                        <li key={contract.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{ownerLabel(contract)}</span>
                          <span className="text-[11px] text-slate-500">{contract.plan?.name || "Plan"}</span>
                        </li>
                      ))}
                    </ul>
                  </article>

                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs font-semibold text-[#2e75ba]">Renovaciones próximas</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-700">
                      {data.renewals.slice(0, 4).map((contract) => (
                        <li key={contract.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{ownerLabel(contract)}</span>
                          <span className="text-[11px] text-slate-500">{dateLabel(contract.nextRenewAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Farmacia"
              subtitle="Cola de preparación y seguimiento de suscripciones de medicamento."
              actions={
                <Link
                  href="/admin/suscripciones/farmacia?tab=cola"
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Ver cola
                </Link>
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <KPIStat label="Cola hoy" value={queueCounters.today} />
                <KPIStat label="Próx. 3 días" value={queueCounters.in3} />
                <KPIStat label="Próx. 7 días" value={queueCounters.in7} />
                <KPIStat label="Suscripciones en pausa" value={data.paused.length} tone="warning" />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-[#2e75ba]">Cola operativa</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {data.queue.slice(0, 5).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.patientId}</span>
                        <span className="text-[11px] text-slate-500">{dateLabel(item.nextFillAt)}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-[#2e75ba]">Pausadas</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {data.paused.slice(0, 5).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.patientId}</span>
                        <span className="text-[11px] text-slate-500">{dateLabel(item.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </SectionCard>

      {!loading && !error ? (
        <SectionCard title="Atención" subtitle="Alertas operativas para priorizar acciones en el turno.">
          {attentionItems.length === 0 ? (
            <p className="text-xs text-slate-600">Sin alertas críticas en este rango.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {attentionItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <div className="flex items-start gap-2">
                    {item.id === "failed" ? (
                      <CreditCard className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    ) : item.id === "queue-today" ? (
                      <CalendarClock className="mt-0.5 h-4 w-4 text-[#2e75ba]" />
                    ) : item.id === "paused" ? (
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
        </SectionCard>
      ) : null}

      {!loading && !error && attentionItems.length > 0 ? (
        <div className="rounded-lg border border-[#4aadf5] bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#2e75ba]" />
            <span>Usa el menú principal para navegar sin duplicados: Dashboard, Membresías, Farmacia, Pasarela y Configuración.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
