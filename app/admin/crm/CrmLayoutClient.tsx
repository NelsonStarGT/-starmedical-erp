"use client";

import type { CSSProperties } from "react";
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

  const densityVars = {
    "--crm-row-h": "44px",
    "--crm-control-h": "36px",
    "--crm-gap": "12px",
    "--crm-card-pad": "16px"
  } as CSSProperties;

  return (
    <div style={densityVars} className="space-y-[var(--crm-gap)]">
      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {typeOptions.map((option) => {
              const active = activeType === option.key;
              return (
                <Link
                  key={option.key}
                  href={switchTypeHref(option.key)}
                  className={cn(
                    "inline-flex h-[var(--crm-control-h)] items-center rounded-lg px-3 text-sm font-semibold transition",
                    active ? "bg-[#2e75ba] text-white" : "text-slate-600 hover:text-[#2e75ba]"
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={withParams("/admin/crm/new")}
              className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white transition hover:bg-[#4aadf5]"
            >
              Nueva oportunidad
            </Link>
            <Link
              href="/admin/crm/settings"
              className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Configuración
            </Link>
            <Link
              href="/admin/crm/audit"
              className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Auditoría
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
        {views.map((view) => {
          const href = withParams(view.href);
          const active = pathname.startsWith(view.href);
          return (
            <Link
              key={view.key}
              href={href}
              className={cn(
                "inline-flex h-[var(--crm-control-h)] items-center rounded-lg px-3 text-sm font-medium transition",
                active
                  ? "bg-[#2e75ba] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
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
