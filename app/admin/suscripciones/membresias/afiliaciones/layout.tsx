"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

const tabs = [
  { href: "/admin/suscripciones/membresias/afiliaciones/pacientes", label: "Pacientes" },
  { href: "/admin/suscripciones/membresias/afiliaciones/empresas", label: "Empresas" }
];

export default function MembershipAffiliationsLayout({ children }: Props) {
  const pathname = usePathname() || "";

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                    : "border-slate-200 text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </section>
  );
}
