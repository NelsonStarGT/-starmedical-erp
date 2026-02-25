import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { Montserrat, Inter } from "next/font/google";
import { getSessionUserFromCookies } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const headingFont = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-companies-heading" });
const bodyFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-companies-body" });

export default async function EmpresasLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  if (!isAdmin(user)) forbidden();

  return (
    <div className={cn(headingFont.variable, bodyFont.variable, "space-y-6 font-[var(--font-companies-body)]")}>
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Empresas · B2B</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-companies-heading)" }}>
          Módulo de empresas
        </h1>
        <p className="mt-1 text-sm text-slate-600">Gestión corporativa separada para empresas, instituciones y aseguradoras.</p>
      </section>
      {children}
    </div>
  );
}
