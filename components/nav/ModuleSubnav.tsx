"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ModuleNavItem } from "@/components/nav/moduleNavRegistry";
import { SubscriptionsHeader } from "@/components/subscriptions/SubscriptionsHeader";
import {
  SubscriptionsPrimaryNav,
  type SubscriptionsPrimaryNavItem
} from "@/components/subscriptions/SubscriptionsPrimaryNav";
import { NavPills, type NavPillItem } from "@/components/subscriptions/NavPills";

type ModuleSubnavProps = {
  moduleKey: string;
  moduleLabel: string;
  items: ModuleNavItem[];
  sticky?: boolean;
};

type GuardStore = Map<string, string>;
type SubscriptionsSection = "dashboard" | "membresias" | "farmacia" | "pasarela" | "configuracion";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function matchesPathPrefix(pathname: string, prefix: string) {
  if (pathname === prefix) return true;
  if (!pathname.startsWith(prefix)) return false;
  return pathname.charAt(prefix.length) === "/";
}

function getGuardStore() {
  if (typeof window === "undefined") return null;
  const host = window as unknown as Record<string, unknown>;
  const key = "__STAR_MODULE_SUBNAV_GUARD__";
  const existing = host[key];
  if (existing instanceof Map) {
    return existing as GuardStore;
  }
  const created: GuardStore = new Map<string, string>();
  host[key] = created;
  return created;
}

function getSubscriptionsSection(pathname: string): SubscriptionsSection {
  if (matchesPathPrefix(pathname, "/admin/suscripciones/membresias")) return "membresias";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/farmacia")) return "farmacia";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/pasarela")) return "pasarela";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/configuracion")) return "configuracion";
  return "dashboard";
}

