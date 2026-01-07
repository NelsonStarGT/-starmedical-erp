"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TabItem = {
  label: string;
  href: LinkProps["href"];
};

export function Tabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={typeof item.href === "string" ? item.href : JSON.stringify(item.href)}
            href={item.href}
            className={cn(
              "rounded-t-xl px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-white border border-slate-200 border-b-white text-slate-900 shadow-soft"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
