import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { Poppins, Nunito_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getLabRoleForUser } from "@/lib/labtest/access";
import { LabRole } from "@prisma/client";
import LabTestNavTabs from "./NavTabs";

const headingFont = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-lab-heading" });
const bodyFont = Nunito_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lab-body" });

export const metadata: Metadata = {
  title: "StarMedical ERP | LabTest operativo"
};

type LabContext = {
  role: LabRole | null;
  isGlobalAdmin: boolean;
};

async function getLabContext(): Promise<LabContext> {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  const upperRoles = (user.roles || []).map((r) => r.toUpperCase());
  const isGlobalAdmin = upperRoles.includes("SUPER_ADMIN") || upperRoles.includes("ADMIN");
  const role = await getLabRoleForUser(user.id, user.branchId);
  if (!role && !isGlobalAdmin) forbidden();
  return { role, isGlobalAdmin };
}

function buildNav(context: LabContext) {
  const { role, isGlobalAdmin } = context;
  const base = [
    { label: "Dashboard", href: "/labtest" },
    { label: "Órdenes", href: "/labtest/orders" },
    { label: "Muestras", href: "/labtest/samples" },
    { label: "Workbench", href: "/labtest/workbench" },
    { label: "Resultados", href: "/labtest/results" },
    { label: "Plantillas", href: "/labtest/templates" },
    { label: "Equipos", href: "/labtest/instruments" }
  ];

  const adminOnly = [
    { label: "Bitácoras", href: "/labtest/logs/specimens" },
    { label: "Reportes", href: "/labtest/reports" },
    { label: "Catálogo", href: "/labtest/catalog" },
    { label: "Settings", href: "/labtest/settings" }
  ];

  if (isGlobalAdmin || role === "LAB_ADMIN" || role === "LAB_SUPERVISOR") {
    return [...base, ...adminOnly];
  }
  return base;
}

export default async function LabTestLayout({ children }: { children: React.ReactNode }) {
  const context = await getLabContext();
  const navLinks = buildNav(context);
  return (
    <div className={cn("min-h-screen bg-[#f8fafc]", headingFont.variable, bodyFont.variable)}>
      <header className="relative z-10 border-b border-[#dce7f5] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#2e75ba]">Área operativa</p>
            <h1 className="text-2xl font-semibold text-[#163d66] font-[var(--font-lab-heading)]">LabTest · Laboratorio Clínico</h1>
            <p className="text-sm text-slate-600 font-[var(--font-lab-body)]">Captura manual, validación y liberación sin sidebar global.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/diagnostics"
              className="rounded-full border border-[#e5edf8] bg-white px-3 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
            >
              Volver a Diagnóstico
            </Link>
            <span className="rounded-full bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white shadow-sm">Manual-first</span>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <LabTestNavTabs links={navLinks} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
