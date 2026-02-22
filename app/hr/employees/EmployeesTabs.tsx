"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type EmployeesTabKey = "active" | "pending" | "archived";

export function EmployeesTabs({ active }: { active: EmployeesTabKey }) {
  const tabs: Array<{ key: EmployeesTabKey; label: string; href: string }> = [
    { key: "active", label: "Activos", href: "/hr/employees" },
    { key: "pending", label: "Pendientes", href: "/hr/employees/pending" },
    { key: "archived", label: "Archivados", href: "/hr/employees/archived" }
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold transition",
            active === tab.key
              ? "bg-brand-primary text-white shadow-soft"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
