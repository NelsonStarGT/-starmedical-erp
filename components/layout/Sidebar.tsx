"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIdentityConfig } from "@/hooks/useIdentityConfig";
import { initialsFromIdentity } from "@/lib/identity";
import { filterNavSections, navSections } from "./nav";

function normalizeOrderToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveItemOrderIndex(item: { label: string; href: string }, moduleOrder: string[]) {
  const hrefToken = normalizeOrderToken(item.href);
  const labelToken = normalizeOrderToken(item.label);

  for (let index = 0; index < moduleOrder.length; index += 1) {
    const token = normalizeOrderToken(moduleOrder[index] || "");
    if (!token) continue;
    if (token === hrefToken || token === labelToken) return index;
    if (hrefToken.endsWith(token)) return index;
  }

  return Number.POSITIVE_INFINITY;
}

function applyModuleOrderToSections(
  sections: ReturnType<typeof filterNavSections>,
  moduleOrder: string[],
  moduleOrderingEnabled: boolean
) {
  if (!moduleOrderingEnabled || moduleOrder.length === 0) return sections;

  return sections.map((section) => ({
    ...section,
    items: [...section.items]
      .map((item, index) => ({
        item,
        index,
        orderIndex: resolveItemOrderIndex(item, moduleOrder)
      }))
      .sort((left, right) => {
        if (left.orderIndex !== right.orderIndex) {
          return left.orderIndex - right.orderIndex;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.item)
  }));
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  forceCollapsed = false,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false,
  canAccessConfigOps = false,
  canAccessConfigProcessing = false,
  moduleOrderingEnabled = false,
  moduleOrder = []
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  forceCollapsed?: boolean;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
  canAccessConfigOps?: boolean;
  canAccessConfigProcessing?: boolean;
  moduleOrderingEnabled?: boolean;
  moduleOrder?: string[];
}) {
  const { identity } = useIdentityConfig();
  const pathname = usePathname();
  const logoUrl = identity.logoUrl;
  const filteredSections = filterNavSections(navSections, {
    canAccessReception,
    canAccessMedicalCommissions,
    canAccessMedicalOperations,
    canAccessMedicalConfig,
    canAccessPortales,
    canAccessConfigOps,
    canAccessConfigProcessing
  });
  const sections = applyModuleOrderToSections(filteredSections, moduleOrder, moduleOrderingEnabled);
  const suppressSidebarChildren = pathname?.startsWith("/admin/clientes") ?? false;

  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 overflow-y-auto border-r border-[color:rgb(var(--border-rgb)/0.9)] bg-white/95 py-4 shadow-sm transition-[width,padding] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-20 px-2" : "w-72 px-3"
      )}
    >
      <div className={cn("pb-4", collapsed ? "px-1" : "px-2")}> 
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}> 
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-11 w-11 rounded-xl border border-[color:rgb(var(--border-rgb)/0.8)] bg-white object-contain shadow-sm"
            />
          ) : (
            <div className="h-11 w-11 rounded-xl border border-[color:rgb(var(--border-rgb)/0.8)] bg-[color:rgb(var(--color-primary-rgb)/0.14)] text-[color:rgb(var(--color-structure-rgb))] flex items-center justify-center font-semibold shadow-sm">
              {initialsFromIdentity({
                orgName: identity.name,
                appName: identity.name,
                tenantId: identity.tenantId
              })}
            </div>
          )}
          {!collapsed && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2rem] text-[color:rgb(var(--color-structure-rgb)/0.8)]">{identity.name}</p>
              <h2 className="text-lg font-semibold text-[color:rgb(var(--text-rgb))]" style={{ fontFamily: "var(--font-heading)" }}>
                StarMedical ERP
              </h2>
            </div>
          )}
        </div>
      </div>

      <div className={cn("pb-4", collapsed ? "px-1" : "px-2")}> 
        <button
          type="button"
          onClick={onToggleCollapsed}
          disabled={forceCollapsed}
          aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          aria-pressed={collapsed}
          onKeyDown={(event) => {
            if (forceCollapsed) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleCollapsed?.();
            }
          }}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:rgb(var(--border-rgb))] bg-white text-[color:rgb(var(--text-rgb))] transition hover:bg-[color:rgb(var(--bg-rgb)/0.8)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--color-accent-rgb)/0.6)] disabled:cursor-not-allowed disabled:opacity-70",
            collapsed ? "mx-auto" : ""
          )}
          title={forceCollapsed ? "Política del tenant: menú fijo colapsado" : undefined}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        {!collapsed && forceCollapsed ? (
          <p className="mt-2 text-[11px] text-[color:rgb(var(--text-rgb)/0.65)]">Política activa: menú colapsado por defecto.</p>
        ) : null}
      </div>

      <nav className="space-y-4 pb-4">
        {sections.map((section) => (
          <div key={section.sectionLabel} className="space-y-1">
            {!collapsed ? (
              <p className="px-2 text-[11px] uppercase tracking-[0.18rem] text-[color:rgb(var(--color-structure-rgb)/0.76)]">
                {section.sectionLabel}
              </p>
            ) : (
              <p className="sr-only">{section.sectionLabel}</p>
            )}

            {section.items.map((item) => {
              const itemKey = item.href || item.label;
              const childActive =
                !suppressSidebarChildren &&
                item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href));
              const isActive =
                childActive || pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

              const linkClasses = cn(
                "group flex items-center rounded-lg py-2 text-sm font-semibold transition border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--color-accent-rgb)/0.7)]",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "border-[color:rgb(var(--color-accent-rgb)/0.45)] bg-[color:rgb(var(--color-primary-rgb)/0.14)] text-[color:rgb(var(--color-structure-rgb))]"
                  : "border-transparent text-[color:rgb(var(--text-rgb)/0.78)] hover:border-[color:rgb(var(--border-rgb))] hover:bg-[color:rgb(var(--bg-rgb)/0.8)] hover:text-[color:rgb(var(--text-rgb))]"
              );

              const linkContent = (
                <Link
                  href={item.href}
                  className={linkClasses}
                  title={collapsed ? (item.tooltip ?? item.label) : undefined}
                  aria-label={collapsed ? item.label : undefined}
                >
                  {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                  {!collapsed && item.label}
                </Link>
              );

              if (item.disabled) {
                return (
                  <div
                    key={itemKey}
                    className={cn(
                      "flex items-center rounded-lg border border-dashed border-[color:rgb(var(--border-rgb))] py-2 text-sm font-semibold text-[color:rgb(var(--text-rgb)/0.45)] cursor-not-allowed",
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
                  {!collapsed && item.children && !suppressSidebarChildren ? (
                    <div className="ml-9 space-y-1">
                      {item.children.map((child) => {
                        const childKey = child.href || child.label;
                        const isChildActive = pathname === child.href || pathname.startsWith(child.href);
                        const childClasses = cn(
                          "block rounded-md px-2 py-1 text-sm font-medium transition",
                          isChildActive
                            ? "bg-[color:rgb(var(--color-accent-rgb)/0.14)] text-[color:rgb(var(--color-structure-rgb))]"
                            : "text-[color:rgb(var(--text-rgb)/0.68)] hover:bg-[color:rgb(var(--bg-rgb)/0.85)] hover:text-[color:rgb(var(--text-rgb))]"
                        );
                        return (
                          <Link key={childKey} href={child.href} className={childClasses}>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
