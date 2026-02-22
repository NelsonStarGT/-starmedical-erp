import Link from "next/link";
import { headers } from "next/headers";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalDashboardSummary } from "@/lib/portal/data";
import { formatPortalDateTime } from "@/lib/portal/format";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "dashboard",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const summary = await getPortalDashboardSummary(session.client);

  const quickCards = [
    {
      title: "Próxima cita",
      value: summary.nextAppointment ? formatPortalDateTime(summary.nextAppointment.date) : "Sin cita programada",
      detail: summary.nextAppointment?.typeName || "Agenda abierta",
      href: "/portal/app/appointments"
    },
    {
      title: "Citas próximas",
      value: String(summary.upcomingAppointments),
      detail: "Próximos eventos confirmados",
      href: "/portal/app/appointments"
    },
    {
      title: "Facturas pendientes",
      value: String(summary.pendingInvoices),
      detail: "Documentos pendientes de pago",
      href: "/portal/app/invoices"
    },
    {
      title: "Resultados recientes",
      value: String(summary.recentResults),
      detail: "Últimos 30 días",
      href: "/portal/app/results"
    }
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">PORTAL DEL PACIENTE</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Panel principal</h2>
        <p className="mt-2 text-sm text-slate-600">Bienvenido. Aquí puedes gestionar tus citas, facturas y membresías.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-2xl border border-[#dbe8f9] bg-white p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">{card.title}</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-sm text-slate-600">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/portal/app/appointments"
          className="rounded-2xl border border-[#cde7e4] bg-[#eff8f7] p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">Acceso rápido</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Mis citas</h3>
          <p className="mt-1 text-sm text-slate-600">Consulta próximas citas y tu historial de visitas.</p>
        </Link>

        <Link
          href="/portal/app/invoices"
          className="rounded-2xl border border-[#dbe8f9] bg-[#f6fbff] p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acceso rápido</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Mis facturas</h3>
          <p className="mt-1 text-sm text-slate-600">
            Revisa estado de pago y descarga adjuntos disponibles de recepción/facturación.
          </p>
        </Link>

        <Link
          href="/portal/app/results"
          className="rounded-2xl border border-[#dbe8f9] bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acceso rápido</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Mis resultados</h3>
          <p className="mt-1 text-sm text-slate-600">
            Visualiza órdenes recientes de laboratorio e imagen diagnóstica.
          </p>
        </Link>

        <Link
          href="/portal/app/membership"
          className="rounded-2xl border border-[#d7ebfb] bg-[#f4faff] p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acceso rápido</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Mi membresía</h3>
          <p className="mt-1 text-sm text-slate-600">Consulta estado de tu plan y beneficios disponibles.</p>
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Nota</p>
        <p className="mt-2 text-sm text-slate-600">
          Las facturas se muestran según la correspondencia entre tu perfil y terceros financieros.
          Si falta alguna, solicita validación en recepción.
        </p>
        {summary.nextAppointment && (
          <p className="mt-2 text-sm font-medium text-slate-800">
            Próxima cita: {formatPortalDateTime(summary.nextAppointment.date)} ({summary.nextAppointment.typeName || "General"})
          </p>
        )}
        {summary.pendingInvoices > 0 && (
          <p className="mt-1 text-sm font-medium text-[#1f6f68]">
            Facturas pendientes detectadas: {summary.pendingInvoices}
          </p>
        )}
        {summary.invoiceWarning && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {summary.invoiceWarning}
          </p>
        )}
      </div>
    </section>
  );
}
