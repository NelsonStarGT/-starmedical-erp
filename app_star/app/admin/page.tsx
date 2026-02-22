import Link from "next/link";
import { cookies } from "next/headers";
import { AppointmentStatus, DiagnosticOrderStatus, MembershipStatus, QueueItemStatus } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Stethoscope,
  UserSquare2,
  Users
} from "lucide-react";
import { getSessionUserFromCookies } from "@/lib/auth";
import {
  HOME_KPI_CATALOG,
  HOME_QUICK_ACTION_CATALOG,
  type HomeKpiKey,
  type HomeQuickActionKey
} from "@/lib/home-dashboard/config";
import { getHomeDashboardSettings } from "@/lib/home-dashboard/service";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { resolveReceptionRole } from "@/lib/reception/rbac";

type KpiTone = "primary" | "info" | "ok" | "warning";

type HomeKpi = {
  key: string;
  label: string;
  value: number | null;
  helper: string;
  tone: KpiTone;
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  visible?: boolean;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isPrismaUnknownArgumentError(error: unknown) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unknown argument");
}

async function safeCount(context: string, query: () => Promise<number>) {
  try {
    return await query();
  } catch (error) {
    warnDevMissingTable(context, error);
    if (isPrismaMissingTableError(error)) return null;
    if (process.env.NODE_ENV !== "production" && isPrismaUnknownArgumentError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[DEV][prisma] ${context}: ${message}`);
      return null;
    }
    throw error;
  }
}

async function safeValue<T>(context: string, query: () => Promise<T>) {
  try {
    return await query();
  } catch (error) {
    warnDevMissingTable(context, error);
    if (isPrismaMissingTableError(error)) return null;
    if (process.env.NODE_ENV !== "production" && isPrismaUnknownArgumentError(error)) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[DEV][prisma] ${context}: ${message}`);
      return null;
    }
    throw error;
  }
}

function metricToneClasses(tone: KpiTone) {
  if (tone === "warning") return "border-amber-200 bg-amber-50/70";
  if (tone === "ok") return "border-emerald-200 bg-emerald-50/70";
  if (tone === "info") return "border-sky-200 bg-sky-50/70";
  return "border-[#dce7f5] bg-white";
}

function metricValueClasses(tone: KpiTone) {
  if (tone === "warning") return "text-amber-700";
  if (tone === "ok") return "text-emerald-700";
  if (tone === "info") return "text-sky-700";
  return "text-[#163d66]";
}

const QUICK_ACTION_ICONS: Record<HomeQuickActionKey, LucideIcon> = {
  reception_checkin: Stethoscope,
  reception_queues: Activity,
  billing_tray: ClipboardList,
  billing_cashier: Building2,
  agenda_appointments: CalendarDays,
  diagnostics_orders: FlaskConical,
  clients_search: Users,
  memberships_contracts: Activity,
  users_list: UserSquare2
};

