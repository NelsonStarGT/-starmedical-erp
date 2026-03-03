"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ModuleNavItem } from "@/components/nav/moduleNavRegistry";
import { SubscriptionsHeader } from "@/components/subscriptions/SubscriptionsHeader";
import {
  SubscriptionsPrimaryNav,
  type SubscriptionsPrimaryNavItem
} from "@/components/subscriptions/SubscriptionsPrimaryNav";

type ModuleSubnavProps = {
  moduleKey: string;
  moduleLabel: string;
  items: ModuleNavItem[];
  sticky?: boolean;
};

type GuardStore = Map<string, string>;
type SubscriptionsMode = "operacion" | "catalogos";
type SubscriptionsSection = "dashboard" | "membresias" | "farmacia" | "pasarela" | "configuracion";

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
    const showFocusToggle = section === "dashboard" || section === "membresias" || section === "farmacia";
    const primaryNavItems: SubscriptionsPrimaryNavItem[] = items.map((item) => ({
      key: item.key,
      label: item.label,
      href: resolveHref(item),
      icon: item.icon,
      active: isItemActive(item)
    }));

    return (
      <div className={cn("w-full", sticky && "sticky z-30 [top:var(--admin-header-offset,72px)]")}>
        <div className="rounded-xl border border-slate-200 bg-[#FFFFFF] shadow-sm">
          <div className="space-y-3 px-4 py-4">
            <SubscriptionsHeader />
            <SubscriptionsPrimaryNav items={primaryNavItems} />
            {showFocusToggle ? (
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
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
