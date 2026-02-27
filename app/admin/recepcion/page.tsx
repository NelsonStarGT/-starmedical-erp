import Link from "next/link";
import { CalendarPlus2, CircleDollarSign, ClipboardCheck, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SearchClientBar from "@/components/recepcion/SearchClientBar";
import {
  RECEPCION_ADMISSIONS_MOCK,
  RECEPCION_DASHBOARD_KPIS
} from "@/lib/recepcion/mock";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

function QuickActionCard({
  href,
  title,
  detail,
  icon: Icon
}: {
  href: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#4aadf5]"
    >
      <div className="inline-flex rounded-lg bg-[#4aa59c]/10 p-2 text-[#4aa59c]">
        <Icon size={16} />
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </Link>
  );
}

export default async function RecepcionDashboardPage() {
  await requireRecepcionCapability("RECEPTION_VIEW");

  return (
    <div className="space-y-4">
      <SearchClientBar />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {RECEPCION_DASHBOARD_KPIS.map((kpi) => (
          <article key={kpi.key} className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Hoy</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
              {kpi.value}
            </p>
            <p className="mt-1 text-sm text-slate-600">{kpi.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acciones rápidas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              href="/admin/clientes/personas/nuevo"
              title="Nuevo cliente"
              detail="Deep link a registro de persona o empresa."
              icon={UserPlus}
            />
            <QuickActionCard
              href="/admin/recepcion/citas"
              title="Crear cita"
              detail="Slot preparado para agenda del día."
              icon={CalendarPlus2}
            />
            <QuickActionCard
              href="/admin/recepcion/admisiones"
              title="Check-in"
              detail="Flujo guiado en 3 pasos para admisión."
              icon={ClipboardCheck}
            />
            <QuickActionCard
              href="/admin/recepcion/caja"
              title="Cobro rápido"
              detail="Caja v1 con total y método de pago."
              icon={CircleDollarSign}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Últimas admisiones</h2>
            <Link href="/admin/recepcion/admisiones" className="text-xs font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Ver flujo
            </Link>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Ticket</th>
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-left font-semibold">Hora</th>
                </tr>
              </thead>
              <tbody>
                {RECEPCION_ADMISSIONS_MOCK.map((row, index) => (
                  <tr key={row.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.ticket}</td>
                    <td className="px-3 py-2 text-slate-800">{row.clientName}</td>
                    <td className="px-3 py-2 text-slate-600">{row.at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
