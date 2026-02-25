"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { filterNavSections, navSections } from "./nav";

type HeaderProps = {
  showDevBanner?: boolean;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranchOptions?: Array<{ id: string; name: string; code: string | null; isActive: boolean }>;
  canSwitchActiveBranch?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
  canAccessConfigOps?: boolean;
  canAccessConfigProcessing?: boolean;
};

export default function Header({
  showDevBanner = false,
  activeBranchName = null,
  onToggleSidebar,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false,
  canAccessConfigOps = false,
  canAccessConfigProcessing = false
}: HeaderProps = {}) {
  const router = useRouter();
  const [userName, setUserName] = useState("Usuario");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () =>
      filterNavSections(navSections, {
        canAccessReception,
        canAccessMedicalCommissions,
        canAccessMedicalOperations,
        canAccessMedicalConfig,
        canAccessPortales,
        canAccessConfigOps,
        canAccessConfigProcessing
      }).flatMap((section) => section.items ?? []),
    [
      canAccessReception,
      canAccessMedicalCommissions,
      canAccessMedicalOperations,
      canAccessMedicalConfig,
      canAccessPortales,
      canAccessConfigOps,
      canAccessConfigProcessing
    ]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedUser = window.localStorage.getItem("star-erp-user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.name) setUserName(parsed.name);
      } catch {
        setUserName("Usuario");
      }
    } else {
      setUserName("Usuario");
    }
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("star-erp-user");
    }
    router.replace("/login");
    setLoading(false);
  };

  return (
    <>
      {showDevBanner ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 sm:px-6">
          Entorno de desarrollo activo
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-[color:rgb(var(--border-rgb)/0.88)] bg-white/92 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="hidden lg:inline-flex items-center justify-center rounded-lg border border-[color:rgb(var(--border-rgb))] p-2 text-[color:rgb(var(--text-rgb))] hover:bg-[color:rgb(var(--bg-rgb)/0.9)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onToggleSidebar}
              disabled={!onToggleSidebar}
              aria-label="Colapsar menú lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-[color:rgb(var(--border-rgb))] p-2 text-[color:rgb(var(--text-rgb))] hover:bg-[color:rgb(var(--bg-rgb)/0.9)] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22rem] text-[color:rgb(var(--color-structure-rgb)/0.72)]">
                StarMedical ERP
              </p>
              <h1 className="text-lg font-semibold leading-tight text-[color:rgb(var(--text-rgb))]" style={{ fontFamily: "var(--font-heading)" }}>
                Panel administrativo
              </h1>
              {activeBranchName ? (
                <p className="text-xs text-[color:rgb(var(--text-rgb)/0.68)]">Sucursal activa: {activeBranchName}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-[color:rgb(var(--text-rgb)/0.62)]">Hola,</p>
              <p className="text-base font-semibold text-[color:rgb(var(--text-rgb))]">{userName || "Usuario"}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:rgb(var(--color-primary-rgb)/0.45)] bg-[color:rgb(var(--color-primary-rgb)/0.12)] px-3 py-2 text-sm font-semibold text-[color:rgb(var(--color-structure-rgb))] hover:bg-[color:rgb(var(--color-primary-rgb)/0.18)] transition disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {loading ? "Saliendo..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 w-72 max-w-[84vw] border-r border-[color:rgb(var(--border-rgb))] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[color:rgb(var(--border-rgb)/0.8)] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2rem] text-[color:rgb(var(--color-structure-rgb)/0.72)]">StarMedical</p>
                <p className="text-base font-semibold text-[color:rgb(var(--text-rgb))]" style={{ fontFamily: "var(--font-heading)" }}>
                  ERP
                </p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-[color:rgb(var(--border-rgb))] p-2 text-[color:rgb(var(--text-rgb))] hover:bg-[color:rgb(var(--bg-rgb)/0.9)]"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[color:rgb(var(--text-rgb)/0.84)] hover:border-[color:rgb(var(--border-rgb))] hover:bg-[color:rgb(var(--bg-rgb)/0.8)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon ? <item.icon className="h-5 w-5" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-[color:rgb(var(--border-rgb)/0.85)] p-3">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[color:rgb(var(--border-rgb))] px-3 py-2 text-sm font-medium text-[color:rgb(var(--text-rgb)/0.82)] hover:bg-[color:rgb(var(--bg-rgb)/0.9)] transition disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loading ? "Saliendo..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
