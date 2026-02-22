"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileCheck2,
  Layers,
  RefreshCw,
  CreditCard,
  Settings,
  Users,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  tooltip?: string;
};

const MODULE_TABS: TabItem[] = [
  { href: "/admin/membresias", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/membresias/contratos/pacientes", label: "Contratos", icon: FileCheck2 },
  { href: "/admin/membresias/planes", label: "Planes", icon: Layers },
  { href: "/admin/membresias/renovaciones", label: "Renovaciones", icon: RefreshCw },
  { href: "/admin/membresias/impresion", label: "Impresión", icon: CreditCard },
  { href: "/admin/membresias/configuracion", label: "Configuración", icon: Settings }
];

export function MembershipsTabs() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-sm">
      <ul className="flex min-w-max items-center gap-1">
        {MODULE_TABS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              {item.disabled ? (
                <span
                  title={item.tooltip || "Próximamente"}
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                    isActive
                      ? "bg-[#4aa59c] text-white shadow-sm"
                      : "text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const CONTRACT_SUB_TABS: TabItem[] = [
  { href: "/admin/membresias/contratos/pacientes", label: "Pacientes (B2C)", icon: Users },
  { href: "/admin/membresias/contratos/empresas", label: "Empresas (B2B)", icon: Building2 }
];

export function MembershipContractTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-[#F8FAFC] p-1">
      <div className="flex min-w-max items-center gap-1">
        {CONTRACT_SUB_TABS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                isActive ? "bg-white text-[#2e75ba] shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
