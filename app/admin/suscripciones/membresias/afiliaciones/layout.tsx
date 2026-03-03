"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { NavPills } from "@/components/subscriptions/NavPills";

type Props = {
  children: React.ReactNode;
};

const tabs = [
  { href: "/admin/suscripciones/membresias/afiliaciones/pacientes", label: "Pacientes" },
  { href: "/admin/suscripciones/membresias/afiliaciones/empresas", label: "Empresas" }
];

export default function MembershipAffiliationsLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const items = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.href,
        label: tab.label,
        href: tab.href,
        active: pathname === tab.href
      })),
    [pathname]
  );

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <NavPills items={items} ariaLabel="Submenú de afiliaciones" />
      </div>
      {children}
    </section>
  );
}
