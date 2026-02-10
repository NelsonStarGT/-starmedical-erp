import Link from "next/link";
import { headers } from "next/headers";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalMembershipSummary } from "@/lib/portal/data";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalMembershipPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "membership",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const summary = await getPortalMembershipSummary(session.clientId);
  const membershipLabel = summary.hasMembership
    ? `Membresía activa: ${summary.planName || "Plan asignado"}`
    : "Sin membresía activa";

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Membresía</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Mi membresía</h2>
        <p className="mt-2 text-sm text-slate-600">Consulta el estado de tu plan y los beneficios disponibles.</p>
      </div>

      {summary.isPlaceholder ? (
        <div className="rounded-2xl border border-[#d7ebfb] bg-[#f4faff] px-4 py-3 text-sm text-[#2e75ba] shadow-sm">
          Módulo en configuración. Recepción confirmará tu plan.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <article className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Estado actual</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-900">{membershipLabel}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {summary.hasMembership
              ? "Tu plan está habilitado para el uso de beneficios configurados."
              : "Aún no se registra una membresía activa para este perfil."}
          </p>
          {!summary.hasMembership ? (
            <Link
              href="/portal/app/appointments/new"
              className="mt-4 inline-flex items-center rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f978e]"
            >
              Solicitar cita
            </Link>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[#cde7e4] bg-[#eff8f7] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">Beneficios usados</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {summary.used} / {summary.total}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {summary.total > 0
              ? "Resumen rápido de uso dentro de tu plan actual."
              : "Cuando tengas un plan activo, aquí verás el avance de beneficios."}
          </p>
        </article>
      </div>

      <article className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#2e75ba]">Beneficios</h3>
          <span className="rounded-full bg-[#f4faff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
            {summary.benefits.length} configurados
          </span>
        </div>

        {summary.benefits.length > 0 ? (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {summary.benefits.slice(0, 6).map((benefit, index) => (
              <li
                key={`${benefit}-${index}`}
                className="rounded-xl border border-[#dbe8f9] bg-[#f8fbff] px-4 py-3 text-sm text-slate-700"
              >
                {benefit}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-[#dbe8f9] bg-[#f8fbff] px-4 py-3 text-sm text-slate-600">
            No hay beneficios registrados por ahora.
          </p>
        )}
      </article>
    </section>
  );
}
