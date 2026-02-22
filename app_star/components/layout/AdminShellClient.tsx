"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import DensityProvider from "@/components/ui/DensityProvider";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminShellClient({
  children,
  showDevBanner = false,
  themeStyle,
  activeBranchId = null,
  activeBranchName = null,
  activeBranchOptions = [],
  canSwitchActiveBranch = false,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false
}: {
  children: React.ReactNode;
  showDevBanner?: boolean;
  themeStyle?: CSSProperties;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranchOptions?: Array<{ id: string; name: string; code: string | null; isActive: boolean }>;
  canSwitchActiveBranch?: boolean;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPrefsHydrated, setSidebarPrefsHydrated] = useState(false);
  const isConsultaMRoute = pathname?.startsWith("/modulo-medico/consultaM");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("star-erp-sidebar-collapsed");
    setSidebarCollapsed(stored === "1");
    setSidebarPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!sidebarPrefsHydrated || typeof window === "undefined") return;
    window.localStorage.setItem("star-erp-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed, sidebarPrefsHydrated]);

  if (isConsultaMRoute) {
    return <div className="min-h-screen bg-transparent">{children}</div>;
  }

  return (
    <DensityProvider>
      <div className="flex h-screen overflow-hidden bg-transparent" style={themeStyle}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          canAccessReception={canAccessReception}
          canAccessMedicalCommissions={canAccessMedicalCommissions}
          canAccessMedicalOperations={canAccessMedicalOperations}
          canAccessMedicalConfig={canAccessMedicalConfig}
          canAccessPortales={canAccessPortales}
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
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
            canAccessReception={canAccessReception}
            canAccessMedicalCommissions={canAccessMedicalCommissions}
            canAccessMedicalOperations={canAccessMedicalOperations}
            canAccessMedicalConfig={canAccessMedicalConfig}
            canAccessPortales={canAccessPortales}
          />
          <main className="relative flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6">{children}</main>
        </div>
      </div>
    </DensityProvider>
  );
}
