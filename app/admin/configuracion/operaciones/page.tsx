import Link from "next/link";
import { Lock } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import ConfigAccessDeniedCard from "@/components/configuracion/ConfigAccessDeniedCard";
import OpsOperationsNav from "@/components/configuracion/OpsOperationsNav";
import { canAccessConfigOps } from "@/lib/security/configCapabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cards = [
  {
    href: null,
    title: "Observabilidad",
    detail: "CPU/RAM/red por contenedor desde Prometheus+cAdvisor.",
    available: false
  },
  {
    href: "/admin/configuracion/operaciones/alertas",
    title: "Historial & Alertas",
    detail: "Snapshots automáticos, dedupe de alertas y notificación operativa.",
    available: true
  },
  {
    href: null,
    title: "Recursos",
    detail: "Ajusta límites CPU/RAM y recrea servicios de forma controlada.",
    available: false
  },
  {
    href: null,
    title: "Acciones críticas",
    detail: "Reset de configuración y reset de datos con OTP y auditoría.",
    available: false
  },
  {
    href: null,
    title: "Health & Auditoría",
    detail: "Estado actual, historial de checks y trazabilidad operativa.",
    available: false
  }
];

export default async function OperacionesPage() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  if (!canAccessConfigOps(user)) {
    return (
      <ConfigAccessDeniedCard
        sectionLabel="Operaciones"
        requirementLabel="rol SUPER_ADMIN u OPS"
      />
    );
  }

  return (
    <div className="space-y-4 text-[#0f172a]" style={{ fontFamily: '"Inter", "Nunito Sans", var(--font-sans)' }}>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración · Operaciones</p>
        <h1 className="text-xl font-semibold" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
          Centro de operación
        </h1>
        <p className="text-xs text-slate-600">Monitoreo, control de recursos y acciones seguras para Compose.</p>
      </div>

      <OpsOperationsNav currentPath="/admin/configuracion/operaciones" />

      <section className="grid gap-3 lg:grid-cols-2">
        {cards.map((card) =>
          card.available && card.href ? (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm transition hover:border-[#4aadf5]"
            >
              <p className="text-sm font-semibold text-[#2e75ba]">{card.title}</p>
              <p className="mt-1 text-xs text-slate-600">{card.detail}</p>
            </Link>
          ) : (
            <div
              key={card.title}
              className="rounded-xl border border-dashed border-slate-200 bg-slate-100 p-4 shadow-sm"
              title="Disponible próximamente"
            >
              <p className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                <Lock className="h-4 w-4" aria-hidden="true" />
                {card.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">Próximamente</p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