export default function ModuleSubnav({
  moduleKey,
  moduleLabel,
  items,
  sticky = true
}: ModuleSubnavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => new URLSearchParams(searchParams?.toString() || ""),
    [searchParams]
  );

  const instanceId = useId();
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    const store = getGuardStore();
    if (!store) {
      setIsDuplicate(false);
      return;
    }

    const owner = store.get(moduleKey);
    if (owner && owner !== instanceId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[ModuleSubnav] Render duplicado detectado para "${moduleKey}". ` +
            "Quita la segunda instancia en layout/page."
        );
      }
      setIsDuplicate(true);
      return;
    }

    store.set(moduleKey, instanceId);
    setIsDuplicate(false);

    return () => {
      if (store.get(moduleKey) === instanceId) {
        store.delete(moduleKey);
      }
    };
  }, [instanceId, moduleKey]);

  const isItemActive = (item: ModuleNavItem) => {
    if (item.isActive) return item.isActive({ pathname, search });
    const base = item.matchPrefix || item.href;
    return matchesPathPrefix(pathname, base);
  };

  const resolveHref = (item: ModuleNavItem) => {
    const keys = item.preserveQueryKeys || [];
    if (!keys.length) return item.href;
    const next = new URLSearchParams();
    keys.forEach((key) => {
      const value = search.get(key);
      if (value) next.set(key, value);
    });
    const qs = next.toString();
    return qs ? `${item.href}?${qs}` : item.href;
  };

  if (isDuplicate) return null;

  if (moduleKey === "suscripciones") {
    const section = getSubscriptionsSection(pathname);
    const primaryNavItems: SubscriptionsPrimaryNavItem[] = items.map((item) => ({
      key: item.key,
      label: item.label,
      href: resolveHref(item),
      icon: item.icon,
      active: isItemActive(item)
    }));
    const preserveFocus = search.get("focus");
    const withQuery = (href: string, entries?: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      if (preserveFocus) params.set("focus", preserveFocus);
      Object.entries(entries || {}).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const qs = params.toString();
      return qs ? `${href}?${qs}` : href;
    };

    const secondaryNavItems: NavPillItem[] = (() => {
      if (section === "membresias") {
        return [
          {
            key: "catalogo",
            label: "Catálogo",
            href: withQuery("/admin/suscripciones/membresias"),
            active: pathname === "/admin/suscripciones/membresias"
          },
          {
            key: "afiliaciones",
            label: "Afiliaciones",
            href: withQuery("/admin/suscripciones/membresias/afiliaciones/pacientes"),
            active:
              matchesPathPrefix(pathname, "/admin/suscripciones/membresias/afiliaciones") ||
              matchesPathPrefix(pathname, "/admin/suscripciones/membresias/contratos")
          },
          {
            key: "planes",
            label: "Planes",
            href: withQuery("/admin/suscripciones/membresias/planes"),
            active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/planes")
          },
          {
            key: "renovaciones",
            label: "Renovaciones",
            href: withQuery("/admin/suscripciones/membresias/renovaciones"),
            active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/renovaciones")
          },
          {
            key: "impresion",
            label: "Impresión",
            href: withQuery("/admin/suscripciones/membresias/impresion"),
            active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/impresion")
          },
          {
            key: "configuracion",
            label: "Configuración",
            href: withQuery("/admin/suscripciones/membresias/configuracion"),
            active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/configuracion")
          }
        ];
      }

      if (section === "farmacia") {
        const tab = String(search.get("tab") || "").toLowerCase();
        return [
          {
            key: "cola",
            label: "Cola operativa",
            href: withQuery("/admin/suscripciones/farmacia", { tab: "cola" }),
            active: tab === "cola"
          },
          {
            key: "suscripciones",
            label: "Suscripciones",
            href: withQuery("/admin/suscripciones/farmacia"),
            active: !tab || tab === "medicamentos"
          },
          {
            key: "descuento",
            label: "Descuento",
            href: withQuery("/admin/suscripciones/farmacia", { tab: "descuento" }),
            active: tab === "descuento",
            disabled: true,
            badge: "Próximamente"
          },
          {
            key: "configuracion",
            label: "Configuración",
            href: withQuery("/admin/suscripciones/farmacia", { tab: "config" }),
            active: tab === "config"
          }
        ];
      }

      return [];
    })();

    return (
      <div className={cn("w-full", sticky && "sticky z-30 [top:var(--admin-header-offset,72px)]")}>
        <div className="rounded-xl border border-slate-200 bg-[#FFFFFF] shadow-sm">
          <div className="space-y-3 px-4 py-4">
            <SubscriptionsHeader />
            <SubscriptionsPrimaryNav items={primaryNavItems} />
            {secondaryNavItems.length ? (
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
                <NavPills items={secondaryNavItems} ariaLabel="Subnavegación de Suscripciones" />
              </div>
            ) : null}
          </div>
        </div>
        <div className="h-4" />
      </div>
    );
  }

  return (
    <div className={cn("w-full", sticky && "sticky z-30 [top:var(--admin-header-offset,72px)]")}>
      <div className="rounded-xl border border-slate-200 bg-[#FFFFFF] shadow-sm">
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#2e75ba]">
            NAVEGACION CONTEXTUAL · {moduleLabel}
          </p>
          <span className="hidden text-xs text-slate-500 sm:block" />
        </div>

        <div className="px-2 pb-3 pt-3">
          <div className="flex gap-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.key}
                  href={resolveHref(item)}
                  className={cn(
                    "group inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                      : "border-slate-200 bg-[#FFFFFF] text-slate-700 hover:bg-[#F8FAFC]"
                  )}
                >
                  {Icon ? (
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "text-[#4aa59c]" : "text-slate-500 group-hover:text-[#4aa59c]"
                      )}
                    />
                  ) : null}
                  <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
                  <span
                    className={cn("ml-1 h-1.5 w-1.5 rounded-full", active ? "bg-[#4aadf5]" : "bg-transparent")}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="h-4" />
    </div>
  );
}
