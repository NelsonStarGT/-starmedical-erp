"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, PhoneCall, Timer, Users, Waves } from "lucide-react";
import { actionCallNext, actionGetReceptionDashboardLite } from "@/app/admin/reception/actions";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import { usePolling } from "@/lib/reception/ui-polling";
import { RECEPTION_AREA_LABELS } from "@/lib/reception/constants";
import { cn } from "@/lib/utils";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type DashboardUpcomingRange = "today" | "next24h" | "next7d";
type DashboardAreaKey = keyof typeof RECEPTION_AREA_LABELS;

type DashboardUpcomingRow = {
  id: string;
  scheduledAt: string;
  status: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  typeName: string | null;
  branchId: string;
  branchName: string | null;
};

type DashboardSnapshot = {
  siteId: string;
  generatedAt: string;
  kpis: {
    patientsInSala: number;
    avgWaitTodayMin: number;
    warningPercent: number;
    criticalPercent: number;
    inServiceCount: number;
    bottleneckAreas: Array<{ area: DashboardAreaKey; waitingCount: number; avgWaitMin: number }>;
    upcomingAppointments60m: number;
    appointmentsToday: number;
    upcomingAppointments24h: number;
    upcomingAppointments7d: number;
    pendingPortalRequests: number;
  };
  topWaiting: Array<{
    visitId: string;
    queueItemId: string;
    ticketCode: string | null;
    patientDisplayName: string;
    area: DashboardAreaKey;
    minutesWaiting: number;
    slaState: "normal" | "warning" | "critical";
  }>;
  areaSummary: Array<{
    area: DashboardAreaKey;
    waitingCount: number;
    avgWaitMin: number;
    maxWaitMin: number;
  }>;
  upcomingByRange: Record<DashboardUpcomingRange, DashboardUpcomingRow[]>;
};

type Props = {
  siteId: string;
  capabilities: ReceptionCapability[];
  initialSnapshot: DashboardSnapshot;
};

