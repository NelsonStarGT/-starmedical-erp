"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CRM_PIPELINE_TYPES } from "@/lib/crmConfig";

const typeOptions = [
  { key: "b2b", label: CRM_PIPELINE_TYPES.b2b.label },
  { key: "b2c", label: CRM_PIPELINE_TYPES.b2c.label }
] as const;

const views = [
  { key: "inbox", label: "Bandeja", href: "/admin/crm/inbox" },
  { key: "pipeline", label: "Pipeline", href: "/admin/crm/pipeline" },
  { key: "list", label: "Worklist", href: "/admin/crm/list" },
  { key: "calendario", label: "Calendario", href: "/admin/crm/calendario" }
] as const;

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get("type") || "b2b";
  const activeType = typeParam.toLowerCase() === "b2c" ? "b2c" : "b2b";
  const paramsString = searchParams?.toString() || "";

  const withParams = (href: string, keepType = true) => {
    const params = new URLSearchParams(paramsString);
    if (keepType) params.set("type", activeType);
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  const switchTypeHref = (type: "b2b" | "b2c") => {
    const params = new URLSearchParams(paramsString);
    params.set("type", type);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {typeOptions.map((option) => {
              const active = activeType === option.key;
              return (
                <Link
                  key={option.key}
                  href={switchTypeHref(option.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    active ? "bg-slate-900 text-white shadow-soft" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={withParams("/admin/crm/new")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Nueva oportunidad
          </Link>
          <Link
            href="/admin/crm/settings"
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {views.map((view) => {
          const href = withParams(view.href);
          const active = pathname.startsWith(view.href);
          return (
            <Link
              key={view.key}
              href={href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                active ? "bg-slate-900 text-white shadow-soft" : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
