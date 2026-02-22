import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromCookies } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { ACTIVE_QUEUE_ITEM_STATUSES } from "@/lib/reception/queue-guards";
import { RECEPTION_AREA_LABELS, VISIT_STATUS_LABELS } from "@/lib/reception/constants";
import VisitActions from "../VisitActions";
import { VisitTimeline } from "@/components/reception/VisitTimeline";
import { buildReceptionContext } from "@/lib/reception/rbac";

export default async function ReceptionVisitDetailPage({ params }: { params: { visitId: string } }) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  const context = buildReceptionContext(user);

  const visit = await prisma.visit.findUnique({
    where: { id: params.visitId },
    include: {
      patient: { select: { firstName: true, lastName: true, phone: true } },
      queueItems: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          priority: true,
          queue: { select: { area: true } },
          room: { select: { name: true } },
          createdAt: true
        }
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          eventType: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actorUser: { select: { name: true, email: true } }
        }
      },
      operationalIncidents: {
        orderBy: { reportedAt: "desc" },
        take: 5,
        select: { id: true, status: true, severity: true, description: true }
      }
    }
  });

  if (!visit) notFound();

  if (!isAdmin(user) && user.branchId && visit.siteId && visit.siteId !== user.branchId) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        No autorizado para esta visita.
      </div>
    );
  }

  const patientName = [visit.patient?.firstName, visit.patient?.lastName].filter(Boolean).join(" ") || "Paciente";
  const hasActiveQueueItem = visit.queueItems.some((item) =>
    (ACTIVE_QUEUE_ITEM_STATUSES as readonly unknown[]).includes(item.status)
  );
  const lastHoldEvent = visit.events.find((event) => event.toStatus === "ON_HOLD");
  const resumeStatus = lastHoldEvent?.fromStatus ?? null;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Visita</p>
            <h2 className="text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              {visit.ticketCode}
            </h2>
            <p className="text-sm text-slate-600">{patientName}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-[#4aadf5]/10 px-3 py-1 text-[#2e75ba]">
                {RECEPTION_AREA_LABELS[visit.currentArea] || visit.currentArea}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {VISIT_STATUS_LABELS[visit.status] ?? visit.status}
              </span>
            </div>
          </div>
          <VisitActions
            visitId={visit.id}
            siteId={visit.siteId}
            status={visit.status}
            currentArea={visit.currentArea}
            canEnqueue={!hasActiveQueueItem}
            capabilities={context.capabilities}
            resumeStatus={resumeStatus}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Timeline</p>
          <h3 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            Eventos de visita
          </h3>
          <div className="mt-4">
            <VisitTimeline
              events={visit.events.map((event) => ({
                id: event.id,
                eventType: event.eventType,
                fromStatus: event.fromStatus,
                toStatus: event.toStatus,
                note: event.note,
                createdAt: event.createdAt,
                actorUserName: event.actorUser?.name ?? event.actorUser?.email ?? null
              }))}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Colas</p>
            <h3 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Ítems recientes
            </h3>
            <div className="mt-3 space-y-2">
              {visit.queueItems.length === 0 ? (
                <p className="text-sm text-slate-500">Sin ítems en cola.</p>
              ) : (
                visit.queueItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>{item.queue.area}</span>
                      <span className="text-xs text-slate-500">{item.status}</span>
                    </div>
                    {item.room?.name && <p className="text-xs text-slate-500">{item.room.name}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Incidentes</p>
            <h3 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Operación
            </h3>
            <div className="mt-3 space-y-2">
              {visit.operationalIncidents.length === 0 ? (
                <p className="text-sm text-slate-500">Sin incidentes registrados.</p>
              ) : (
                visit.operationalIncidents.map((incident) => (
                  <div key={incident.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {incident.severity} · {incident.status}
                    </p>
                    <p>{incident.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
