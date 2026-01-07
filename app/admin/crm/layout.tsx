"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CRM_PIPELINE_TYPES } from "@/lib/crmConfig";

const modules = [
  { key: "empresas", label: CRM_PIPELINE_TYPES.b2b.label, href: "/admin/crm/empresas/inicio" },
  { key: "pacientes", label: CRM_PIPELINE_TYPES.b2c.label, href: "/admin/crm/pacientes/inicio" }
] as const;

const tabs = [
  { key: "inicio", label: "Inicio" },
  { key: "cotizaciones", label: "Cotizaciones" },
  { key: "historial", label: "Historial" }
] as const;

function findActiveModule(pathname: string) {
  const match = modules.find((item) => pathname.startsWith(`/admin/crm/${item.key}`));
  return match?.key ?? null;
}

function findActiveTab(pathname: string) {
  const tab = tabs.find((item) => pathname.includes(`/${item.key}`));
  return tab?.key ?? null;
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeModule = findActiveModule(pathname);
  const activeTab = findActiveTab(pathname);
  const isDashboard = pathname.startsWith("/admin/crm/dashboard");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/crm/dashboard"
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              isDashboard ? "bg-slate-900 text-white border-slate-900 shadow-soft" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            Dashboard
          </Link>
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {modules.map((mod) => {
              const active = activeModule === mod.key;
              return (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    active ? "bg-slate-900 text-white shadow-soft" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {mod.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/crm/configuracion"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Configuración
          </Link>
          <Link
            href="/admin/crm/audit"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Auditoría
          </Link>
        </div>
      </div>

      {activeModule ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {tabs.map((tab) => {
            const href = `/admin/crm/${activeModule}/${tab.key}`;
            const active = activeTab === tab.key;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active ? "bg-slate-900 text-white shadow-soft" : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="h-px bg-slate-200" />
      )}
      {children}
    </div>
  );
}
