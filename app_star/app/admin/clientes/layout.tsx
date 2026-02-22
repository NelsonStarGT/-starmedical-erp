import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { Montserrat, Inter } from "next/font/google";
import ModuleTabs, { type ModuleTab } from "@/components/layout/ModuleTabs";
import { cn } from "@/lib/utils";
import { getSessionUserFromCookies } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-clients-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-clients-body" });

const clientsTabs: ModuleTab[] = resolveModuleTabs("clientes", {
  hrefs: {
    dashboard: "/admin/clientes",
    personas: "/admin/clientes/personas",
    empresas: "/admin/clientes/empresas",
    instituciones: "/admin/clientes/instituciones",
    aseguradoras: "/admin/clientes/aseguradoras",
    configuracion: "/admin/clientes/configuracion"
  }
})
  .filter((tab) => tab.key !== "documentos")
  .map(({ label, href, matchPrefix, disabled }) => ({ label, href, matchPrefix, disabled }));

export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  if (!isAdmin(user)) forbidden();

  return (
    <div className={cn(headingFont.variable, bodyFont.variable, "space-y-6 font-[var(--font-clients-body)]")}>
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">
          Clientes · Account Master
        </p>
        <h1
          className="mt-2 text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-clients-heading)" }}
        >
          Personas, empresas, instituciones y aseguradoras
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Crear primero, completar después. Sin finanzas aquí: solo datos maestros y documentos.
        </p>
        <div className="mt-4">
          <ModuleTabs tabs={clientsTabs} variant="diagnostics" />
        </div>
      </section>
      {children}
    </div>
  );
}
