"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type NavPillItem = {
  key: string;
  label: string;
  active?: boolean;
  href?: string;
  disabled?: boolean;
  badge?: string;
  onClick?: () => void;
};

type NavPillsProps = {
  items: NavPillItem[];
  ariaLabel?: string;
  className?: string;
};

export function NavPills({ items, ariaLabel = "Navegación", className }: NavPillsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {items.map((item) => {
        const pillClassName = cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition",
          item.active
            ? "bg-[#4aa59c] text-white"
            : item.disabled
              ? "cursor-not-allowed text-slate-400"
              : "text-slate-600 hover:bg-[#F8FAFC] hover:text-[#2e75ba]"
        );

        if (item.disabled) {
          return (
            <span key={item.key} aria-disabled="true" className={pillClassName}>
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {item.badge}
                </span>
              ) : null}
            </span>
          );
        }

        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={pillClassName}>
              {item.label}
              {item.badge ? (
                <span className="rounded-full bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#2e75ba]">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" onClick={item.onClick} className={pillClassName}>
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-semibold text-[#2e75ba]">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
