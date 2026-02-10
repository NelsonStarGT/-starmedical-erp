"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/portal/app", label: "Dashboard" },
  { href: "/portal/app/appointments", label: "Mis citas" },
  { href: "/portal/app/appointments/new", label: "Solicitar cita" },
  { href: "/portal/app/invoices", label: "Mis facturas" },
  { href: "/portal/app/results", label: "Mis resultados" },
  { href: "/portal/app/membership", label: "Mi membresía" },
  { href: "/portal/app/profile", label: "Mi perfil" }
];

function isActive(pathname: string, href: string) {
  if (href === "/portal/app") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalAppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm"
                : "rounded-full border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:border-[#4aadf5] hover:text-[#245f96]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
