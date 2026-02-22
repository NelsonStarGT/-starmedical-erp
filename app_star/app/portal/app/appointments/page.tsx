import { headers } from "next/headers";
import Link from "next/link";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalAppointments } from "@/lib/portal/data";
import { formatPortalDate, formatPortalDateTime } from "@/lib/portal/format";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";
import { PortalAppointmentCard } from "@/components/portal/PortalAppointmentCard";
import { PortalEmptyState } from "@/components/portal/PortalEmptyState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalAppointmentsPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "appointments",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const { upcoming, history } = await getPortalAppointments(session.clientId);
  const requested = upcoming.filter((item) => item.status === "REQUESTED");
  const confirmed = upcoming.filter((item) => item.status === "PROGRAMADA" || item.status === "CONFIRMADA" || item.status === "EN_SALA");
  const otherUpcoming = upcoming.filter(
    (item) => item.status !== "REQUESTED" && item.status !== "PROGRAMADA" && item.status !== "CONFIRMADA" && item.status !== "EN_SALA"
  );
  const confirmedAndActive = [...confirmed, ...otherUpcoming];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Portal StarMedical</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2e75ba]">Mis citas</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Consulta rápidamente qué solicitudes están en revisión, qué citas ya fueron confirmadas y tu historial más reciente.
            </p>
          </div>

          <Link
            href="/portal/app/appointments/new"
            className="inline-flex items-center rounded-full bg-[#4aa59c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f978e]"
          >
            Solicitar cita
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#d9e8fa] bg-[#f6fbff] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">En revisión</p>
            <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{requested.length}</p>
          </div>
          <div className="rounded-xl border border-[#d9e8fa] bg-[#f6fbff] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Confirmadas</p>
            <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{confirmedAndActive.length}</p>
          </div>
          <div className="rounded-xl border border-[#d9e8fa] bg-[#f6fbff] px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Historial</p>
            <p className="mt-1 text-xl font-semibold text-[#2e75ba]">{history.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2e75ba]">Solicitudes en revisión</h2>
          <p className="text-sm text-slate-600">Estas solicitudes están pendientes de confirmación por recepción.</p>
          {requested.length === 0 ? (
            <PortalEmptyState
              title="No tienes solicitudes en revisión."
              description="Cuando solicites una nueva cita, aparecerá aquí."
            />
          ) : (
            requested.map((item) => <PortalAppointmentCard key={item.id} item={item} section="requested" />)
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2e75ba]">Citas confirmadas</h2>
          <p className="text-sm text-slate-600">Tus próximas citas con fecha y hora ya definidas.</p>
          {confirmedAndActive.length === 0 ? (
            <PortalEmptyState
              title="Aún no hay citas confirmadas."
              description="Cuando recepción confirme una solicitud, la verás en esta sección."
            />
          ) : (
            confirmedAndActive.map((item) => <PortalAppointmentCard key={item.id} item={item} section="confirmed" />)
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2e75ba]">Historial reciente</h2>
          <p className="text-sm text-slate-600">Atenciones y citas anteriores registradas en tu portal.</p>
          {history.length === 0 ? (
            <PortalEmptyState
              title="Aún no hay historial."
              description="Cuando completes tu primera atención, quedará registrada aquí."
            />
          ) : (
            history.map((item) => <PortalAppointmentCard key={`${item.source}-${item.id}`} item={item} section="history" />)
          )}
        </div>
      </div>

      {upcoming.length > 0 ? (
        <p className="rounded-xl border border-[#d9e8fa] bg-[#f6fbff] px-3 py-2 text-xs text-slate-600">
          Próxima cita registrada: <span className="font-semibold text-slate-700">{formatPortalDateTime(upcoming[0]?.date)}</span>
        </p>
      ) : null}

      {upcoming.length === 0 && history.length > 0 ? (
        <p className="rounded-xl border border-[#d9e8fa] bg-[#f6fbff] px-3 py-2 text-xs text-slate-600">
          Última atención registrada: <span className="font-semibold text-slate-700">{formatPortalDate(history[0]?.date)}</span>
        </p>
      ) : null}
    </section>
  );
}
