"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import ModuleSubnav from "@/components/nav/ModuleSubnav";
import { resolveModuleNavConfig } from "@/components/nav/moduleNavRegistry";

type TenantNavigationPolicy = {
  moduleOrderingEnabled?: boolean;
  moduleOrder?: string[];
};

export default function ContextualTopbar({
  tenantNavigationPolicy: _tenantNavigationPolicy,
  canAccessConfigOps = false,
  canAccessConfigProcessing = false
}: {
  tenantNavigationPolicy?: TenantNavigationPolicy;
  canAccessConfigOps?: boolean;
  canAccessConfigProcessing?: boolean;
}) {
  const pathname = usePathname();
  const moduleConfig = useMemo(
    () =>
      resolveModuleNavConfig(pathname, {
        canAccessConfigOps,
        canAccessConfigProcessing
      }),
    [canAccessConfigOps, canAccessConfigProcessing, pathname]
  );

  if (!moduleConfig || moduleConfig.items.length <= 1) return null;

  return (
    <section className="border-b border-slate-200 bg-[#FFFFFF] px-4 py-2 sm:px-6">
      <ModuleSubnav
        moduleKey={moduleConfig.moduleKey}
        moduleLabel={moduleConfig.moduleLabel}
        items={moduleConfig.items}
      />
    </section>
  );
}
