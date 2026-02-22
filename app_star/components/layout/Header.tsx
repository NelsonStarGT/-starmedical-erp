'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bars3Icon, ChevronLeftIcon, ChevronRightIcon, PowerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { filterNavSections, flattenNavItems, navSections } from "./nav";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useIdentityConfig } from "@/hooks/useIdentityConfig";
import { initialsFromIdentity } from "@/lib/identity";

type BranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export default function Header({
  showDevBanner = false,
  activeBranchId = null,
  activeBranchName = null,
  activeBranchOptions = [],
  sidebarCollapsed = false,
  onToggleSidebar,
  canSwitchActiveBranch = false,
  canAccessReception = false,
  canAccessMedicalCommissions = false,
  canAccessMedicalOperations = false,
  canAccessMedicalConfig = false,
  canAccessPortales = false
}: {
  showDevBanner?: boolean;
  activeBranchId?: string | null;
  activeBranchName?: string | null;
  activeBranchOptions?: BranchOption[];
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  canSwitchActiveBranch?: boolean;
  canAccessReception?: boolean;
  canAccessMedicalCommissions?: boolean;
  canAccessMedicalOperations?: boolean;
  canAccessMedicalConfig?: boolean;
  canAccessPortales?: boolean;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState("Usuario");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId ?? "");
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const { toasts, showToast, dismiss } = useToast();
  const { identity } = useIdentityConfig();
  const mobileItems = flattenNavItems(
    filterNavSections(navSections, {
      canAccessReception,
      canAccessMedicalCommissions,
      canAccessMedicalOperations,
      canAccessMedicalConfig,
      canAccessPortales
    })
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/whoami", { cache: "no-store" });
        const json = res.ok ? await res.json() : null;
        if (!active || !json) return;
        setUserName(json.name || json.email || "Usuario");
        setUserEmail(json.email || null);
        setRole(json.role || (json.roles && json.roles[0]) || null);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "star-erp-user",
            JSON.stringify({ name: json.name || json.email || "Usuario" })
          );
        }
      } catch {
        if (!active) return;
        setUserName("Usuario");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedBranchId(activeBranchId ?? "");
  }, [activeBranchId]);

  useEffect(() => {
    if (!mobileOpen || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("star-erp-user");
    }
    router.replace("/login");
    setLoading(false);
  };

  const branchLabel = useMemo(() => {
    const selected = activeBranchOptions.find((branch) => branch.id === selectedBranchId);
    return selected?.name || activeBranchName || "No definida";
  }, [activeBranchName, activeBranchOptions, selectedBranchId]);

  const handleChangeActiveBranch = async (nextBranchId: string) => {
    const clean = String(nextBranchId || "").trim();
    if (!clean) return;
    if (clean === selectedBranchId) return;
    if (isSwitchingBranch) return;

    const previousBranchId = selectedBranchId;
    setSelectedBranchId(clean);
    setIsSwitchingBranch(true);

    try {
      const response = await fetch("/api/admin/session/active-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: clean })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "No se pudo cambiar la sede activa.");
      }
      showToast({ tone: "success", title: "Sede activa actualizada" });
      router.refresh();
    } catch (error) {
      setSelectedBranchId(previousBranchId);
      showToast({
        tone: "error",
        title: "No se pudo cambiar la sede",
        message: error instanceof Error ? error.message : "Intenta de nuevo."
      });
    } finally {
      setIsSwitchingBranch(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30">
        {showDevBanner && (
          <div className="flex items-center justify-between gap-3 border-b border-brand-secondary/30 bg-brand-secondary/15 px-4 py-2 text-xs font-semibold text-brand-navy">
            <span>ENTORNO DEV — correos via Mailpit / datos de prueba</span>
            <span className="inline-flex items-center rounded-full bg-brand-accent px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
              DEV
            </span>
          </div>
        )}
        <header className="bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-[0_10px_30px_rgba(10,116,255,0.08)] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            {onToggleSidebar && (
              <button
                className="hidden lg:inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                onClick={onToggleSidebar}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleSidebar();
                  }
                }}
                aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                aria-pressed={sidebarCollapsed}
              >
                {sidebarCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
              </button>
            )}
            <div className="flex items-center gap-3">
              {identity.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={identity.logoUrl} alt={identity.name} className="h-12 w-12 rounded-2xl border border-slate-200 object-contain bg-white" />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-semibold">
                  {initialsFromIdentity(identity.name)}
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-[0.25rem] text-brand-navy/70">{identity.name}</p>
                <h1 className="text-xl font-semibold text-brand-navy leading-tight">Panel administrativo</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-slate-500">Hola,</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-base font-semibold text-brand-navy">{userName || "Usuario"}</p>
                {role && (
                  <span className="inline-flex items-center rounded-full border border-brand-primary/20 bg-[var(--app-bg)] px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-primary">
                    {role}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-end gap-2">
                <span className="text-[11px] text-brand-primary">Sede activa:</span>
                {canSwitchActiveBranch && activeBranchOptions.length > 0 ? (
                  <select
                    value={selectedBranchId}
                    onChange={(event) => void handleChangeActiveBranch(event.target.value)}
                    disabled={isSwitchingBranch}
                    className="max-w-[210px] rounded-xl border border-[#4aadf5]/40 bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba] shadow-sm focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeBranchOptions.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                        {branch.code ? ` (${branch.code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[11px] font-semibold text-brand-primary">{branchLabel}</span>
                )}
              </div>
              {userEmail && <p className="text-xs text-slate-500">{userEmail}</p>}
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
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white border-r border-slate-200 shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Menú lateral"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {identity.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={identity.logoUrl} alt={identity.name} className="h-10 w-10 rounded-xl border border-slate-200 object-contain bg-white" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-brand-primary border border-slate-200 flex items-center justify-center font-semibold">
                    {initialsFromIdentity(identity.name)}
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2rem] text-slate-500">{identity.name}</p>
                  <p className="text-base font-semibold text-slate-900">ERP</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
                aria-label="Cerrar menu"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {activeBranchOptions.length > 0 ? (
              canSwitchActiveBranch ? (
              <div className="border-b border-slate-100 p-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sede activa</label>
                <select
                  value={selectedBranchId}
                  onChange={(event) => void handleChangeActiveBranch(event.target.value)}
                  disabled={isSwitchingBranch}
                  className="w-full rounded-xl border border-[#4aadf5]/40 bg-white px-3 py-2 text-sm font-medium text-[#2e75ba] shadow-sm focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/35 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeBranchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.code ? ` (${branch.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              ) : (
                <div className="border-b border-slate-100 p-3">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sede activa</label>
                  <p className="rounded-xl border border-[#4aadf5]/30 bg-[#4aadf5]/10 px-3 py-2 text-sm font-semibold text-[#2e75ba]">
                    {branchLabel}
                  </p>
                </div>
              )
            ) : null}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {mobileItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-200"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />
    </>
  );
}
