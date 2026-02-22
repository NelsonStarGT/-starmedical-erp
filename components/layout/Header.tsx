'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bars3Icon, PowerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { navSections } from "./nav";

const navItems = navSections.flatMap((section) => section.items ?? []);

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
};

export default function Header({
  showDevBanner = false,
  activeBranchName = null,
  onToggleSidebar
}: HeaderProps = {}) {
  const router = useRouter();
  const [userName, setUserName] = useState("Usuario");
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-[0_10px_30px_rgba(10,116,255,0.08)] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="hidden lg:inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            onClick={onToggleSidebar}
            aria-label="Colapsar menu lateral"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <button
            className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-[0.25rem] text-brand-navy/70">StarMedical ERP</p>
            <h1 className="text-xl font-semibold text-brand-navy leading-tight">Panel administrativo</h1>
            {activeBranchName ? <p className="text-xs text-slate-500">Sucursal activa: {activeBranchName}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-slate-500">Hola,</p>
            <p className="text-base font-semibold text-brand-navy">{userName || "Usuario"}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-primary/15 transition disabled:opacity-60"
          >
            <PowerIcon className="h-5 w-5" />
            {loading ? "Saliendo..." : "Cerrar sesion"}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-xs uppercase tracking-[0.2rem] text-slate-500">StarMedical</p>
                <p className="text-base font-semibold text-slate-900">ERP</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Cerrar menu"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon ? <item.icon className="h-5 w-5" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              >
                <PowerIcon className="h-5 w-5" />
                {loading ? "Saliendo..." : "Cerrar sesion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
