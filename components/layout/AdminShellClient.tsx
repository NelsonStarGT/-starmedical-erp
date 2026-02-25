"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import DensityProvider from "@/components/ui/DensityProvider";
import {
  resolveSidebarCollapsedPreference,
  serializeSidebarCollapsedPreference
} from "@/lib/ui/persistence";
import ContextualTopbar from "./ContextualTopbar";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminShellClient({
  children,
  showDevBanner = false,
  themeStyle,
  defaultDensityMode = "normal",
  activeBranchId = null,
  activeBranchName = null,
  activeBranchOptions = [],
  canSwitchActiveBranch = false,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false,
  canAccessConfigOps = false,
  canAccessConfigProcessing = false,
  tenantNavigationPolicy
}: {
  children: React.ReactNode;
  showDevBanner?: boolean;
  themeStyle?: CSSProperties;
  defaultDensityMode?: "compact" | "normal";
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranchOptions?: Array<{ id: string; name: string; code: string | null; isActive: boolean }>;
  canSwitchActiveBranch?: boolean;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
  canAccessConfigOps?: boolean;
  canAccessConfigProcessing?: boolean;
  tenantNavigationPolicy?: {
    defaultSidebarCollapsed: boolean;
    forceSidebarCollapsed: boolean;
    moduleOrderingEnabled?: boolean;
    moduleOrder?: string[];
  };
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPrefsHydrated, setSidebarPrefsHydrated] = useState(false);
  const isConsultaMRoute = pathname?.startsWith("/modulo-medico/consultaM");
  const isConfigModuleRoute = pathname?.startsWith("/admin/configuracion");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const policyDefault = Boolean(tenantNavigationPolicy?.defaultSidebarCollapsed);
    const policyForce = Boolean(tenantNavigationPolicy?.forceSidebarCollapsed);
    const stored = window.localStorage.getItem("star-erp-sidebar-collapsed");
    const resolved = resolveSidebarCollapsedPreference({
      storedValue: stored,
      policyDefault,
      policyForce
    });
    setSidebarCollapsed(resolved);
    window.localStorage.setItem(
      "star-erp-sidebar-collapsed",
      serializeSidebarCollapsedPreference({
        collapsed: resolved,
        policyForce
      })
    );
    setSidebarPrefsHydrated(true);
  }, [tenantNavigationPolicy?.defaultSidebarCollapsed, tenantNavigationPolicy?.forceSidebarCollapsed]);

  useEffect(() => {
    if (!sidebarPrefsHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      "star-erp-sidebar-collapsed",
      serializeSidebarCollapsedPreference({
        collapsed: sidebarCollapsed,
        policyForce: Boolean(tenantNavigationPolicy?.forceSidebarCollapsed)
      })
    );
  }, [sidebarCollapsed, sidebarPrefsHydrated, tenantNavigationPolicy?.forceSidebarCollapsed]);

  if (isConsultaMRoute) {
    return <div className="min-h-screen bg-transparent">{children}</div>;
  }

  return (
    <DensityProvider defaultMode={defaultDensityMode}>
      <div className="flex h-screen overflow-hidden bg-transparent" style={themeStyle}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={
            tenantNavigationPolicy?.forceSidebarCollapsed
              ? undefined
              : () => setSidebarCollapsed((current) => !current)
          }
          forceCollapsed={Boolean(tenantNavigationPolicy?.forceSidebarCollapsed)}
          canAccessReception={canAccessReception}
          canAccessMedicalCommissions={canAccessMedicalCommissions}
          canAccessMedicalOperations={canAccessMedicalOperations}
          canAccessMedicalConfig={canAccessMedicalConfig}
          canAccessPortales={canAccessPortales}
          canAccessConfigOps={canAccessConfigOps}
          canAccessConfigProcessing={canAccessConfigProcessing}
          moduleOrderingEnabled={Boolean(tenantNavigationPolicy?.moduleOrderingEnabled)}
          moduleOrder={tenantNavigationPolicy?.moduleOrder || []}
        />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_at_20%_10%,rgba(12,116,255,0.08),transparent),radial-gradient(700px_at_70%_20%,rgba(44,211,255,0.08),transparent)]" />
          <Header
            showDevBanner={showDevBanner}
            activeBranchId={activeBranchId}
            activeBranchName={activeBranchName}
            activeBranchOptions={activeBranchOptions}
            canSwitchActiveBranch={canSwitchActiveBranch}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={
              tenantNavigationPolicy?.forceSidebarCollapsed
                ? undefined
                : () => setSidebarCollapsed((current) => !current)
            }
            canAccessReception={canAccessReception}
            canAccessMedicalCommissions={canAccessMedicalCommissions}
            canAccessMedicalOperations={canAccessMedicalOperations}
            canAccessMedicalConfig={canAccessMedicalConfig}
            canAccessPortales={canAccessPortales}
            canAccessConfigOps={canAccessConfigOps}
            canAccessConfigProcessing={canAccessConfigProcessing}
          />
          {isConfigModuleRoute ? null : (
            <ContextualTopbar
              tenantNavigationPolicy={{
                moduleOrderingEnabled: Boolean(tenantNavigationPolicy?.moduleOrderingEnabled),
                moduleOrder: tenantNavigationPolicy?.moduleOrder || []
              }}
              canAccessConfigOps={canAccessConfigOps}
              canAccessConfigProcessing={canAccessConfigProcessing}
            />
          )}
          <main className="relative flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6">{children}</main>
        </div>
      </div>
    </DensityProvider>
  );
}
