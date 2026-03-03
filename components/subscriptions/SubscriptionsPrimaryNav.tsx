"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SubscriptionsPrimaryNavItem = {
  key: string;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  icon?: LucideIcon;
};

type SubscriptionsPrimaryNavProps = {
  items: SubscriptionsPrimaryNavItem[];
  className?: string;
};

export function SubscriptionsPrimaryNav({ items, className }: SubscriptionsPrimaryNavProps) {
  return (
    <nav
      aria-label="Navegación de Suscripciones"
      className={cn("flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const baseClassName = cn(
          "group inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
          item.active
            ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
            : item.disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-[#FFFFFF] text-slate-700 hover:border-[#4aadf5] hover:bg-[#F8FAFC]"
        );

        if (item.disabled) {
          return (
            <span key={item.key} aria-disabled="true" className={baseClassName}>
              {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
              <span>{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">{item.badge}</span>
              ) : null}
            </span>
          );
        }

        return (
          <Link key={item.key} href={item.href} className={baseClassName}>
            {Icon ? (
              <Icon className={cn("h-4 w-4", item.active ? "text-[#4aa59c]" : "text-slate-500 group-hover:text-[#4aa59c]")} />
            ) : null}
            <span>{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
