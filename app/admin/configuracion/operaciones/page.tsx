import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromCookies } from "@/lib/auth";
import { canAccessOpsHealth } from "@/lib/ops/rbac";
import OpsOperationsNav from "@/components/configuracion/OpsOperationsNav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/admin/configuracion/operaciones/observabilidad",
    title: "Observabilidad",
    detail: "CPU/RAM/red por contenedor desde Prometheus+cAdvisor."
  },
  {
    href: "/admin/configuracion/operaciones/alertas",
    title: "Historial & Alertas",
    detail: "Snapshots automáticos, dedupe de alertas y notificación operativa."
  },
  {
    href: "/admin/configuracion/operaciones/recursos",
    title: "Recursos",
    detail: "Ajusta límites CPU/RAM y recrea servicios de forma controlada."
  },
  {
    href: "/admin/configuracion/operaciones/acciones",
    title: "Acciones críticas",
    detail: "Reset de configuración y reset de datos con OTP y auditoría."
  },
  {
    href: "/admin/configuracion/operaciones/health",
    title: "Health & Auditoría",
    detail: "Estado actual, historial de checks y trazabilidad operativa."
  }
];

export default async function OperacionesPage() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");

  if (!canAccessOpsHealth(user)) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        No autorizado. Esta vista requiere rol <span className="font-semibold">SUPER_ADMIN</span> u{" "}
        <span className="font-semibold">OPS</span>.
      </div>
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
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 shadow-sm transition hover:border-[#4aadf5]"
          >
            <p className="text-sm font-semibold text-[#2e75ba]">{card.title}</p>
            <p className="mt-1 text-xs text-slate-600">{card.detail}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
