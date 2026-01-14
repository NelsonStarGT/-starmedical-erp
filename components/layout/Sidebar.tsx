'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  BriefcaseIcon,
  IdentificationIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type NavRoute =
  | "/admin"
  | "/admin/usuarios"
  | "/admin/clientes"
  | "/admin/membresias"
  | "/admin/crm"
  | "/admin/agenda"
  | "/admin/inventario"
  | "/admin/facturacion"
  | "/admin/finanzas"
  | "/admin/permissions"
  | "/admin/configuracion"
  | "/hr";

export const navItems: { name: string; href: NavRoute; icon: typeof HomeIcon; disabled?: boolean }[] = [
  { name: "Inicio", href: "/admin", icon: HomeIcon },
  { name: "Usuarios", href: "/admin/usuarios", icon: UsersIcon },
  { name: "Clientes", href: "/admin/clientes", icon: UserGroupIcon },
  { name: "Membresías", href: "/admin/membresias", icon: IdentificationIcon },
  { name: "CRM", href: "/admin/crm", icon: BriefcaseIcon },
  { name: "Agenda", href: "/admin/agenda", icon: CalendarDaysIcon },
  { name: "Inventario", href: "/admin/inventario", icon: Squares2X2Icon },
  { name: "Finanzas", href: "/admin/finanzas", icon: BanknotesIcon },
  { name: "RRHH", href: "/hr", icon: UserGroupIcon },
  { name: "Facturación", href: "/admin/facturacion", icon: ClipboardDocumentListIcon, disabled: true },
  { name: "Permisos", href: "/admin/permissions", icon: LockClosedIcon },
  { name: "Configuración", href: "/admin/configuracion", icon: Cog6ToothIcon }
];

export default function Sidebar() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/config/public", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        setLogoUrl(json?.data?.logoUrl || null);
      })
      .catch(() => {
        if (!active) return;
        setLogoUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="w-64 bg-gradient-to-b from-brand-navy via-brand-midnight to-[#050d1a] text-white shadow-2xl min-h-screen py-6 px-4 hidden lg:flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(500px_at_30%_10%,rgba(44,211,255,0.3),transparent)]" />
      <div className="relative px-3 pb-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 object-contain shadow"
            />
          ) : (
            <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center font-semibold shadow">
              SM
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25rem] text-white/70">StarMedical</p>
            <h2 className="text-xl font-semibold text-white">ERP</h2>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/60 leading-relaxed">
          Gestión integral con foco en CRM, finanzas e inventario.
        </p>
      </div>
      <nav className="relative space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          const linkClasses = cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition border border-transparent",
            isActive
              ? "bg-white/10 text-white border-white/20 shadow-lg shadow-brand-primary/20"
              : "text-white/70 hover:text-white hover:bg-white/5 hover:border-white/10"
          );

          if (item.disabled) {
            return (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/30 border border-dashed border-white/10 cursor-not-allowed"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </div>
            );
          }

          return (
            <Link key={item.name} href={item.href as any} className={linkClasses}>
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
