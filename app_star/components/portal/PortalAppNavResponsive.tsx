"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, FlaskConical, LayoutDashboard, Menu, Shield, UserRound, X } from "lucide-react";
import { PortalAppNav } from "@/components/portal/PortalAppNav";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/portal/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/app/appointments", label: "Mis citas", icon: CalendarDays },
  { href: "/portal/app/appointments/new", label: "Solicitar cita", icon: ClipboardList },
  { href: "/portal/app/invoices", label: "Mis facturas", icon: ClipboardList },
  { href: "/portal/app/results", label: "Mis resultados", icon: FlaskConical },
  { href: "/portal/app/membership", label: "Mi membresía", icon: Shield },
  { href: "/portal/app/profile", label: "Mi perfil", icon: UserRound }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/portal/app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getFocusableElements(root: HTMLElement) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((node) => !node.hasAttribute("disabled"));
}

export function PortalAppNavResponsive() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const activeLabel = useMemo(() => {
    const match = NAV_ITEMS.find((item) => isActivePath(pathname, item.href));
    return match?.label || "Secciones";
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="hidden sm:block">
        <PortalAppNav />
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d2e2f6] bg-white px-3 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="portal-mobile-nav"
        >
          <Menu className="h-4 w-4" />
          Secciones: {activeLabel}
        </button>
      </div>

      {open ? (
        <div className="sm:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
          <div
            id="portal-mobile-nav"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Secciones del portal"
            className="fixed inset-y-0 right-0 z-50 w-[84vw] max-w-sm border-l border-[#d2e2f6] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2e75ba]">Secciones</p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d2e2f6] bg-white text-[#2e75ba]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-4 space-y-2">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={
                      active
                        ? "flex items-center gap-3 rounded-xl bg-[#2e75ba] px-3 py-2.5 text-sm font-semibold text-white"
                        : "flex items-center gap-3 rounded-xl border border-[#d2e2f6] bg-white px-3 py-2.5 text-sm font-semibold text-[#2e75ba]"
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
