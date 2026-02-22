import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auditPortalView } from "@/lib/portal/audit";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";
import { PortalAppointmentRequestForm } from "@/components/portal/PortalAppointmentRequestForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalAppointmentNewPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "appointments_new",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const [appointmentTypes, branches] = await Promise.all([
    prisma.appointmentType.findMany({
      where: { status: "Activo" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMin: true }
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Citas</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Solicitar cita</h2>
        <p className="mt-2 text-sm text-slate-600">
          Elige tu fecha y horario preferido. Recepción confirmará.
        </p>
        <Link href="/portal/app/appointments" className="mt-4 inline-flex text-sm font-semibold text-[#2e75ba] hover:text-[#245f96]">
          Volver a Mis citas
        </Link>
      </div>

      <PortalAppointmentRequestForm appointmentTypes={appointmentTypes} branches={branches} />
    </section>
  );
}
