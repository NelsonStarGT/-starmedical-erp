import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Montserrat } from "next/font/google";
import { CalendarPlus2, CircleDollarSign, UserPlus, UserRoundCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-recepcion-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-recepcion-body" });

export const metadata: Metadata = {
  title: "Recepción | StarMedical ERP"
};

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#4aadf5] hover:text-[#2e75ba]"
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

export default async function RecepcionLayout({ children }: { children: React.ReactNode }) {
  const { access } = await requireRecepcionCapability("RECEPTION_VIEW");

  return (
    <div className={cn(headingFont.variable, bodyFont.variable, "space-y-4 font-[var(--font-recepcion-body)]")}>
      <section className="rounded-xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2e75ba]">Front Desk</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-recepcion-heading)" }}>
              Recepción
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Consola operativa del front desk: búsqueda de clientes, cola, agenda, admisiones y caja rápida.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2e75ba]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
              Capabilities activas: {access.capabilities.length}
            </span>
            <span className="rounded-full bg-[#4aa59c]/10 px-3 py-1 text-xs font-semibold text-[#4aa59c]">
              Modo: Esqueleto v1
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <QuickLink href="/admin/clientes/personas/nuevo" label="Nuevo cliente" icon={UserPlus} />
          <QuickLink href="/admin/recepcion/citas" label="Nueva cita" icon={CalendarPlus2} />
          <QuickLink href="/admin/recepcion/admisiones" label="Check-in" icon={UserRoundCheck} />
          <QuickLink href="/admin/recepcion/caja" label="Caja rápida" icon={CircleDollarSign} />
        </div>
      </section>

      {children}
    </div>
  );
}
