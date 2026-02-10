import { headers } from "next/headers";
import Link from "next/link";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalAppointments } from "@/lib/portal/data";
import { formatPortalDateTime } from "@/lib/portal/format";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-4 py-6 text-sm text-slate-500">{label}</p>;
}

function AppointmentCard({
  title,
  subtitle,
  meta,
  tone
}: {
  title: string;
  subtitle: string;
  meta: string;
  tone: "default" | "success";
}) {
  return (
    <article
      className={
        tone === "success"
          ? "rounded-2xl border border-[#cde7e4] bg-[#eff8f7] p-4 shadow-sm"
          : "rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm"
      }
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[#2e75ba]">{meta}</p>
    </article>
  );
}

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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Citas</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Próximas e historial</h2>
        <p className="mt-2 text-sm text-slate-600">
          Revisa tus citas confirmadas y las últimas atenciones registradas en recepción.
        </p>
        <Link
          href="/portal/app/appointments/new"
          className="mt-4 inline-flex rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:border-[#4aadf5]"
        >
          Solicitar cita
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Próximas citas</h3>
          {upcoming.length === 0 ? (
            <EmptyState label="No tienes citas próximas. Puedes solicitar una cita en recepción." />
          ) : (
            upcoming.map((item) => (
              <AppointmentCard
                key={item.id}
                title={formatPortalDateTime(item.date)}
                subtitle={`${item.typeName || "Consulta"} · ${item.status}`}
                meta={item.notes || "Sin notas adicionales"}
                tone="success"
              />
            ))
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Historial reciente</h3>
          {history.length === 0 ? (
            <EmptyState label="Aún no hay historial de citas o visitas para este perfil." />
          ) : (
            history.map((item) => (
              <AppointmentCard
                key={`${item.source}-${item.id}`}
                title={formatPortalDateTime(item.date)}
                subtitle={`${item.source === "VISIT" ? "Visita" : "Cita"} · ${item.status}`}
                meta={`${item.typeName || "General"}${item.siteName ? ` · ${item.siteName}` : ""}`}
                tone="default"
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
