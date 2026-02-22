'use client';

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIdentityConfig } from "@/hooks/useIdentityConfig";
import { initialsFromIdentity } from "@/lib/identity";
import { filterNavSections, navSections } from "./nav";

export default function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
}) {
  const { identity } = useIdentityConfig();
  const pathname = usePathname();
  const logoUrl = identity.logoUrl;
  const sections = filterNavSections(navSections, {
    canAccessReception,
    canAccessMedicalCommissions,
    canAccessMedicalOperations,
    canAccessMedicalConfig,
    canAccessPortales
  });
  const suppressSidebarChildren = pathname?.startsWith("/admin/clientes") ?? false;

  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 overflow-y-auto bg-gradient-to-b from-brand-navy via-brand-midnight to-[#050d1a] py-6 text-white shadow-2xl transition-[width,padding] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-20 px-2" : "w-64 px-4"
      )}
    >
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(500px_at_30%_10%,rgba(44,211,255,0.3),transparent)]" />
      <div className={cn("relative pb-5", collapsed ? "px-1" : "px-3")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 object-contain shadow"
            />
          ) : (
            <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center font-semibold shadow">
              {initialsFromIdentity({
                orgName: identity.name,
                appName: identity.name,
                tenantId: identity.tenantId
              })}
            </div>
          )}
          {!collapsed && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.25rem] text-white/70">{identity.name}</p>
              <h2 className="text-xl font-semibold text-white">ERP</h2>
            </div>
          )}
        </div>
        {!collapsed && (
          <p className="mt-3 text-xs text-white/60 leading-relaxed">
            Gestión integral con foco en CRM, finanzas e inventario.
          </p>
        )}
      </div>
      <div className={cn("relative pb-3", collapsed ? "px-1" : "px-3")}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          aria-pressed={collapsed}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleCollapsed?.();
            }
          }}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50",
            collapsed ? "mx-auto" : ""
          )}
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
      </div>
      <nav className="relative space-y-4 pb-4">
        {sections.map((section) => (
          <div key={section.sectionLabel} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 text-[11px] uppercase tracking-[0.25rem] text-white/50">{section.sectionLabel}</p>
            ) : (
              <p className="sr-only">{section.sectionLabel}</p>
            )}
            {section.items.map((item) => {
              const itemKey = item.href || item.label;
              const isPortalesItem = item.href === "/admin/portales";
              const childActive =
                !suppressSidebarChildren &&
                item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href));
              const isActive =
                childActive || pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

              const linkClasses = cn(
                "group flex items-center rounded-xl py-2 text-sm font-semibold transition border border-transparent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1322]",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? isPortalesItem
                    ? "bg-brand-primary text-white border-brand-secondary/50 shadow-md shadow-brand-primary/35"
                    : "bg-white/10 text-white border-white/20 shadow-lg shadow-brand-primary/20"
                  : isPortalesItem
                    ? "text-white/80 hover:text-white hover:bg-brand-primary/25 hover:border-brand-secondary/60"
                    : "text-white/70 hover:text-white hover:bg-white/5 hover:border-white/10"
              );

              const linkContent = (
                <Link href={item.href} className={linkClasses} title={collapsed ? (item.tooltip ?? item.label) : undefined}>
                  {item.icon && <item.icon className="h-5 w-5" />}
                  {!collapsed && item.label}
                </Link>
              );

              if (item.disabled) {
                return (
                  <div
                    key={itemKey}
                    className={cn(
                      "flex items-center rounded-xl py-2 text-sm font-semibold text-white/30 border border-dashed border-white/10 cursor-not-allowed",
                      collapsed ? "justify-center px-2" : "gap-3 px-3"
                    )}
                    title={collapsed ? (item.tooltip ?? item.label) : undefined}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    {!collapsed && item.label}
                  </div>
                );
              }

              return (
                <div key={itemKey} className="space-y-1">
                  {linkContent}
                  {!collapsed && item.children && !suppressSidebarChildren && (
                    <div className="ml-9 space-y-1">
                      {item.children.map((child) => {
                        const childKey = child.href || child.label;
                        const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                        const childClasses = cn(
                          "block rounded-lg px-2 py-1 text-sm font-medium transition",
                          isChildActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                        );
                        return (
                          <Link key={childKey} href={child.href} className={childClasses}>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