export default function DashboardClient({ siteId, capabilities, initialSnapshot }: Props) {
  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [upcomingRange, setUpcomingRange] = useState<DashboardUpcomingRange>("today");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.parse(initialSnapshot.generatedAt) || Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCallNext = capabilities.includes("QUEUE_CALL_NEXT");

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!effectiveSiteId) {
        setError("Selecciona una sede activa para operar.");
        return;
      }
      const next = await actionGetReceptionDashboardLite(effectiveSiteId);
      setSnapshot(next);
      setLastUpdatedAt(Date.parse(next.generatedAt) || Date.now());
      setError(null);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar el dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveSiteId]);

  usePolling({ intervalMs: 10000, onTick: refresh });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsAgo(Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastUpdatedAt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 250);
    return () => clearTimeout(timer);
  }, [refresh]);

  const bottleneckLabel = useMemo(() => {
    if (!snapshot.kpis.bottleneckAreas.length) return "Sin cuellos detectados";
    return snapshot.kpis.bottleneckAreas
      .map((item) => `${RECEPTION_AREA_LABELS[item.area]} (${item.waitingCount})`)
      .join(" · ");
  }, [snapshot.kpis.bottleneckAreas]);

  const upcomingRows = snapshot.upcomingByRange?.[upcomingRange] ?? [];

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Recepción</p>
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Dashboard operativo
            </h2>
            <p className="text-sm text-slate-600">Monitoreo liviano por sede activa (polling 10s).</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className={cn(isRefreshing && "text-[#4aa59c]")}>{isRefreshing ? "Actualizando…" : "En línea"}</p>
            <p>Última actualización hace {secondsAgo}s</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Pacientes en sala" value={snapshot.kpis.patientsInSala} icon={<Users size={14} />} tone="neutral" />
          <KpiCard label="Espera promedio" value={`${snapshot.kpis.avgWaitTodayMin} min`} icon={<Clock3 size={14} />} tone="info" />
          <KpiCard label="SLA warning" value={`${snapshot.kpis.warningPercent}%`} icon={<Timer size={14} />} tone="warning" />
          <KpiCard label="SLA critical" value={`${snapshot.kpis.criticalPercent}%`} icon={<AlertTriangle size={14} />} tone="critical" />
          <KpiCard label="En atención" value={snapshot.kpis.inServiceCount} icon={<Waves size={14} />} tone="primary" />
          <KpiCard
            label="Próximas 60 min"
            value={snapshot.kpis.upcomingAppointments60m}
            icon={<Clock3 size={14} />}
            tone="neutral"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Citas hoy" value={snapshot.kpis.appointmentsToday} icon={<Clock3 size={14} />} tone="primary" />
          <KpiCard label="Próximas 24h" value={snapshot.kpis.upcomingAppointments24h} icon={<Clock3 size={14} />} tone="info" />
          <KpiCard label="Próximos 7 días" value={snapshot.kpis.upcomingAppointments7d} icon={<Clock3 size={14} />} tone="neutral" />
          <KpiCard label="Solicitudes portal" value={snapshot.kpis.pendingPortalRequests} icon={<AlertTriangle size={14} />} tone="warning" />
        </div>

        <div className="mt-3 rounded-lg border border-[#e5edf8] bg-[#f8fafc] px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-[#2e75ba]">Cuello de botella:</span> {bottleneckLabel}
        </div>

        {error ? <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </div>

      <section className="rounded-xl border border-[#e5edf8] bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#2e75ba]">Próximas citas</h3>
            <p className="text-xs text-slate-500">Incluye estados REQUESTED, PROGRAMADA y CONFIRMADA.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUpcomingRange("today")}
              className={
                upcomingRange === "today"
                  ? "rounded-full bg-[#2e75ba] px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-[#d2e2f6] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
              }
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setUpcomingRange("next24h")}
              className={
                upcomingRange === "next24h"
                  ? "rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-[#cde7e4] bg-white px-3 py-1 text-xs font-semibold text-[#1f6f68]"
              }
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => setUpcomingRange("next7d")}
              className={
                upcomingRange === "next7d"
                  ? "rounded-full bg-[#4aadf5] px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-[#d2e2f6] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
              }
            >
              7 días
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.12em] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left">Paciente</th>
                <th className="px-3 py-2 text-left">Teléfono</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Sede</th>
                <th className="px-3 py-2 text-left">Fecha/hora</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {upcomingRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-sm text-slate-500">
                    No hay citas para el rango seleccionado.
                  </td>
                </tr>
              ) : (
                upcomingRows.map((row, idx) => (
                  <tr key={row.id} className={cn("border-t border-slate-100", idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                    <td className="px-3 py-2 text-slate-700">{row.patientName}</td>
                    <td className="px-3 py-2 text-slate-700">{row.patientPhone || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.typeName || "Sin tipo"}</td>
                    <td className="px-3 py-2 text-slate-700">{row.branchName || "Sede"}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTime(row.scheduledAt)}</td>
                    <td className="px-3 py-2">
                      <AppointmentStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#e5edf8] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2e75ba]">Top 10 más tiempo esperando</h3>
            <Link href="/admin/reception" className="text-xs font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Ver lista operativa
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.12em] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left">Ticket</th>
                  <th className="px-3 py-2 text-left">Paciente</th>
                  <th className="px-3 py-2 text-left">Área</th>
                  <th className="px-3 py-2 text-left">Min</th>
                  <th className="px-3 py-2 text-left">SLA</th>
                  <th className="px-3 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.topWaiting.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-5 text-center text-sm text-slate-500">
                      Sin pacientes en espera.
                    </td>
                  </tr>
                ) : (
                  snapshot.topWaiting.map((row, idx) => (
                    <tr key={row.queueItemId} className={cn("border-t border-slate-100", idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                      <td className="px-3 py-2 font-semibold text-[#2e75ba]">{row.ticketCode ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{row.patientDisplayName}</td>
                      <td className="px-3 py-2 text-slate-700">{RECEPTION_AREA_LABELS[row.area]}</td>
                      <td className="px-3 py-2 text-slate-700">{row.minutesWaiting}</td>
                      <td className="px-3 py-2">
                        <SlaBadge tone={row.slaState} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/reception/visit/${row.visitId}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                          >
                            Ver
                          </Link>
                          {canCallNext && row.slaState === "critical" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await actionCallNext({ siteId: effectiveSiteId, area: row.area });
                                    await refresh();
                                  } catch (err) {
                                    setError((err as Error)?.message || "No se pudo llamar siguiente.");
                                  }
                                });
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                                isPending && "opacity-60"
                              )}
                            >
                              <PhoneCall size={12} /> Llamar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5edf8] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2e75ba]">Resumen por área</h3>
            <span className="text-xs text-slate-500">Cola / Promedio / Máximo</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.12em] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left">Área</th>
                  <th className="px-3 py-2 text-left">En cola</th>
                  <th className="px-3 py-2 text-left">Prom</th>
                  <th className="px-3 py-2 text-left">Max</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.areaSummary.map((row, idx) => (
                  <tr key={row.area} className={cn("border-t border-slate-100", idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                    <td className="px-3 py-2 text-slate-700">{RECEPTION_AREA_LABELS[row.area]}</td>
                    <td className="px-3 py-2 font-semibold text-[#2e75ba]">{row.waitingCount}</td>
                    <td className="px-3 py-2 text-slate-700">{row.avgWaitMin} min</td>
                    <td className="px-3 py-2 text-slate-700">{row.maxWaitMin} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "primary" | "neutral" | "info" | "warning" | "critical";
}) {
  const iconTone =
    tone === "primary"
      ? "bg-[#4aa59c]/10 text-[#2e75ba]"
      : tone === "info"
        ? "bg-[#4aadf5]/15 text-[#2e75ba]"
        : tone === "warning"
          ? "bg-amber-100 text-amber-700"
          : tone === "critical"
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-600";

  return (
    <article className="rounded-lg border border-[#e5edf8] bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2e75ba]">{label}</p>
        <span className={cn("rounded-full p-1.5", iconTone)}>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
        {value}
      </p>
    </article>
  );
}

function SlaBadge({ tone }: { tone: "normal" | "warning" | "critical" }) {
  const style =
    tone === "critical"
      ? "bg-rose-100 text-rose-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-[#4aa59c]/10 text-[#2e75ba]";
  const label = tone === "critical" ? "Crítico" : tone === "warning" ? "Warning" : "OK";

  return <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", style)}>{label}</span>;
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-GT", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function AppointmentStatusBadge({ status }: { status: string }) {
  if (status === "REQUESTED") {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">En revisión</span>;
  }
  if (status === "PROGRAMADA" || status === "CONFIRMADA") {
    return <span className="rounded-full bg-[#4aa59c]/10 px-2 py-1 text-xs font-semibold text-[#2e75ba]">Confirmada</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{status}</span>;
}
