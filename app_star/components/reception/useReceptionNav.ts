"use client";

import { useMemo } from "react";
import { Building2, CalendarDays, ClipboardList, Inbox, LayoutDashboard, SlidersHorizontal } from "lucide-react";
import type { ReceptionModuleNavItem } from "@/components/reception/ReceptionModuleNav";

type Options = {
  canNavigateOperational: boolean;
  onRequireBranch: (href: string) => void;
};

export function useReceptionNav({ canNavigateOperational, onRequireBranch }: Options): ReceptionModuleNavItem[] {
  return useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/admin/reception/dashboard",
        icon: LayoutDashboard,
        activeMatch: (pathname) => pathname.startsWith("/admin/reception/dashboard"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      },
      {
        key: "operativa",
        label: "Lista operativa",
        href: "/admin/reception",
        icon: ClipboardList,
        activeMatch: (pathname) => pathname === "/admin/reception" || pathname.startsWith("/admin/reception/worklist"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      },
      {
        key: "agenda",
        label: "Agenda de citas",
        href: "/admin/reception/appointments",
        icon: CalendarDays,
        activeMatch: (pathname) => pathname.startsWith("/admin/reception/appointments"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      },
      {
        key: "portal-requests",
        label: "Solicitudes portal",
        href: "/admin/reception/solicitudes-portal",
        icon: Inbox,
        activeMatch: (pathname) => pathname.startsWith("/admin/reception/solicitudes-portal"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      },
      {
        key: "companies",
        label: "Empresas",
        href: "/admin/reception/companies",
        icon: Building2,
        activeMatch: (pathname) => pathname.startsWith("/admin/reception/companies"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      },
      {
        key: "settings",
        label: "Configuración",
        href: "/admin/reception/settings",
        icon: SlidersHorizontal,
        activeMatch: (pathname) => pathname.startsWith("/admin/reception/settings"),
        onNavigate: (href) => {
          if (canNavigateOperational) return false;
          onRequireBranch(href);
          return true;
        }
      }
    ],
    [canNavigateOperational, onRequireBranch]
  );
}