export default async function AdminHome() {
  const user = await getSessionUserFromCookies(cookies());
  const homeSettings = await getHomeDashboardSettings(user?.roles || []);
  const canAccessReception = Boolean(resolveReceptionRole(user?.roles ?? []));
  const branchId = user?.branchId ?? null;
  const hasBranchScope = Boolean(branchId);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const numberFormat = new Intl.NumberFormat("es-GT");
  const todayLabel = new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(today);

  const [
    branchName,
    activeUsers,
    totalClients,
    appointmentsToday,
    diagnosticOrdersToday,
    activeMemberships,
    queuePending,
    inServiceNow,
    activeBranches
  ] = await Promise.all([
    branchId
      ? safeValue("admin.home.branch.name", async () => {
          const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
          return branch?.name ?? null;
        })
      : null,
    safeCount("admin.home.user.active", () =>
      prisma.user.count({
        where: {
          isActive: true,
          ...(branchId ? { branchId } : {})
        }
      })
    ),
    safeCount("admin.home.client.total", () => prisma.clientProfile.count({ where: { deletedAt: null } })),
    safeCount("admin.home.appointments.today", () =>
      prisma.appointment.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { not: AppointmentStatus.CANCELADA },
          ...(branchId ? { branchId } : {})
        }
      })
    ),
    safeCount("admin.home.diagnosticOrders.today", () =>
      prisma.diagnosticOrder.count({
        where: {
          orderedAt: { gte: today, lt: tomorrow },
          status: { not: DiagnosticOrderStatus.CANCELLED },
          ...(branchId ? { branchId } : {})
        }
      })
    ),
    safeCount("admin.home.memberships.active", () =>
      prisma.membershipContract.count({
        where: {
          status: MembershipStatus.ACTIVO,
          ...(branchId ? { assignedBranchId: branchId } : {})
        }
      })
    ),
    safeCount("admin.home.queue.pending", () =>
      prisma.queueItem.count({
        where: {
          status: { in: [QueueItemStatus.WAITING, QueueItemStatus.CALLED, QueueItemStatus.IN_SERVICE, QueueItemStatus.PAUSED] },
          ...(branchId ? { queue: { siteId: branchId } } : {})
        }
      })
    ),
    safeCount("admin.home.queue.inService", () =>
      prisma.queueItem.count({
        where: {
          status: QueueItemStatus.IN_SERVICE,
          ...(branchId ? { queue: { siteId: branchId } } : {})
        }
      })
    ),
    safeCount("admin.home.branches.active", () => prisma.branch.count({ where: { isActive: true } }))
  ]);

  const kpiScopeLabel = hasBranchScope
    ? `Sucursal: ${branchName && typeof branchName === "string" ? branchName : "asignada"}`
    : "Red completa";

  const quickActionMap = new Map(HOME_QUICK_ACTION_CATALOG.map((item) => [item.key, item]));
  const quickActions: QuickAction[] = homeSettings.quickActionKeys.flatMap((key) => {
    const item = quickActionMap.get(key);
    if (!item) return [];
    return [
      {
        href: item.href,
        label: item.label,
        description: item.description,
        icon: QUICK_ACTION_ICONS[key],
        visible: item.requiresReception ? canAccessReception : true
      }
    ];
  });

  const metricValues: Record<HomeKpiKey, number | null> = {
    users_active: activeUsers,
    appointments_today: appointmentsToday,
    in_service_now: inServiceNow,
    queue_operational: queuePending,
    diagnostic_orders_today: diagnosticOrdersToday,
    memberships_active: activeMemberships,
    clients_registered: totalClients,
    branches_active: activeBranches
  };
  const kpiMap = new Map(HOME_KPI_CATALOG.map((item) => [item.key, item]));
  const kpis: HomeKpi[] = homeSettings.kpiKeys.flatMap((key) => {
    const item = kpiMap.get(key);
    if (!item) return [];
    return [
      {
        key,
        label: item.label,
        value: metricValues[key],
        helper: hasBranchScope ? item.helperBranch : item.helperGlobal,
        tone: item.tone
      }
    ];
  });

  const visibleQuickActions = quickActions.filter((action) => action.visible ?? true);
  const hasMissingMetrics = kpis.some((item) => item.value === null);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Hoja de inicio</p>
            <h1 className="text-2xl font-semibold text-[#163d66]">
              {user?.name ? `Hola, ${user.name}` : "Panel administrativo"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Vista rápida de módulos y operación clave. Fecha de referencia: {todayLabel}.
            </p>
            <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Alcance de KPIs: {kpiScopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAccessReception && (
              <Link
                href="/admin/reception/check-in"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#2e75ba] hover:text-[#2e75ba]"
              >
                Abrir check-in
                <ArrowUpRight size={16} />
              </Link>
            )}
            <Link
              href="/admin/clientes/buscar"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#2e75ba] hover:text-[#2e75ba]"
            >
              Buscar cliente
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/admin/agenda/citas"
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f8f87]"
            >
              Nueva cita
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Botones rápidos</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {visibleQuickActions.length} accesos disponibles
          </p>
        </div>
        {visibleQuickActions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            No hay botones seleccionados. Configúralos en <Link className="font-semibold underline" href="/admin/configuracion">Configuración</Link> -
            Inicio.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#2e75ba] hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-[#163d66]">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-600 transition group-hover:bg-[#eaf2fb] group-hover:text-[#2e75ba]">
                      <Icon size={16} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">KPIs operativos</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Snapshot del día | {kpiScopeLabel}</p>
        </div>
        {kpis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            No hay KPIs seleccionados. Configúralos en <Link className="font-semibold underline" href="/admin/configuracion">Configuración</Link> -
            Inicio.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => (
              <article
                key={item.key}
                className={`rounded-2xl border p-5 shadow-soft transition ${metricToneClasses(item.tone)}`}
              >
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${metricValueClasses(item.tone)}`}>
                  {item.value === null ? "—" : numberFormat.format(item.value)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
              </article>
            ))}
          </div>
        )}

        {hasMissingMetrics && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Algunas métricas no están disponibles por configuración de base de datos. Revisa{" "}
            <Link className="font-semibold underline" href="/admin/health/db">
              estado de tablas
            </Link>
            .
          </p>
        )}
      </section>

      <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Bienvenido</h2>
        <p className="text-sm text-slate-600 mt-2">
          Este es el panel base del ERP StarMedical. Usa los botones rápidos para entrar a cada módulo y
          valida el estado operativo con los KPIs para priorizar el trabajo del día.
        </p>
      </div>
    </div>
  );
}
