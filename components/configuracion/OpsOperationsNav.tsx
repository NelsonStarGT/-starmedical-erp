"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

type NavItem = {
  href: string | null;
  label: string;
  available: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin/configuracion/operaciones", label: "Resumen", available: true },
  { href: "/admin/configuracion/operaciones/alertas", label: "Historial & Alertas", available: true },
  { href: null, label: "Observabilidad", available: false },
  { href: null, label: "Recursos", available: false },
  { href: null, label: "Acciones", available: false },
  { href: null, label: "Health & Auditoría", available: false }
];

export default function OpsOperationsNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <ul className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
        {ITEMS.map((item) => {
          const isActive = Boolean(item.href) && currentPath === item.href;

          if (!item.available || !item.href) {
            return (
              <li key={item.label}>
                <span
                  aria-disabled="true"
                  title="Disponible próximamente"
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-500"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </span>
              </li>
            );
          }

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
