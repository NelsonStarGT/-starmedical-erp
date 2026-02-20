"use client";

import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
};

const ITEMS: NavItem[] = [
  { href: "/admin/configuracion/operaciones", label: "Resumen" },
  { href: "/admin/configuracion/operaciones/observabilidad", label: "Observabilidad" },
  { href: "/admin/configuracion/operaciones/alertas", label: "Historial & Alertas" },
  { href: "/admin/configuracion/operaciones/recursos", label: "Recursos" },
  { href: "/admin/configuracion/operaciones/acciones", label: "Acciones" },
  { href: "/admin/configuracion/operaciones/health", label: "Health & Auditoría" }
];

export default function OpsOperationsNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <ul className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
        {ITEMS.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex rounded-lg px-3 py-1.5 transition ${
                  isActive
                    ? "bg-[#2e75ba] text-white shadow-sm"
                    : "bg-[#F8FAFC] text-slate-700 hover:bg-[#4aadf5]/15"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
