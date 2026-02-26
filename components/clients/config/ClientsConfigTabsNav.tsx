"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ClientsConfigSection } from "@/lib/clients/clientsConfigRegistry";
import { cn } from "@/lib/utils";

type TabOption = {
  key: ClientsConfigSection;
  label: string;
};

const STORAGE_PREFIX = "star-clients-config:active-tab";

function buildStorageKey(preferenceScope: string) {
  return `${STORAGE_PREFIX}:${preferenceScope}`;
}

function hasTab(tabs: TabOption[], key: string): key is ClientsConfigSection {
  return tabs.some((tab) => tab.key === key);
}

export default function ClientsConfigTabsNav({
  tabs,
  section,
  hasExplicitSectionParam,
  preferenceScope,
  fallbackCount
}: {
  tabs: TabOption[];
  section: ClientsConfigSection;
  hasExplicitSectionParam: boolean;
  preferenceScope: string;
  fallbackCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsValue = searchParams.toString();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = buildStorageKey(preferenceScope);

    if (!hasExplicitSectionParam) {
      const storedTab = window.localStorage.getItem(storageKey)?.trim();
      if (storedTab && storedTab !== section && hasTab(tabs, storedTab)) {
        const params = new URLSearchParams(searchParamsValue);
        params.set("section", storedTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return;
      }
    }

    window.localStorage.setItem(storageKey, section);
  }, [hasExplicitSectionParam, pathname, preferenceScope, router, searchParamsValue, section, tabs]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParamsValue);
            params.set("section", tab.key);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(buildStorageKey(preferenceScope), tab.key);
            }
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          className={cn(
            "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition",
            section === tab.key
              ? "border-[#2e75ba] bg-[#2e75ba] text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          )}
        >
          {tab.label}
        </button>
      ))}

      {fallbackCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParamsValue);
            params.set("section", "resumen");
            if (typeof window !== "undefined") {
              window.localStorage.setItem(buildStorageKey(preferenceScope), "resumen");
            }
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
          title="Abrir Resumen y filtrar elementos fallback"
        >
          Fallback activo ({fallbackCount})
        </button>
      ) : null}
    </div>
  );
}
