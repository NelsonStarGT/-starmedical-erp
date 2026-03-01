"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ModuleNavItem } from "@/components/nav/moduleNavRegistry";

type ModuleSubnavProps = {
  moduleKey: string;
  moduleLabel: string;
  items: ModuleNavItem[];
  sticky?: boolean;
};

type GuardStore = Map<string, string>;
type SubscriptionsMode = "operacion" | "catalogos";
type SubscriptionsSection = "dashboard" | "membresias" | "farmacia" | "configuracion";
type SecondaryNavItem = {
  key: string;
  label: string;
  href: string;
  active: boolean;
  disabled?: boolean;
  badge?: string;
};
type SubscriptionsPrimaryCta = {
  label: string;
  href: string;
};

const SUBSCRIPTIONS_MODE_STORAGE_KEY = "__STAR_SUBSCRIPTIONS_MODE__";

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

function normalizeSubscriptionsMode(raw: string | null | undefined): SubscriptionsMode | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "operacion") return "operacion";
  if (normalized === "catalogos") return "catalogos";
  return null;
}

function getSubscriptionsSection(pathname: string): SubscriptionsSection {
  if (matchesPathPrefix(pathname, "/admin/suscripciones/membresias")) return "membresias";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/farmacia")) return "farmacia";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/pasarela")) return "configuracion";
  if (matchesPathPrefix(pathname, "/admin/suscripciones/configuracion")) return "configuracion";
  return "dashboard";
}

function appendFocusToHref(href: string, mode: SubscriptionsMode) {
  const [base, query = ""] = href.split("?");
  const next = new URLSearchParams(query);
  next.set("focus", mode);
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

function getSubscriptionsPrimaryCta(section: SubscriptionsSection, mode: SubscriptionsMode): SubscriptionsPrimaryCta {
  if (mode === "operacion") {
    if (section === "farmacia") {
      return { label: "Ver cola", href: "/admin/suscripciones/farmacia?tab=cola" };
    }
    return { label: "Afiliar", href: "/admin/suscripciones/membresias/afiliaciones/pacientes" };
  }

  if (section === "farmacia") {
    return { label: "Configurar base", href: "/admin/suscripciones/membresias/configuracion" };
  }

  return { label: "Crear plan", href: "/admin/suscripciones/membresias/planes/nuevo" };
}

function getMembershipsSecondaryItems(pathname: string, mode: SubscriptionsMode): SecondaryNavItem[] {
  const operational: SecondaryNavItem[] = [
    {
      key: "afiliaciones",
      label: "Afiliaciones",
      href: "/admin/suscripciones/membresias/afiliaciones/pacientes",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/afiliaciones")
    },
    {
      key: "planes",
      label: "Planes",
      href: "/admin/suscripciones/membresias/planes",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/planes")
    },
    {
      key: "renovaciones",
      label: "Renovaciones",
      href: "/admin/suscripciones/membresias/renovaciones",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/renovaciones")
    },
    {
      key: "configuracion",
      label: "Configuración",
      href: "/admin/suscripciones/membresias/configuracion",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/membresias/configuracion")
    }
  ];

  if (mode === "operacion") return operational;
  const preferredOrder = ["planes", "configuracion", "afiliaciones", "renovaciones"];
  return preferredOrder
    .map((key) => operational.find((item) => item.key === key))
    .filter((item): item is SecondaryNavItem => Boolean(item));
}

function getPharmacySecondaryItems(pathname: string, search: URLSearchParams, mode: SubscriptionsMode): SecondaryNavItem[] {
  const currentTab = (search.get("tab") || "medicamentos").trim().toLowerCase();
  const operational: SecondaryNavItem[] = [
    {
      key: "cola",
      label: "Cola operativa",
      href: "/admin/suscripciones/farmacia?tab=cola",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/farmacia") && currentTab === "cola"
    },
    {
      key: "suscripciones",
      label: "Suscripciones",
      href: "/admin/suscripciones/farmacia?tab=medicamentos",
      active:
        matchesPathPrefix(pathname, "/admin/suscripciones/farmacia") &&
        (currentTab === "medicamentos" || currentTab === "" || currentTab === "suscripciones")
    },
    {
      key: "descuento",
      label: "Descuento",
      href: "/admin/suscripciones/farmacia?tab=descuento",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/farmacia") && currentTab === "descuento",
      disabled: true,
      badge: "Próximamente"
    },
    {
      key: "configuracion",
      label: "Configuración",
      href: "/admin/suscripciones/farmacia?tab=config",
      active: matchesPathPrefix(pathname, "/admin/suscripciones/farmacia") && currentTab === "config"
    }
  ];

  if (mode === "operacion") return operational;
  const preferredOrder = ["configuracion", "descuento", "suscripciones", "cola"];
  return preferredOrder
    .map((key) => operational.find((item) => item.key === key))
    .filter((item): item is SecondaryNavItem => Boolean(item));
}

export default function ModuleSubnav({
  moduleKey,
  moduleLabel,
  items,
  sticky = true
}: ModuleSubnavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => new URLSearchParams(searchParams?.toString() || ""),
    [searchParams]
  );

  const instanceId = useId();
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [subscriptionsMode, setSubscriptionsMode] = useState<SubscriptionsMode>("operacion");

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

  useEffect(() => {
    if (moduleKey !== "suscripciones") return;
    const queryMode = normalizeSubscriptionsMode(search.get("focus"));
    if (queryMode) {
      setSubscriptionsMode(queryMode);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SUBSCRIPTIONS_MODE_STORAGE_KEY, queryMode);
      }
      return;
    }

    if (typeof window !== "undefined") {
      const storedMode = normalizeSubscriptionsMode(window.localStorage.getItem(SUBSCRIPTIONS_MODE_STORAGE_KEY));
      if (storedMode) setSubscriptionsMode(storedMode);
    }
  }, [moduleKey, search]);

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
      const value = key === "focus" ? subscriptionsMode : search.get(key);
      if (value) next.set(key, value);
    });
    const qs = next.toString();
    return qs ? `${item.href}?${qs}` : item.href;
  };

  const updateSubscriptionsMode = (mode: SubscriptionsMode) => {
    setSubscriptionsMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUBSCRIPTIONS_MODE_STORAGE_KEY, mode);
    }
    const next = new URLSearchParams(search.toString());
    next.set("focus", mode);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (isDuplicate) return null;

  if (moduleKey === "suscripciones") {
    const section = getSubscriptionsSection(pathname);
    const primaryCta = getSubscriptionsPrimaryCta(section, subscriptionsMode);
    const secondaryItems =
      section === "membresias"
        ? getMembershipsSecondaryItems(pathname, subscriptionsMode)
        : section === "farmacia"
          ? getPharmacySecondaryItems(pathname, search, subscriptionsMode)
          : [];

    return (
      <div className={cn("w-full", sticky && "sticky z-30 [top:var(--admin-header-offset,72px)]")}>
        <div className="rounded-xl border border-slate-200 bg-[#FFFFFF] shadow-sm">
          <div className="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#2e75ba]">Suscripciones</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Membresías y farmacia: operación, renovaciones y cobros recurrentes.
                </p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.key}
                    href={resolveHref(item)}
                    className={cn(
                      "group inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                        : "border-slate-200 bg-[#FFFFFF] text-slate-700 hover:border-[#4aadf5] hover:bg-[#F8FAFC]"
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
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Navegación de Suscripciones</span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => updateSubscriptionsMode("operacion")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      subscriptionsMode === "operacion"
                        ? "bg-[#4aa59c] text-white"
                        : "text-slate-600 hover:bg-[#F8FAFC]"
                    )}
                  >
                    Operación
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSubscriptionsMode("catalogos")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      subscriptionsMode === "catalogos"
                        ? "bg-[#4aa59c] text-white"
                        : "text-slate-600 hover:bg-[#F8FAFC]"
                    )}
                  >
                    Catálogos
                  </button>
                </div>
              </div>

              <Link
                href={appendFocusToHref(primaryCta.href, subscriptionsMode)}
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
              >
                {primaryCta.label}
              </Link>
            </div>

            {secondaryItems.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {secondaryItems.map((item) => {
                  if (item.disabled) {
                    return (
                      <span
                        key={item.key}
                        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500"
                      >
                        {item.label}
                        {item.badge ? (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {item.badge}
                          </span>
                        ) : null}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      href={appendFocusToHref(item.href, subscriptionsMode)}
                      className={cn(
                        "inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                        item.active
                          ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                          : "border-slate-200 bg-[#FFFFFF] text-slate-700 hover:border-[#4aadf5] hover:bg-[#F8FAFC]"
                      )}
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
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
